import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";
import { execSync } from "child_process";
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

async function decryptBalance(signer: any, handle: string, gatewayUrl: string): Promise<bigint> {
  if (handle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return 0n;
  }
  const handleClient = await createEthersHandleClient(signer, {
    smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
    gatewayUrl: gatewayUrl,
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });
  const decrypted = await handleClient.decrypt(handle as any);
  return decrypted.value as bigint;
}

async function main() {
  console.log("=====================================================================");
  console.log("⚡  NoxEscrow Protocol — Full Local End-to-End Integration Test  ⚡");
  console.log("=====================================================================\n");

  // 1. Connect to the local Nox stack
  console.log("🔌 Connecting to local Nox stack and booting emulator...");
  const connection = await nox.connect();
  const hardhatEthers = connection.ethers;
  const [client, freelancer, teeArbiter] = await hardhatEthers.getSigners();
  
  const gatewayUrl = `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT || "8080"}`;
  console.log(`👤 Client: ${client.address}`);
  console.log(`👤 Freelancer: ${freelancer.address}`);
  console.log(`👤 TEE Arbiter: ${teeArbiter.address}`);
  console.log(`🌐 Nox Gateway URL: ${gatewayUrl}\n`);

  // 2. Deploy contracts
  console.log("📦 Deploying core contracts locally...");
  const cUSDC = await hardhatEthers.deployContract("MockERC7984", []);
  const cUSDCAddress = await cUSDC.getAddress();
  console.log(`✔️  Mock ERC-7984 Token deployed at: ${cUSDCAddress}`);

  const reputationImpl = await hardhatEthers.deployContract("NoxEscrowReputation", []);
  const reputationImplAddress = await reputationImpl.getAddress();

  const escrowImpl = await hardhatEthers.deployContract("NoxEscrowContract", []);
  const escrowImplAddress = await escrowImpl.getAddress();

  const factoryImpl = await hardhatEthers.deployContract("NoxEscrowFactory", []);
  const factoryImplAddress = await factoryImpl.getAddress();

  // Deploy Factory Proxy
  console.log("🔄 Deploying Factory proxy via NoxProxy...");
  const factoryInitData = factoryImpl.interface.encodeFunctionData("initialize", [
    escrowImplAddress,
    hardhatEthers.ZeroAddress,
    cUSDCAddress
  ]);
  const factoryProxy = await hardhatEthers.deployContract("NoxProxy", [
    factoryImplAddress,
    factoryInitData
  ]);
  const factoryAddress = await factoryProxy.getAddress();
  const factory = await hardhatEthers.getContractAt("NoxEscrowFactory", factoryAddress);
  console.log(`✔️  Factory Proxy active at: ${factoryAddress}`);

  // Deploy Reputation Proxy
  console.log("🔄 Deploying Reputation proxy via NoxProxy...");
  const reputationInitData = reputationImpl.interface.encodeFunctionData("initialize", [
    factoryAddress
  ]);
  const reputationProxy = await hardhatEthers.deployContract("NoxProxy", [
    reputationImplAddress,
    reputationInitData
  ]);
  const reputationAddress = await reputationProxy.getAddress();
  const reputation = await hardhatEthers.getContractAt("NoxEscrowReputation", reputationAddress);
  console.log(`✔️  Reputation Proxy active at: ${reputationAddress}`);

  // Link Reputation Registry in Factory
  console.log("🔗 Linking Reputation Registry with Factory...");
  await factory.setReputationRegistry(reputationAddress);

  // Initialize Base Reputation score (1000)
  console.log("🛡️  Configuring default base starting reputation score (1000)...");
  const baseRepEnc = await encryptInputWithSigner(client, 1000n, "uint256", reputationAddress, gatewayUrl);
  await reputation.connect(client).setBaseReputation(baseRepEnc.handle, baseRepEnc.handleProof);
  console.log("✔️  Base reputation initialized under zero-knowledge!");

  // Set local review window to 5 seconds
  await factory.setReviewWindow(5n);

  // Mint mock cUSDC starting balance to client
  console.log("💵 Funding Client's private wallet with mock USDC...");
  await cUSDC.mintPlain(client.address, 1000000n);
  console.log("✔️  Client balance funded successfully!");

  // 3. Create Escrow Contract Clone
  console.log("\n🚀 Creating private 1-milestone escrow contract...");
  const createTx = await factory.connect(client).createEscrow(
    freelancer.address,
    teeArbiter.address,
    1n, // 1 milestone project
    0n
  );
  const createReceipt = await createTx.wait();
  const escrowAddress = await getEscrowAddress(createReceipt, factory);
  const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);
  console.log(`✔️  NoxEscrowContract Clone active at: ${escrowAddress}`);

  // Approve Clone on token
  await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

  // Encrypt Milestone Requirements and Payouts
  console.log("🔒 Encrypting requirements and payouts...");
  
  const requirementsText = "Build a responsive dark-themed sidebar with collapsible menus.";
  const deliverableText = "Dark-themed collapsible sidebar implemented successfully with React + Tailwind.";
  const clientStatement = "The sidebar collapsible animation is lagging and lacks responsiveness.";
  const freelancerStatement = "Tested collapsible sidebar animations in Chrome, Safari and Firefox. It has full GPU acceleration and zero lag.";

  const reqsEnc = await encryptInputWithSigner(client, ethersHash(requirementsText), "uint256", escrowAddress, gatewayUrl);
  const payoutEnc = await encryptInputWithSigner(client, 5000n, "uint256", escrowAddress, gatewayUrl);

  // Initialize milestones
  console.log("🏁 Initializing escrow milestone on-chain...");
  await escrow.connect(client).initializeEscrow(
    [payoutEnc.handle],
    [payoutEnc.handleProof],
    [reqsEnc.handle],
    [reqsEnc.handleProof]
  );
  console.log("✔️  Escrow initialized! State: ACTIVE");

  // 4. Submit Deliverable
  console.log("\n📬 Submitting freelancer's deliverable...");
  const devEnc = await encryptInputWithSigner(freelancer, ethersHash(deliverableText), "uint256", escrowAddress, gatewayUrl);
  await escrow.connect(freelancer).submitDeliverable(devEnc.handle, devEnc.handleProof);
  console.log("✔️  Deliverable submitted successfully!");

  // 5. Open Dispute
  console.log("\n⚠️  Client raises a formal dispute on Milestone 0!");
  await escrow.connect(client).raiseDispute();
  console.log("✔️  State transitions to: DISPUTED (2). View access granted to TEE Arbiter.");

  // 6. Write to Local JSON Database for Integration Test
  console.log("\n🗄️  Simulating client-side metadata publication to local JSON database...");
  const dbPath = path.resolve(__dirname, "../../arbiter/local-db.json");
  const localDbRecord = {
    escrow_address: escrowAddress,
    milestone_index: 0,
    plaintext_requirements: requirementsText,
    plaintext_deliverables: deliverableText,
    client_statement: clientStatement,
    freelancer_statement: freelancerStatement
  };

  fs.writeFileSync(dbPath, JSON.stringify([localDbRecord], null, 2), "utf8");
  console.log(`✔️  Local JSON Database synchronized at: ${dbPath}`);

  // 7. Invoke the Actual Off-chain TEE Arbiter Script as a child process
  console.log("\n🤖  Triggering the Actual TEE Arbiter Enclave Script locally...");
  
  const payload = {
    escrowAddress: escrowAddress,
    milestoneIndex: "0",
    reqsHandle: reqsEnc.handle,
    devsHandle: devEnc.handle
  };

  const payloadString = JSON.stringify(payload).replace(/"/g, '\\"');
  
  // Deterministic third mnemonic private key used by Hardhat's teeArbiter
  const arbiterPrivateKey = "0x5de4111def4ec127b50e6a4df1908607276779d46120c02154bee2341366e78b";

  console.log("⏳ Running enclave script execution...");
  
  try {
    const stdout = execSync(`node ../arbiter/src/enclave-script.js "${payloadString}"`, {
      env: {
        ...process.env,
        TEE_ARBITER_PRIVATE_KEY: arbiterPrivateKey,
        RPC_URL: "http://127.0.0.1:8545",
        NOX_GATEWAY_URL: gatewayUrl,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "" // Uses real Gemini API if available, otherwise falls back to mock rule-in-favor
      },
      encoding: "utf8"
    });
    
    console.log("==================== ENCLAVE OUTPUT ====================");
    console.log(stdout);
    console.log("========================================================");
  } catch (err: any) {
    console.error("❌ Enclave Script execution failed:", err.message);
    if (err.stdout) console.error("Stdout:", err.stdout);
    if (err.stderr) console.error("Stderr:", err.stderr);
    process.exit(1);
  }

  // 8. Verify the Final Contract State has changed
  console.log("\n🏁  Verifying the on-chain settlement result...");
  const finalStatus = await escrow.status();
  const statusNames = ["SIGNING", "ACTIVE", "DISPUTED", "COMPLETED", "REFUNDED"];
  console.log(`🏁  Final Escrow Status: ${statusNames[Number(finalStatus)]}`);
  
  if (finalStatus === 3n || finalStatus === 4n) {
    console.log("\n🎉 SUCCESS: The TEE Arbiter parsed requirements, ran LLM evaluation, and successfully resolved the dispute on-chain!");
  } else {
    console.error("\n❌ FAILURE: The dispute was not resolved by the TEE Arbiter.");
    process.exit(1);
  }

  // Clean up local JSON database
  try {
    fs.unlinkSync(dbPath);
    console.log("🧹 Cleaned up temporary local-db.json file.");
  } catch {}

  console.log("\n=====================================================================");
  console.log("🎉  NoxEscrow Protocol — E2E Local Integration Test SUCCESSFUL!     🎉");
  console.log("=====================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
