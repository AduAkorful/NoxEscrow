import { expect } from "chai";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";
import * as fs from "fs";
import * as path from "path";

// Helper to encrypt input with a specific signer
async function encryptInputWithSigner(
  signer: any,
  value: any,
  solidityType: string,
  applicationContract: string,
  gatewayUrl: string
) {
  const handleClient = await createEthersHandleClient(signer, {
    smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
    gatewayUrl: gatewayUrl,
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });
  return handleClient.encryptInput(value, solidityType as any, applicationContract);
}

// Convert JavaScript number to uint48
function uint48(val: number): bigint {
  return BigInt(val) & 0xffffffffffffn;
}

// Convert string to 32-byte hash digest (bigint)
function ethersHash(val: string): bigint {
  const bytes = Buffer.from(val, "utf-8");
  const hex = "0x" + bytes.toString("hex").padEnd(64, "0").slice(0, 64);
  return BigInt(hex);
}

// Convert a hex string back to a readable UTF-8 string (stripping trailing null-bytes)
function hexToUtf8(hex: string): string {
  try {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    const buf = Buffer.from(cleanHex, "hex");
    return buf.toString("utf8").replace(/\0+$/, "");
  } catch {
    return hex;
  }
}

// Helper to safely extract deployed escrow clone address from transaction logs
async function getEscrowAddress(receipt: any, factory: any): Promise<string> {
  const event = receipt?.logs
    .map((log: any) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsedLog: any) => parsedLog && parsedLog.name === "EscrowCreated");
  if (!event) throw new Error("EscrowCreated event not found in logs");
  return event.args.escrowAddress;
}

describe("NoxEscrow Full-Stack E2E Integration", function () {
  let hardhatEthers: any;
  let client: any;
  let freelancer: any;
  let teeArbiter: any;
  let cUSDC: any;
  let cUSDCAddress: string;
  let reputation: any;
  let reputationAddress: string;
  let escrowImpl: any;
  let escrowImplAddress: string;
  let factory: any;
  let factoryAddress: string;
  let gatewayUrl: string;

  before(async function () {
    // Connect to the local Nox stack
    const connection = await nox.connect();
    hardhatEthers = connection.ethers;
    [client, freelancer, teeArbiter] = await hardhatEthers.getSigners();
    gatewayUrl = `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT}`;
  });

  it("should deploy locally, simulate work/rejection, write to local JSON db, and resolve via in-process TEE evaluation", async function () {
    // 1. Deploy Clean Core Contracts
    cUSDC = await hardhatEthers.deployContract("MockERC7984", []);
    cUSDCAddress = await cUSDC.getAddress();

    const reputationImpl = await hardhatEthers.deployContract("NoxEscrowReputation", []);
    const reputationImplAddress = await reputationImpl.getAddress();

    const escrowImpl = await hardhatEthers.deployContract("NoxEscrowContract", []);
    const escrowImplAddress = await escrowImpl.getAddress();

    const factoryImpl = await hardhatEthers.deployContract("NoxEscrowFactory", []);
    const factoryImplAddress = await factoryImpl.getAddress();

    // Deploy Factory Proxy
    const factoryInitData = factoryImpl.interface.encodeFunctionData("initialize", [
      escrowImplAddress,
      hardhatEthers.ZeroAddress,
      cUSDCAddress,
      teeArbiter.address,
      client.address // use client as treasury for test
    ]);
    const factoryProxy = await hardhatEthers.deployContract("NoxProxy", [
      factoryImplAddress,
      factoryInitData
    ]);
    factoryAddress = await factoryProxy.getAddress();
    factory = await hardhatEthers.getContractAt("NoxEscrowFactory", factoryAddress);

    // Deploy Reputation Proxy
    const reputationInitData = reputationImpl.interface.encodeFunctionData("initialize", [
      factoryAddress
    ]);
    const reputationProxy = await hardhatEthers.deployContract("NoxProxy", [
      reputationImplAddress,
      reputationInitData
    ]);
    reputationAddress = await reputationProxy.getAddress();
    reputation = await hardhatEthers.getContractAt("NoxEscrowReputation", reputationAddress);

    // Link Reputation Registry in Factory
    await factory.setReputationRegistry(reputationAddress);

    // Initialize Base Reputation score (1000)
    const baseRepEnc = await encryptInputWithSigner(client, 1000n, "uint256", reputationAddress, gatewayUrl);
    await reputation.connect(client).setBaseReputation(baseRepEnc.handle, baseRepEnc.handleProof);

    // Set local review window to 5 seconds
    await factory.setReviewWindow(5n);

    // Mint starting funds to client
    await cUSDC.mintPlain(client.address, 1000000n);

    // 2. Create Escrow Agreement Clone
    const createTx = await factory.connect(client).createEscrow(
      freelancer.address,
      1n, // 1 milestone project
      0n
    );
    const createReceipt = await createTx.wait();
    const escrowAddress = await getEscrowAddress(createReceipt, factory);
    const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

    // Client approves Clone as operator on token
    await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

    // 3. Encrypt terms and fund the escrow milestone
    const requirementsText = "Build responsive sidebar.";
    const deliverableText = "Sidebar built successfully.";
    const clientStatement = "The sidebar collapsible animation is lagging and lacks responsiveness.";
    const freelancerStatement = "Tested collapsible sidebar animations in Chrome, Safari and Firefox. It has full GPU acceleration and zero lag.";

    const reqsEnc = await encryptInputWithSigner(client, ethersHash(requirementsText), "uint256", escrowAddress, gatewayUrl);
    const payoutEnc = await encryptInputWithSigner(client, 5000n, "uint256", escrowAddress, gatewayUrl);

    await escrow.connect(client).initializeEscrow(
      [payoutEnc.handle],
      [payoutEnc.handleProof],
      [reqsEnc.handle],
      [reqsEnc.handleProof]
    );

    // 4. Freelancer Submits Deliverable
    const devEnc = await encryptInputWithSigner(freelancer, ethersHash(deliverableText), "uint256", escrowAddress, gatewayUrl);
    await escrow.connect(freelancer).submitDeliverable(devEnc.handle, devEnc.handleProof);

    // 5. Client raises formal dispute
    await escrow.connect(client).raiseDispute();

    // Verify state is DISPUTED (2)
    expect(await escrow.status()).to.equal(2n);

    // 6. Write to Local JSON Database for Integration Test
    const dbPath = path.resolve("../arbiter/local-db.json");
    const localDbRecord = {
      escrow_address: escrowAddress,
      milestone_index: 0,
      plaintext_requirements: requirementsText,
      plaintext_deliverables: deliverableText,
      client_statement: clientStatement,
      freelancer_statement: freelancerStatement
    };

    fs.writeFileSync(dbPath, JSON.stringify([localDbRecord], null, 2), "utf8");
    console.log(`\nLOG: Local JSON Database synchronized at: ${dbPath}`);

    // 7. Execute In-Process TEE Arbiter decryption & evaluation
    console.log("🔓 Querying local Nox KMS for handle decryption permissions...");
    const handleClient = await createEthersHandleClient(teeArbiter, {
      smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
      gatewayUrl: gatewayUrl,
      subgraphUrl: "https://example.com/subgraphs/id/none"
    });

    const decryptedReqs = await handleClient.decrypt(reqsEnc.handle);
    const decryptedDevs = await handleClient.decrypt(devEnc.handle);

    const reqsHex = decryptedReqs.value.toString(16).padStart(64, "0");
    const devsHex = decryptedDevs.value.toString(16).padStart(64, "0");

    console.log("🗄️  Reading metadata from local JSON database...");
    const rawData = fs.readFileSync(dbPath, "utf8");
    const localDb = JSON.parse(rawData);
    const record = localDb.find((r: any) => r.escrow_address.toLowerCase() === escrowAddress.toLowerCase());
    
    expect(record).to.not.be.undefined;

    // Convert hex back to plaintext string representation (unit test fallback mode)
    const plaintextReqsFromKMS = hexToUtf8(reqsHex);
    const plaintextDevsFromKMS = hexToUtf8(devsHex);

    console.log(`📝 KMS Decrypted Requirements: "${plaintextReqsFromKMS}"`);
    console.log(`📝 KMS Decrypted Deliverables: "${plaintextDevsFromKMS}"`);

    // Verify plaintext matches what was encrypted
    expect(plaintextReqsFromKMS).to.equal(requirementsText);
    expect(plaintextDevsFromKMS).to.equal(deliverableText);

    // AI Adjudication Step (Mocked for deterministic local unit/integration test)
    console.log("⚖️  Executing local TEE AI evaluation engine over decrypted inputs...");
    const adjudicationVerdict = "PAY_FREELANCER"; // AI rules in favor of freelancer based on 100% requirements match
    const ruleInFavorOfFreelancer = (adjudicationVerdict === "PAY_FREELANCER");
    console.log(`⚖️  Adjudication Verdict Rendered: ${adjudicationVerdict}`);

    // Broadcast on-chain settlement
    console.log("🚀 Broadcasting resolveDispute to contract...");
    const tx = await escrow.connect(teeArbiter).resolveDispute(ruleInFavorOfFreelancer);
    await tx.wait();

    // Clean up local JSON database
    try {
      fs.unlinkSync(dbPath);
      console.log("LOG: Cleaned up temporary local-db.json file.");
    } catch {}

    // 8. Verify On-chain Settlement Status is COMPLETED (3)
    const finalStatus = await escrow.status();
    console.log(`LOG: Final Escrow Agreement Status: ${finalStatus}`);
    expect(finalStatus).to.equal(3n); // Status.COMPLETED
  });
});
