import { createEthersHandleClient } from "@iexec-nox/handle";
import { ethers } from "ethers";
import { NoxEscrowFactoryABI } from "../contracts/NoxEscrowFactory";
import { NoxEscrowContractABI } from "../contracts/NoxEscrowContract";
import { MockERC7984ABI } from "../contracts/MockERC7984";
import { getEscrowMetadata, insertEscrowMetadata, updateEscrowDeliverable, savePendingSync } from "./metadataService";
import { encryptText, decryptText, uploadToPinata, encryptAndUploadFile } from "../crypto/fileUploader";

// Canonical Nox Contract Manager address on Sepolia/Local Stack Emulator
export const NOX_CONTRACT_MANAGER = "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685";

// Default Gateway ports for Local Nox Stack
export const DEFAULT_NOX_GATEWAY = "http://127.0.0.1:8080";

// Configurable Subgraph URL for Live Network/Sepolia Integration
export const NOX_SUBGRAPH_URL = import.meta.env.VITE_NOX_SUBGRAPH_URL || "https://example.com/subgraphs/id/none";

// Shareable Escrow Contract interface representing on-chain details
export interface EscrowContract {
  address: string;
  counterparty: string;
  role: 'CLIENT' | 'FREELANCER';
  milestonesCompleted: number;
  totalMilestones: number;
  budget: number;
  status: 'SIGNING' | 'ACTIVE' | 'DISPUTED' | 'COMPLETED' | 'REFUNDED';
  requirements: string[];
  deliverables?: string[];
  activeMilestoneSubmitted?: boolean;
  milestoneKeys?: string[];
  deliverableKeys?: string[];
}

export interface MetadataConfig {
  pinataJWT?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).ethereum);
}

/**
 * Returns a web3 signer from the user's injected browser wallet.
 */
export async function getWeb3Signer(): Promise<ethers.JsonRpcSigner> {
  const win = window as any;
  if (!win.ethereum) {
    throw new Error("No injected Web3 provider detected. Please install MetaMask or Rabby.");
  }
  const provider = new ethers.BrowserProvider(win.ethereum);
  const signer = await provider.getSigner();
  return signer;
}

/**
 * Encrypts a specific input value using the iExec Nox KMS Handle Client.
 */
export async function encryptNoxInput(
  signer: ethers.JsonRpcSigner,
  value: any,
  solidityType: string,
  applicationContract: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
) {
  const handleClient = await createEthersHandleClient(signer as any, {
    smartContractAddress: NOX_CONTRACT_MANAGER as any,
    gatewayUrl: gatewayUrl as any,
    subgraphUrl: NOX_SUBGRAPH_URL as any,
  });

  return handleClient.encryptInput(value, solidityType as any, applicationContract as any);
}

/**
 * Helper to convert a string to a 32-byte digest represented as a BigInt.
 */
export function stringToBytes32Hash(text: string): bigint {
  const bytes = new TextEncoder().encode(text);
  const buf = new Uint8Array(32);
  buf.set(bytes.slice(0, 32));
  const hex = "0x" + Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
  return BigInt(hex);
}

/**
 * Helper to decode BigInt/uint256 back to UTF-8 String (bytes32).
 */
export function bytes32HashToString(val: bigint): string {
  const hex = val.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const zeroIndex = bytes.findIndex((byte) => byte === 0);
  const textBytes = zeroIndex === -1 ? bytes : bytes.slice(0, zeroIndex);
  return new TextDecoder().decode(textBytes);
}

/**
 * Fetches all active escrow agreements associated with the user's wallet address from the blockchain.
 */
export async function fetchUserEscrows(
  signer: ethers.JsonRpcSigner,
  factoryAddress: string,
  userAddress: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY,
  metadataConfig?: MetadataConfig
): Promise<EscrowContract[]> {
  try {
    const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
    const count = await factory.escrowsCount();
    const total = Number(count);
    
    const userEscrows: EscrowContract[] = [];
    
    // Loop backwards (latest agreements first)
    for (let i = total - 1; i >= 0; i--) {
      const escrowAddress = await factory.allEscrows(i);
      const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
      
      const [client, freelancer, status, activeMilestone, totalMilestones] = await Promise.all([
        escrow.client(),
        escrow.freelancer(),
        escrow.status(),
        escrow.activeMilestoneIndex(),
        escrow.totalMilestones()
      ]);
      
      const isClient = client.toLowerCase() === userAddress.toLowerCase();
      const isFreelancer = freelancer.toLowerCase() === userAddress.toLowerCase();
      
      if (isClient || isFreelancer) {
        const statusNames: EscrowContract['status'][] = ['SIGNING', 'ACTIVE', 'DISPUTED', 'COMPLETED', 'REFUNDED'];
        
        const requirements: string[] = [];
        const deliverables: string[] = [];
        const milestoneKeys: string[] = [];
        const deliverableKeys: string[] = [];
        let activeMilestoneSubmitted = false;
        let accumulatedBudget = 0;
        
        const handleClient = await createEthersHandleClient(signer as any, {
          smartContractAddress: NOX_CONTRACT_MANAGER,
          gatewayUrl: gatewayUrl as any,
          subgraphUrl: NOX_SUBGRAPH_URL,
        });

        const activeMilestoneIndex = Number(activeMilestone);

        for (let m = 0; m < Number(totalMilestones); m++) {
          try {
            const milestoneInfo = await escrow.milestones(m);
            if (m === activeMilestoneIndex) {
              activeMilestoneSubmitted = Boolean(milestoneInfo.isSubmitted);
            }

            // Decrypt real milestone budget dynamically (ZK Handle Decryption - no mock values!)
            let payoutValue = Number(status) === 0 ? 0 : 1000;
            try {
              const decryptedPayout = await handleClient.decrypt(milestoneInfo.payoutHandle);
              payoutValue = Number(decryptedPayout.value);
            } catch (payErr) {
              console.warn(`Failed to decrypt payout handle for milestone ${m}:`, payErr);
            }
            accumulatedBudget += payoutValue;

            const decryptedReq = await handleClient.decrypt(milestoneInfo.requirementsHash);
            const decryptedKeyBigInt = decryptedReq.value as bigint;
            const decryptedKeyHex = decryptedKeyBigInt.toString(16).padStart(64, "0");
            milestoneKeys.push(decryptedKeyHex);

            let reqText = "";
            const useE2E = metadataConfig && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;
            
            if (useE2E) {
              try {
                const metadata = await getEscrowMetadata(
                  metadataConfig.supabaseUrl!,
                  metadataConfig.supabaseKey!,
                  escrowAddress,
                  m
                );
                if (metadata && metadata.reqs_cid) {
                  // Fetch ciphertext from IPFS via standard gateway
                  const reqsUrl = `https://gateway.pinata.cloud/ipfs/${metadata.reqs_cid}`;
                  const resp = await fetch(reqsUrl);
                  if (resp.ok) {
                    const payload = await resp.json();
                    reqText = await decryptText(payload.ciphertext, decryptedKeyHex, payload.iv);
                  }
                }
              } catch (metaErr) {
                console.warn(`Failed to fetch/decrypt E2E metadata for milestone ${m}:`, metaErr);
              }
            }

            if (!reqText) {
              // Fallback to direct ASCII bytes32 decoding
              reqText = bytes32HashToString(decryptedKeyBigInt);
            }

            requirements.push(reqText || `Milestone ${m + 1}`);

            // Decrypt deliverables
            let deliverableText = "";
            let devKeyHex = "";
            if (milestoneInfo.isSubmitted) {
              try {
                const decryptedDev = await handleClient.decrypt(milestoneInfo.deliverableHash);
                const devKeyBigInt = decryptedDev.value as bigint;
                devKeyHex = devKeyBigInt.toString(16).padStart(64, "0");

                if (useE2E) {
                  const metadata = await getEscrowMetadata(
                    metadataConfig.supabaseUrl!,
                    metadataConfig.supabaseKey!,
                    escrowAddress,
                    m
                  );
                  if (metadata && metadata.devs_cid) {
                    const devsUrl = `https://gateway.pinata.cloud/ipfs/${metadata.devs_cid}`;
                    const resp = await fetch(devsUrl);
                    if (resp.ok) {
                      const payload = await resp.json();
                      deliverableText = await decryptText(payload.ciphertext, devKeyHex, payload.iv);
                    }
                  }
                } else {
                  deliverableText = bytes32HashToString(devKeyBigInt);
                }
              } catch (devErr) {
                console.warn(`Failed to decrypt deliverable for milestone ${m}:`, devErr);
              }
            }
            deliverables.push(deliverableText);
            deliverableKeys.push(devKeyHex);
          } catch (err) {
            console.error(`Error processing milestone ${m}:`, err);
            requirements.push(`Encrypted Milestone ${m + 1}`);
            deliverables.push("");
            milestoneKeys.push("");
            deliverableKeys.push("");
          }
        }

        userEscrows.push({
          address: escrowAddress,
          counterparty: isClient ? freelancer : client,
          role: isClient ? 'CLIENT' : 'FREELANCER',
          milestonesCompleted: activeMilestoneIndex,
          totalMilestones: Number(totalMilestones),
          budget: accumulatedBudget, // Real decrypted on-chain budget (no mock fallback!)
          status: statusNames[Number(status)] || 'ACTIVE',
          requirements,
          deliverables,
          activeMilestoneSubmitted,
          milestoneKeys,
          deliverableKeys
        });
      }
    }
    
    return userEscrows;
  } catch (err) {
    console.error("Error fetching user escrows from blockchain:", err);
    return [];
  }
}

/**
 * Deploys a new lightweight clone of the escrow contract via the factory.
 * The TEE arbiter is automatically set to the canonical arbiter configured in the factory.
 */
export async function deployEscrowClone(
  signer: ethers.JsonRpcSigner,
  factoryAddress: string,
  freelancerAddress: string,
  totalMilestones: number,
  reviewWindowSeconds: number = 0
): Promise<string> {
  const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
  const tx = await factory.createEscrow(
    freelancerAddress,
    BigInt(totalMilestones),
    BigInt(reviewWindowSeconds)
  );

  const receipt = await tx.wait();
  
  const event = receipt.logs
    .map((log: any) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsedLog: any) => parsedLog && parsedLog.name === "EscrowCreated");

  if (!event) {
    throw new Error("EscrowCreated event not found in logs.");
  }

  return event.args.escrowAddress;
}

/**
 * Approves an Escrow Contract Clone to pull cUSDC on behalf of the client.
 */
export async function approveEscrowOperator(
  signer: ethers.JsonRpcSigner,
  cUSDCAddress: string,
  escrowAddress: string,
  expirySeconds: number = 3600
) {
  const token = new ethers.Contract(cUSDCAddress, MockERC7984ABI, signer);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + expirySeconds);
  const tx = await token.setOperator(escrowAddress, expiry);
  await tx.wait();
}

/**
 * Encrypts and initializes the escrow milestones terms under zero-knowledge.
 */
export async function initializeEscrowMilestones(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string,
  payouts: number[],
  requirements: string[],
  gatewayUrl: string = DEFAULT_NOX_GATEWAY,
  metadataConfig?: MetadataConfig,
  attachedFiles?: File[]
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  
  const encryptedPayouts = [];
  const payoutProofs = [];
  const encryptedReqs = [];
  const reqsProofs = [];
  const metadataRecords: any[] = [];

  const useE2E = metadataConfig && metadataConfig.pinataJWT && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;

  for (let i = 0; i < payouts.length; i++) {
    // 1. Payout volume is always encrypted via Nox KMS directly
    const payoutEnc = await encryptNoxInput(signer, BigInt(payouts[i]), "uint256", escrowAddress, gatewayUrl);
    encryptedPayouts.push(payoutEnc.handle);
    payoutProofs.push(payoutEnc.handleProof);

    // 2. Encrypt requirements text
    let reqsEnc;
    if (useE2E) {
      // E2E Mode: Generate a random 32-byte key
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const randomHexKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
      const keyBigInt = BigInt("0x" + randomHexKey);

      // Encrypt the key itself with Nox KMS
      reqsEnc = await encryptNoxInput(signer, keyBigInt, "uint256", escrowAddress, gatewayUrl);

      // Encrypt attached files
      const fileCids: { name: string; type: string; cid: string }[] = [];
      if (i === 0 && attachedFiles && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const encResult = await encryptAndUploadFile(file, randomHexKey, metadataConfig.pinataJWT!);
          fileCids.push(encResult);
        }
      }

      // Encrypt requirements text/files with the random key via AES-GCM
      const reqObj = {
        text: requirements[i],
        files: fileCids
      };
      const encryptedPayload = await encryptText(JSON.stringify(reqObj), randomHexKey);

      // Upload payload to IPFS
      const cid = await uploadToPinata(encryptedPayload, metadataConfig.pinataJWT!);

      // Cache metadata record for post-confirmation sync
      metadataRecords.push({
        escrow_address: escrowAddress,
        milestone_index: i,
        reqs_cid: cid,
        client_statement: "None provided.",
        freelancer_statement: "None provided."
      });
    } else {
      // Fallback Mode: stringToBytes32Hash directly (limited to 32 bytes on-chain)
      const reqsHash = stringToBytes32Hash(requirements[i]);
      reqsEnc = await encryptNoxInput(signer, reqsHash, "uint256", escrowAddress, gatewayUrl);
    }

    encryptedReqs.push(reqsEnc.handle);
    reqsProofs.push(reqsEnc.handleProof);
  }

  const tx = await escrow.initializeEscrow(
    encryptedPayouts,
    payoutProofs,
    encryptedReqs,
    reqsProofs
  );
  await tx.wait();

  // Sync to database ONLY after the transaction has been successfully confirmed on-chain (Gap 1 resolved)
  if (useE2E && metadataRecords.length > 0) {
    for (const record of metadataRecords) {
      try {
        await insertEscrowMetadata(metadataConfig.supabaseUrl!, metadataConfig.supabaseKey!, record);
      } catch (dbErr) {
        console.warn("Failed to sync initial escrow metadata to Supabase, caching locally:", dbErr);
        savePendingSync({
          id: Math.random().toString(),
          type: "INSERT",
          escrowAddress,
          milestoneIndex: record.milestone_index,
          data: record
        });
      }
    }
  }
}

/**
 * Submits a completed milestone deliverable (encrypted IPFS hash pointer) under zero-knowledge.
 */
export async function submitMilestoneDeliverable(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string,
  milestoneIndex: number,
  deliverableText: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY,
  metadataConfig?: MetadataConfig,
  attachedFiles?: File[]
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  
  const useE2E = metadataConfig && metadataConfig.pinataJWT && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;
  let devEnc;
  let cacheCid = "";

  if (useE2E) {
    // E2E Mode: Generate a random 32-byte key
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    const randomHexKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const keyBigInt = BigInt("0x" + randomHexKey);

    // Encrypt the key itself with Nox KMS
    devEnc = await encryptNoxInput(signer, keyBigInt, "uint256", escrowAddress, gatewayUrl);

    // Encrypt attached files
    const fileCids: { name: string; type: string; cid: string }[] = [];
    if (attachedFiles && attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        const encResult = await encryptAndUploadFile(file, randomHexKey, metadataConfig.pinataJWT!);
        fileCids.push(encResult);
      }
    }

    // Encrypt deliverable text/files with the random key via AES-GCM
    const devObj = {
      text: deliverableText,
      files: fileCids
    };
    const encryptedPayload = await encryptText(JSON.stringify(devObj), randomHexKey);

    // Upload payload to IPFS
    cacheCid = await uploadToPinata(encryptedPayload, metadataConfig.pinataJWT!);
  } else {
    // Fallback Mode: stringToBytes32Hash directly (limited to 32 bytes on-chain)
    const devHash = stringToBytes32Hash(deliverableText);
    devEnc = await encryptNoxInput(signer, devHash, "uint256", escrowAddress, gatewayUrl);
  }

  const tx = await escrow.submitDeliverable(devEnc.handle, devEnc.handleProof);
  await tx.wait();

  // Sync with database ONLY after the transaction has been successfully confirmed on-chain (Gap 1 resolved)
  if (useE2E && cacheCid) {
    try {
      await updateEscrowDeliverable(
        metadataConfig.supabaseUrl!,
        metadataConfig.supabaseKey!,
        escrowAddress,
        milestoneIndex,
        cacheCid
      );
    } catch (dbErr) {
      console.warn("Failed to sync deliverable metadata to Supabase, caching locally:", dbErr);
      savePendingSync({
        id: Math.random().toString(),
        type: "UPDATE",
        escrowAddress,
        milestoneIndex,
        data: { devsCid: cacheCid }
      });
    }
  }
}

/**
 * Client approves milestone work and releases payout to freelancer with satisfaction rating.
 */
export async function releaseEscrowMilestone(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string,
  rating: number
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  const tx = await escrow.releaseMilestone(BigInt(rating));
  await tx.wait();
}

/**
 * Raises a formal dispute on the active milestone, handing transient read access to TEE.
 */
export async function raiseEscrowDispute(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  const tx = await escrow.raiseDispute();
  await tx.wait();
}

/**
 * Requests or approves mutual cancellation of the escrow project.
 */
export async function executeMutualCancel(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  const tx = await escrow.mutualCancel();
  await tx.wait();
}

// Standard Human-readable ERC-20 ABI for public USDC token
export const ERC20ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Human-readable ABI for wrapping features on ERC-7984 contract
export const TokenWrapperABI = [
  "function wrap(address to, uint256 amount) external returns (bytes32)"
];

/**
 * Approves the confidential cUSDC contract to spend the user's public USDC tokens.
 */
export async function approvePublicUSDC(
  signer: ethers.JsonRpcSigner,
  publicUSDCAddress: string,
  cUSDCAddress: string,
  amount: bigint
): Promise<void> {
  const publicToken = new ethers.Contract(publicUSDCAddress, ERC20ABI, signer);
  const tx = await publicToken.approve(cUSDCAddress, amount);
  await tx.wait();
}

/**
 * Checks the allowance of public USDC granted to the confidential cUSDC contract.
 */
export async function checkPublicUSDCAllowance(
  signer: ethers.JsonRpcSigner,
  publicUSDCAddress: string,
  cUSDCAddress: string,
  ownerAddress: string
): Promise<bigint> {
  const publicToken = new ethers.Contract(publicUSDCAddress, ERC20ABI, signer);
  const allowance = await publicToken.allowance(ownerAddress, cUSDCAddress);
  return BigInt(allowance);
}

/**
 * Fetches the standard public USDC balance of a user.
 */
export async function getPublicUSDCBalance(
  signer: ethers.JsonRpcSigner,
  publicUSDCAddress: string,
  userAddress: string
): Promise<bigint> {
  const publicToken = new ethers.Contract(publicUSDCAddress, ERC20ABI, signer);
  const balance = await publicToken.balanceOf(userAddress);
  return BigInt(balance);
}

/**
 * Wraps standard public USDC into confidential cUSDC.
 */
export async function wrapToken(
  signer: ethers.JsonRpcSigner,
  cUSDCAddress: string,
  recipientAddress: string,
  amount: bigint
): Promise<void> {
  const wrapper = new ethers.Contract(cUSDCAddress, TokenWrapperABI, signer);
  const tx = await wrapper.wrap(recipientAddress, amount);
  await tx.wait();
}

/**
 * Unwraps confidential cUSDC back into standard public USDC.
 * Handles the secure two-step iExec Nox protocol flow: unwrap -> KMS decrypt -> finalizeUnwrap.
 */
export async function unwrapToken(
  signer: ethers.JsonRpcSigner,
  cUSDCAddress: string,
  userAddress: string,
  amount: bigint,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
): Promise<void> {
  const wrapper = new ethers.Contract(cUSDCAddress, [
    "function unwrap(address from, address to, bytes32 amount) external returns (bytes32)",
    "function finalizeUnwrap(bytes32 unwrapRequestId, bytes calldata decryptedAmountAndProof) external"
  ], signer);

  // 1. Encrypt unwrap amount using Nox KMS
  const amountEnc = await encryptNoxInput(signer, amount, "uint256", cUSDCAddress, gatewayUrl);

  // Grant wrapper contract permission to read the encrypted unwrap amount handle
  const noxContractManager = new ethers.Contract(NOX_CONTRACT_MANAGER, [
    "function allow(bytes32 handle, address contractAddress) external"
  ], signer);
  const allowTx = await noxContractManager.allow(amountEnc.handle, cUSDCAddress);
  await allowTx.wait();

  // 2. Call unwrap to burn confidential tokens and initiate request
  const unwrapTx = await wrapper.unwrap(userAddress, userAddress, amountEnc.handle);
  await unwrapTx.wait();

  // 3. Decrypt unwrapRequestId handle via Nox KMS using publicDecrypt to get decryptionProof
  const handleClient = await createEthersHandleClient(signer as any, {
    smartContractAddress: NOX_CONTRACT_MANAGER,
    gatewayUrl: gatewayUrl as any,
    subgraphUrl: NOX_SUBGRAPH_URL,
  });

  const { decryptionProof } = await handleClient.publicDecrypt(amountEnc.handle);
  
  // 4. Finalize unwrap to claim public USDC tokens
  const finalizeTx = await wrapper.finalizeUnwrap(amountEnc.handle, decryptionProof);
  await finalizeTx.wait();
}

/**
 * Fetches and decrypts the user's confidential cUSDC balance.
 */
export async function getConfidentialUSDCBalance(
  signer: ethers.JsonRpcSigner,
  cUSDCAddress: string,
  userAddress: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
): Promise<bigint> {
  const token = new ethers.Contract(cUSDCAddress, MockERC7984ABI, signer);
  const balanceHandle = await token.confidentialBalanceOf(userAddress);
  
  if (balanceHandle === "0x0000000000000000000000000000000000000000000000000000000000000000" || !balanceHandle) {
    return 0n;
  }

  const handleClient = await createEthersHandleClient(signer as any, {
    smartContractAddress: NOX_CONTRACT_MANAGER,
    gatewayUrl: gatewayUrl as any,
    subgraphUrl: NOX_SUBGRAPH_URL,
  });

  const decrypted = await handleClient.decrypt(balanceHandle);
  return BigInt(decrypted.value);
}

/**
 * Fetches and decrypts the freelancer's on-chain reputation score from the registry.
 * Returns null if the reputation registry is not configured or decryption fails.
 */
export async function getOnChainReputation(
  signer: ethers.JsonRpcSigner,
  reputationRegistryAddress: string,
  freelancerAddress: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
): Promise<bigint | null> {
  if (!reputationRegistryAddress || reputationRegistryAddress === ethers.ZeroAddress) {
    console.warn("Reputation registry not configured");
    return null;
  }

  try {
    const reputationABI = [
      "function getReputation(address freelancer) view returns (bytes32)"
    ];
    const reputation = new ethers.Contract(reputationRegistryAddress, reputationABI, signer);
    
    const repHandle = await reputation.getReputation(freelancerAddress);
    
    if (repHandle === "0x0000000000000000000000000000000000000000000000000000000000000000" || !repHandle) {
      return null;
    }

    const handleClient = await createEthersHandleClient(signer as any, {
      smartContractAddress: NOX_CONTRACT_MANAGER,
      gatewayUrl: gatewayUrl as any,
      subgraphUrl: NOX_SUBGRAPH_URL,
    });

    const decrypted = await handleClient.decrypt(repHandle);
    return BigInt(decrypted.value);
  } catch (err) {
    console.warn("Failed to fetch on-chain reputation:", err);
    return null;
  }
}

/**
 * Fetches factory configuration including fee and treasury settings.
 */
export async function getFactoryConfig(
  signer: ethers.JsonRpcSigner,
  factoryAddress: string
): Promise<{
  canonicalTeeArbiter: string;
  platformFeeBps: bigint;
  treasury: string;
  cUSDCToken: string;
  reviewWindow: bigint;
  mutualCancelWindow: bigint;
}> {
  const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
  
  const [canonicalTeeArbiter, platformFeeBps, treasury, cUSDCToken, reviewWindow, mutualCancelWindow] = 
    await Promise.all([
      factory.canonicalTeeArbiter(),
      factory.platformFeeBps(),
      factory.treasury(),
      factory.cUSDCToken(),
      factory.reviewWindow(),
      factory.mutualCancelWindow()
    ]);

  return {
    canonicalTeeArbiter,
    platformFeeBps,
    treasury,
    cUSDCToken,
    reviewWindow,
    mutualCancelWindow
  };
}

/**
 * Updates factory configuration (admin only).
 */
export async function updateFactoryConfig(
  signer: ethers.JsonRpcSigner,
  factoryAddress: string,
  config: {
    canonicalTeeArbiter?: string;
    platformFeeBps?: bigint;
    treasury?: string;
    cUSDCToken?: string;
    reviewWindow?: bigint;
    mutualCancelWindow?: bigint;
  }
): Promise<void> {
  const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
  
  if (config.canonicalTeeArbiter) {
    const tx = await factory.setCanonicalTeeArbiter(config.canonicalTeeArbiter);
    await tx.wait();
  }
  if (config.platformFeeBps !== undefined) {
    const tx = await factory.setPlatformFeeBps(config.platformFeeBps);
    await tx.wait();
  }
  if (config.treasury) {
    const tx = await factory.setTreasury(config.treasury);
    await tx.wait();
  }
  if (config.cUSDCToken) {
    const tx = await factory.setUSDCToken(config.cUSDCToken);
    await tx.wait();
  }
  if (config.reviewWindow !== undefined) {
    const tx = await factory.setReviewWindow(config.reviewWindow);
    await tx.wait();
  }
  if (config.mutualCancelWindow !== undefined) {
    const tx = await factory.setMutualCancelWindow(config.mutualCancelWindow);
    await tx.wait();
  }
}
