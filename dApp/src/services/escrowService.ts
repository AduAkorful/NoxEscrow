import { createEthersHandleClient } from "@iexec-nox/handle";
import { ethers } from "ethers";
import { NoxEscrowFactoryABI } from "../contracts/NoxEscrowFactory";
import { NoxEscrowContractABI } from "../contracts/NoxEscrowContract";
import { ERC7984ABI } from "../contracts/ERC7984";
import { getEscrowMetadata, insertEscrowMetadata, updateEscrowDeliverable, savePendingSync } from "./metadataService";
import { encryptText, decryptText, uploadToPinata, encryptAndUploadFile } from "../crypto/fileUploader";
import addresses from "../contracts/addresses.json";

// Canonical Nox Contract Manager address on Sepolia/Local Stack Emulator
export const NOX_CONTRACT_MANAGER = import.meta.env.VITE_NOX_CONTRACT_MANAGER || addresses.noxContractManager || "";

// Default Gateway ports for Local Nox Stack
export const DEFAULT_NOX_GATEWAY = "http://127.0.0.1:8080";

// Client Marketplace Fee (1.0% = 100 BPS)
export const CLIENT_FEE_BPS = 100;

export function calculateClientDeposit(milestoneBudgetSum: number): {
  budgetTotal: number;
  clientFee: number;
  totalDeposit: number;
} {
  const clientFee = (milestoneBudgetSum * CLIENT_FEE_BPS) / 10000;
  return {
    budgetTotal: milestoneBudgetSum,
    clientFee,
    totalDeposit: milestoneBudgetSum + clientFee
  };
}

export function calculateFreelancerEarnings(milestoneBudget: number, feeDiscountBps: number = 50): {
  grossPayout: number;
  freelancerFee: number;
  netPayout: number;
} {
  const freelancerFee = (milestoneBudget * feeDiscountBps) / 10000;
  return {
    grossPayout: milestoneBudget,
    freelancerFee,
    netPayout: milestoneBudget - freelancerFee
  };
}

// Configurable Subgraph URL for Live Network/Sepolia Integration
export const NOX_SUBGRAPH_URL = import.meta.env.VITE_NOX_SUBGRAPH_URL || "";

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
  activeMilestoneSubmissionTime?: number;
  reviewWindow?: number;
  milestoneKeys?: string[];
  deliverableKeys?: string[];
  title?: string;
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

let cachedHandleClient: any = null;
let cachedSignerAddress: string = "";

export function clearHandleClientCache() {
  cachedHandleClient = null;
  cachedSignerAddress = "";
  chatKeyMemoryCache.clear();
}

export async function getOrCreateHandleClient(
  signer: ethers.JsonRpcSigner,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY,
  forceFresh: boolean = false
) {
  const currentAddress = await signer.getAddress();
  if (!forceFresh && cachedHandleClient && cachedSignerAddress.toLowerCase() === currentAddress.toLowerCase()) {
    return cachedHandleClient;
  }

  cachedHandleClient = await createEthersHandleClient(signer as any, {
    smartContractAddress: NOX_CONTRACT_MANAGER as any,
    gatewayUrl: gatewayUrl as any,
    subgraphUrl: NOX_SUBGRAPH_URL as any,
  });
  cachedSignerAddress = currentAddress;
  return cachedHandleClient;
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
  const handleClient = await getOrCreateHandleClient(signer, gatewayUrl);
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

const memoryCacheMap = new Map<string, string>();
const chatKeyMemoryCache = {
  get(key: string): string | undefined {
    if (memoryCacheMap.has(key)) {
      return memoryCacheMap.get(key);
    }
    if (typeof window !== "undefined" && window.sessionStorage) {
      const stored = sessionStorage.getItem("nox_cache_" + key);
      if (stored) {
        memoryCacheMap.set(key, stored);
        return stored;
      }
    }
    return undefined;
  },
  set(key: string, val: string) {
    memoryCacheMap.set(key, val);
    if (typeof window !== "undefined" && window.sessionStorage && val) {
      try {
        sessionStorage.setItem("nox_cache_" + key, val);
      } catch {
        // ignore quota error
      }
    }
  },
  clear() {
    memoryCacheMap.clear();
  }
};

/**
 * Lazily decrypt a single milestone's requirements handle to derive the shared
 * symmetric chat key. This triggers ONE wallet authorization prompt (to create
 * the handle client) and then caches it in memory for subsequent decrypts.
 */
export async function decryptMilestoneChatKey(
  signer: ethers.JsonRpcSigner,
  escrowAddress: string,
  milestoneIndex: number = 0,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
): Promise<string> {
  const cacheKey = `${escrowAddress.toLowerCase()}_ms_${milestoneIndex}`;
  const existing = chatKeyMemoryCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);
  const milestoneInfo = await escrow.milestones(milestoneIndex);

  const handleClient = await getOrCreateHandleClient(signer, gatewayUrl);
  const decryptedReq = await handleClient.decrypt(milestoneInfo.requirementsHash);
  const decryptedKeyBigInt = decryptedReq.value as bigint;
  const derivedKeyHex = decryptedKeyBigInt.toString(16).padStart(64, "0");
  
  chatKeyMemoryCache.set(cacheKey, derivedKeyHex);
  return derivedKeyHex;
}

/**
 * Fetches all active escrow agreements associated with the user's wallet address from the blockchain.
 */
export async function fetchUserEscrows(
  signer: ethers.JsonRpcSigner,
  factoryAddress: string,
  userAddress: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY,
  metadataConfig?: MetadataConfig,
  allowInteractiveDecrypt: boolean = false
): Promise<EscrowContract[]> {
  try {
    const factory = new ethers.Contract(factoryAddress, NoxEscrowFactoryABI, signer);
    const totalCount = await factory.escrowsCount();
    const total = Number(totalCount);

    const userEscrows: EscrowContract[] = [];

    for (let i = total - 1; i >= 0; i--) {
      const escrowAddress = await factory.allEscrows(i);
      const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);

      const [client, freelancer, status, activeMilestone, totalMilestones, reviewWindow] = await Promise.all([
        escrow.client(),
        escrow.freelancer(),
        escrow.status(),
        escrow.activeMilestoneIndex(),
        escrow.totalMilestones(),
        escrow.reviewWindow()
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
        let activeMilestoneSubmissionTime = 0;
        let accumulatedBudget = 0;
        let contractTitle = "Confidential Escrow Agreement";

        let handleClient: any = null;
        if (allowInteractiveDecrypt) {
          try {
            handleClient = await createEthersHandleClient(signer as any, {
              smartContractAddress: NOX_CONTRACT_MANAGER,
              gatewayUrl: gatewayUrl as any,
              subgraphUrl: NOX_SUBGRAPH_URL,
            });
          } catch (hErr) {
            console.warn("Handle client creation skipped:", hErr);
          }
        }

        const activeMilestoneIndex = Number(activeMilestone);
        const useE2E = metadataConfig && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;

        for (let m = 0; m < Number(totalMilestones); m++) {
          try {
            const milestoneInfo = await escrow.milestones(m);
            if (m === activeMilestoneIndex) {
              activeMilestoneSubmitted = Boolean(milestoneInfo.isSubmitted);
              activeMilestoneSubmissionTime = Number(milestoneInfo.submissionTime);
            }

            let metadata: any = null;
            if (useE2E) {
              try {
                metadata = await getEscrowMetadata(
                  metadataConfig.supabaseUrl!,
                  metadataConfig.supabaseKey!,
                  escrowAddress,
                  m
                );
              } catch (metaErr) {
                console.warn(`Failed to fetch E2E metadata for milestone ${m}:`, metaErr);
              }
            }

            let payoutValue = Number(status) === 0 ? 0 : 0;
            if (handleClient && allowInteractiveDecrypt) {
              try {
                const decryptedPayout = await handleClient.decrypt(milestoneInfo.payoutHandle);
                payoutValue = Number(decryptedPayout.value);
              } catch (payErr) {
                console.warn(`Failed to decrypt payout handle for milestone ${m}:`, payErr);
              }
            } else if (metadata && metadata.payout_amount) {
              payoutValue = Number(metadata.payout_amount);
            }
            accumulatedBudget += payoutValue;

            let decryptedKeyHex = chatKeyMemoryCache.get(`${escrowAddress.toLowerCase()}_ms_${m}_req`) || "";
            if (!decryptedKeyHex && allowInteractiveDecrypt && signer) {
              try {
                handleClient = handleClient || await createEthersHandleClient(signer as any, {
                  smartContractAddress: NOX_CONTRACT_MANAGER,
                  gatewayUrl: gatewayUrl as any,
                  subgraphUrl: NOX_SUBGRAPH_URL,
                });
                const decryptedReq = await handleClient.decrypt(milestoneInfo.requirementsHash);
                const decryptedKeyBigInt = decryptedReq.value as bigint;
                decryptedKeyHex = decryptedKeyBigInt.toString(16).padStart(64, "0");
                chatKeyMemoryCache.set(`${escrowAddress.toLowerCase()}_ms_${m}_req`, decryptedKeyHex);
              } catch (reqErr) {
                console.warn(`Failed to decrypt requirement handle for milestone ${m}:`, reqErr);
              }
            }
            milestoneKeys.push(decryptedKeyHex);

            let reqText = "";
            if (useE2E && metadata) {
              try {
                if (metadata.title) {
                  contractTitle = metadata.title;
                }
                if (metadata.reqs_cid && decryptedKeyHex) {
                  const reqsUrl = metadata.reqs_cid.startsWith("data:")
                    ? metadata.reqs_cid
                    : `https://gateway.pinata.cloud/ipfs/${metadata.reqs_cid}`;
                  let payload: any = null;
                  if (reqsUrl.startsWith("data:")) {
                    const base64Data = reqsUrl.split(",")[1];
                    payload = JSON.parse(atob(base64Data));
                  } else {
                    const resp = await fetch(reqsUrl);
                    if (resp.ok) payload = await resp.json();
                  }
                  if (payload) {
                    const rawDecrypted = await decryptText(payload.ciphertext, decryptedKeyHex, payload.iv);
                    reqText = rawDecrypted;
                  }
                }
              } catch (metaErr) {
                console.warn(`Failed to fetch/decrypt E2E metadata for milestone ${m}:`, metaErr);
              }
            }

            requirements.push(reqText || `${contractTitle} - Milestone ${m + 1}`);

            let deliverableText = "";
            let devKeyHex = chatKeyMemoryCache.get(`${escrowAddress.toLowerCase()}_ms_${m}_dev`) || "";
            let effectiveDevKey = "";
            if (milestoneInfo.isSubmitted) {
              if (!devKeyHex && allowInteractiveDecrypt && signer) {
                try {
                  handleClient = handleClient || await createEthersHandleClient(signer as any, {
                    smartContractAddress: NOX_CONTRACT_MANAGER,
                    gatewayUrl: gatewayUrl as any,
                    subgraphUrl: NOX_SUBGRAPH_URL,
                  });
                  const decryptedDev = await handleClient.decrypt(milestoneInfo.deliverableHash);
                  const devKeyBigInt = decryptedDev.value as bigint;
                  devKeyHex = devKeyBigInt.toString(16).padStart(64, "0");
                  chatKeyMemoryCache.set(`${escrowAddress.toLowerCase()}_ms_${m}_dev`, devKeyHex);
                } catch (devErr) {
                  console.warn(`Failed to decrypt deliverable handle for milestone ${m}:`, devErr);
                }
              }

              effectiveDevKey = devKeyHex || decryptedKeyHex || chatKeyMemoryCache.get(`${escrowAddress.toLowerCase()}_ms_${m}_dev`) || chatKeyMemoryCache.get(`${escrowAddress.toLowerCase()}_ms_${m}_req`) || chatKeyMemoryCache.get(`${escrowAddress.toLowerCase()}_ms_${m}`) || "";
              if (useE2E && metadata && metadata.devs_cid && effectiveDevKey) {
                try {
                  const devsUrl = metadata.devs_cid.startsWith("data:")
                    ? metadata.devs_cid
                    : `https://gateway.pinata.cloud/ipfs/${metadata.devs_cid}`;
                  let payload: any = null;
                  if (devsUrl.startsWith("data:")) {
                    const base64Data = devsUrl.split(",")[1];
                    payload = JSON.parse(atob(base64Data));
                  } else {
                    const resp = await fetch(devsUrl);
                    if (resp.ok) payload = await resp.json();
                  }
                  if (payload) {
                    let rawDecrypted = "";
                    try {
                      rawDecrypted = await decryptText(payload.ciphertext, effectiveDevKey, payload.iv);
                    } catch {
                      if (decryptedKeyHex && effectiveDevKey !== decryptedKeyHex) {
                        try {
                          rawDecrypted = await decryptText(payload.ciphertext, decryptedKeyHex, payload.iv);
                        } catch {
                          // ignore
                        }
                      }
                    }
                    if (rawDecrypted) {
                      deliverableText = rawDecrypted;
                    }
                  }
                } catch (devMetaErr) {
                  console.warn(`Failed to fetch/decrypt deliverable payload for milestone ${m}:`, devMetaErr);
                }
              }
            }
            deliverables.push(deliverableText);
            deliverableKeys.push(effectiveDevKey || devKeyHex);
          } catch (err) {
            console.error(`Error processing milestone ${m}:`, err);
            requirements.push(`Milestone ${m + 1}`);
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
          budget: accumulatedBudget,
          status: statusNames[Number(status)] || 'ACTIVE',
          requirements,
          deliverables,
          activeMilestoneSubmitted,
          activeMilestoneSubmissionTime,
          reviewWindow: Number(reviewWindow),
          milestoneKeys,
          deliverableKeys,
          title: contractTitle
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
  expirySeconds: number = 86400
) {
  const token = new ethers.Contract(cUSDCAddress, ERC7984ABI, signer);
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
  attachedFiles?: File[],
  title?: string
) {
  const escrow = new ethers.Contract(escrowAddress, NoxEscrowContractABI, signer);

  const encryptedPayouts = [];
  const payoutProofs = [];
  const encryptedReqs = [];
  const reqsProofs = [];
  const metadataRecords: any[] = [];

  const useE2E = metadataConfig && metadataConfig.pinataJWT && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;

  for (let i = 0; i < payouts.length; i++) {
    // 1. Payout volume is always encrypted via Nox KMS directly (ensuring integer input for BigInt)
    const safePayoutInt = Math.round(payouts[i]);
    const payoutEnc = await encryptNoxInput(signer, BigInt(safePayoutInt), "uint256", escrowAddress, gatewayUrl);
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
      chatKeyMemoryCache.set(`${escrowAddress.toLowerCase()}_ms_${i}_req`, randomHexKey);

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
        title: title || "Confidential Escrow Agreement",
        client_statement: "None provided.",
        freelancer_statement: "None provided.",
        payout_amount: payouts[i]
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

  const useE2E = metadataConfig && metadataConfig.supabaseUrl && metadataConfig.supabaseKey;
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
    chatKeyMemoryCache.set(`${escrowAddress.toLowerCase()}_ms_${milestoneIndex}_dev`, randomHexKey);

    // Encrypt attached files
    const fileCids: { name: string; type: string; cid: string }[] = [];
    if (attachedFiles && attachedFiles.length > 0 && metadataConfig.pinataJWT) {
      for (const file of attachedFiles) {
        try {
          const encResult = await encryptAndUploadFile(file, randomHexKey, metadataConfig.pinataJWT);
          fileCids.push(encResult);
        } catch (fErr: any) {
          console.error("Pinata file upload failed:", fErr);
          throw new Error(`Failed to upload attached file "${file.name}" to IPFS: ${fErr.message || "Pinata upload error"}`);
        }
      }
    }

    // Encrypt deliverable text/files with the random key via AES-GCM
    const devObj = {
      text: deliverableText,
      files: fileCids
    };
    const encryptedPayload = await encryptText(JSON.stringify(devObj), randomHexKey);

    // Upload payload to Pinata IPFS if available, else store directly as inline data URI
    if (metadataConfig.pinataJWT) {
      try {
        cacheCid = await uploadToPinata(encryptedPayload, metadataConfig.pinataJWT);
      } catch (pErr) {
        console.warn("Pinata upload failed, falling back to data URI:", pErr);
        cacheCid = "data:application/json;base64," + btoa(JSON.stringify(encryptedPayload));
      }
    } else {
      cacheCid = "data:application/json;base64," + btoa(JSON.stringify(encryptedPayload));
    }
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

  if (!NOX_CONTRACT_MANAGER || !ethers.isAddress(NOX_CONTRACT_MANAGER)) {
    throw new Error("Nox Contract Manager address is not configured in environment variables or addresses.json.");
  }

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
  const handleClient = await getOrCreateHandleClient(signer, gatewayUrl);

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
  const token = new ethers.Contract(cUSDCAddress, ERC7984ABI, signer);
  const balanceHandle = await token.confidentialBalanceOf(userAddress);

  if (balanceHandle === "0x0000000000000000000000000000000000000000000000000000000000000000" || !balanceHandle) {
    return 0n;
  }

  try {
    const handleClient = await getOrCreateHandleClient(signer, gatewayUrl, false);
    const decrypted = await handleClient.decrypt(balanceHandle);
    const val = decrypted?.value ?? decrypted;
    return BigInt(val);
  } catch (err) {
    console.warn("Cached Nox handleClient decryption failed, retrying with fresh client:", err);
    cachedHandleClient = null;
    cachedSignerAddress = "";
    const freshClient = await getOrCreateHandleClient(signer, gatewayUrl, true);
    const decrypted = await freshClient.decrypt(balanceHandle);
    const val = decrypted?.value ?? decrypted;
    return BigInt(val);
  }
}

export const NOX_ESCROW_FACTORY = import.meta.env.VITE_NOX_ESCROW_FACTORY || addresses.factory || "";

/**
 * Fetches and decrypts the freelancer's on-chain reputation score from the registry.
 * Uses publicDecrypt for zero-knowledge on-chain reputation handles.
 */
export async function getOnChainReputation(
  signerOrProvider: ethers.JsonRpcSigner | ethers.Provider | null,
  reputationRegistryAddress: string,
  freelancerAddress: string,
  gatewayUrl: string = DEFAULT_NOX_GATEWAY
): Promise<bigint | null> {
  if (!freelancerAddress || !ethers.isAddress(freelancerAddress)) {
    return null;
  }

  let registryAddr = reputationRegistryAddress;
  let providerOrSigner: any = signerOrProvider;

  if (!providerOrSigner) {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        providerOrSigner = new ethers.BrowserProvider((window as any).ethereum);
      } catch {
        providerOrSigner = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      }
    } else {
      providerOrSigner = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    }
  }

  if (!registryAddr || registryAddr === ethers.ZeroAddress) {
    if (NOX_ESCROW_FACTORY && ethers.isAddress(NOX_ESCROW_FACTORY)) {
      try {
        const factory = new ethers.Contract(
          NOX_ESCROW_FACTORY,
          ["function reputationRegistry() view returns (address)"],
          providerOrSigner
        );
        registryAddr = await factory.reputationRegistry();
      } catch (fErr) {
        console.warn("Failed to fetch reputationRegistry from factory contract:", fErr);
      }
    }
  }

  if (!registryAddr || registryAddr === ethers.ZeroAddress) {
    console.warn("Reputation registry not configured");
    return null;
  }

  try {
    const reputationABI = [
      "function getReputation(address freelancer) view returns (bytes32)"
    ];
    const reputation = new ethers.Contract(registryAddr, reputationABI, providerOrSigner);

    const repHandle = await reputation.getReputation(freelancerAddress);

    if (repHandle === "0x0000000000000000000000000000000000000000000000000000000000000000" || !repHandle) {
      return null;
    }

    const handleClient = await createEthersHandleClient(providerOrSigner as any, {
      smartContractAddress: NOX_CONTRACT_MANAGER,
      gatewayUrl: gatewayUrl as any,
      subgraphUrl: NOX_SUBGRAPH_URL,
    });

    try {
      const pubRes = await handleClient.publicDecrypt(repHandle);
      if (pubRes && pubRes.value !== undefined) {
        return BigInt(pubRes.value);
      }
    } catch (pubErr) {
      console.warn("publicDecrypt failed, trying private decrypt:", pubErr);
    }

    const decrypted = await handleClient.decrypt(repHandle);
    return BigInt(decrypted?.value ?? decrypted);
  } catch (err) {
    console.error("Failed to fetch on-chain reputation from KMS:", err);
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
