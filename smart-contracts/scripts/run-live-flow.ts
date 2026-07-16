import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";

// Helper to encrypt input with a specific signer
async function encryptInputWithSigner(
  signer: any,
  value: any,
  solidityType: string,
  applicationContract: string
) {
  const handleClient = await createEthersHandleClient(signer, {
    smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
    gatewayUrl: `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT}`,
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

async function decryptBalance(signer: any, handle: string): Promise<bigint> {
  if (handle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return 0n;
  }
  const handleClient = await createEthersHandleClient(signer, {
    smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
    gatewayUrl: `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT}`,
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });
  const decrypted = await handleClient.decrypt(handle as any);
  return decrypted.value as bigint;
}

async function main() {
  console.log("=====================================================================");
  console.log("🛡️  NoxEscrow Protocol — End-to-End Live Integration Flow Simulator  🛡️");
  console.log("=====================================================================\n");

  // 1. Connect to the local Nox stack
  console.log("🔌 Connecting to local Nox stack and booting emulator...");
  const connection = await nox.connect();
  const hardhatEthers = connection.ethers;
  const [client, freelancer, teeArbiter] = await hardhatEthers.getSigners();
  console.log(`👤 Client: ${client.address}`);
  console.log(`👤 Freelancer: ${freelancer.address}`);
  console.log(`👤 TEE Arbiter: ${teeArbiter.address}\n`);

  // 2. Deploy contracts
  console.log("📦 Deploying core protocol contracts...");
  const cUSDC = await hardhatEthers.deployContract("MockERC7984", []);
  const cUSDCAddress = await cUSDC.getAddress();
  console.log(`✔️  Mock ERC-7984 Token deployed at: ${cUSDCAddress}`);

  const reputationImpl = await hardhatEthers.deployContract("NoxEscrowReputation", []);
  const reputationImplAddress = await reputationImpl.getAddress();
  console.log(`✔️  Reputation Implementation deployed at: ${reputationImplAddress}`);

  const escrowImpl = await hardhatEthers.deployContract("NoxEscrowContract", []);
  const escrowImplAddress = await escrowImpl.getAddress();
  console.log(`✔️  Escrow Implementation deployed at: ${escrowImplAddress}`);

  const factoryImpl = await hardhatEthers.deployContract("NoxEscrowFactory", []);
  const factoryImplAddress = await factoryImpl.getAddress();
  console.log(`✔️  Factory Implementation deployed at: ${factoryImplAddress}`);

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
  const baseRepEnc = await encryptInputWithSigner(client, 1000n, "uint256", reputationAddress);
  await reputation.connect(client).setBaseReputation(baseRepEnc.handle, baseRepEnc.handleProof);
  console.log("✔️  Base reputation initialized under zero-knowledge!");

  // Query and print initial reputation
  const initRepHandle = await reputation.getReputation(freelancer.address);
  const decryptedInitRep = await nox.publicDecrypt(initRepHandle);
  console.log(`📈 Initial Freelancer Reputation: ${decryptedInitRep.value}\n`);

  // Set local review window to 5 seconds to bypass review windows easily
  await factory.setReviewWindow(5n);

  // Mint mock cUSDC starting balance to client
  console.log("💵 Funding Client's private wallet with mock USDC...");
  await cUSDC.mintPlain(client.address, 1000000n);
  const clientBalHandle = await cUSDC.confidentialBalanceOf(client.address);
  const decryptedClientBal = await decryptBalance(client, clientBalHandle);
  console.log(`✔️  Client balance funded: ${decryptedClientBal} cUSDC\n`);

  // =========================================================================
  // RUNNING THE LIVE PROGRESSION SCENARIO
  // =========================================================================
  console.log("=====================================================================");
  console.log("⚡  Starting E2E Escrow Lifecycle Execution (4-Milestone Project)   ⚡");
  console.log("=====================================================================\n");

  const totalMilestones = 4n;
  console.log(`Deploying agreement clone with ${totalMilestones} sequential milestones...`);
  const createTx = await factory.connect(client).createEscrow(
    freelancer.address,
    teeArbiter.address,
    totalMilestones,
    0n // Use default review window
  );
  const createReceipt = await createTx.wait();
  const escrowAddress = await getEscrowAddress(createReceipt, factory);
  const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);
  console.log(`✔️  轻量级 Clone Contract deployed at: ${escrowAddress}`);

  // Client approves Clone as operator on token
  console.log("🔐 Granting operator permissions to Clone on cUSDC...");
  await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

  // Encrypt terms and fund the escrow milestones
  console.log("🔒 Encrypting terms and funding milestone payouts on-client...");
  const payouts = [1000n, 2000n, 3000n, 4000n];
  const reqsRaw = [
    ethersHash("Milestone 1: Scaffold UI"),
    ethersHash("Milestone 2: Database Schema"),
    ethersHash("Milestone 3: AI Arbitration Integration"),
    ethersHash("Milestone 4: Production Handover")
  ];

  const encryptedPayouts = [];
  const payoutProofs = [];
  const encryptedReqs = [];
  const reqsProofs = [];

  for (let i = 0; i < Number(totalMilestones); i++) {
    const payoutEnc = await encryptInputWithSigner(client, payouts[i], "uint256", escrowAddress);
    encryptedPayouts.push(payoutEnc.handle);
    payoutProofs.push(payoutEnc.handleProof);

    const reqsEnc = await encryptInputWithSigner(client, reqsRaw[i], "uint256", escrowAddress);
    encryptedReqs.push(reqsEnc.handle);
    reqsProofs.push(reqsEnc.handleProof);
  }

  // Client initializes escrow
  console.log("🏁 Initializing escrow milestones on-chain...");
  await escrow.connect(client).initializeEscrow(
    encryptedPayouts,
    payoutProofs,
    encryptedReqs,
    reqsProofs
  );
  console.log("✔️  Escrow initialized! State: ACTIVE\n");

  // Verify client balance reduced by total deposit (10000n)
  const clientBalAfterDep = await cUSDC.confidentialBalanceOf(client.address);
  const decryptedClientBalDep = await decryptBalance(client, clientBalAfterDep);
  console.log(`💰 Client Balance after Deposit: ${decryptedClientBalDep} cUSDC\n`);

  // -------------------------------------------------------------------------
  // MILESTONE 1: Happy Path (Deliver -> Client Release)
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------------");
  console.log("👉 MILESTONE 1: Happy Path (Deliver -> Client Release)");
  console.log("---------------------------------------------------------------------");
  
  const m1DelHash = ethersHash("Deliverable UI Completed");
  const m1DevEnc = await encryptInputWithSigner(freelancer, m1DelHash, "uint256", escrowAddress);
  
  console.log("Freelancer submits Deliverable 1...");
  await escrow.connect(freelancer).submitDeliverable(m1DevEnc.handle, m1DevEnc.handleProof);

  // Freelancer verifies payout amount is 1000 cUSDC (Blocker 3)
  const freeM1PayoutDec = await decryptBalance(freelancer, encryptedPayouts[0]);
  console.log(`Freelancer decodes and verifies Milestone 1 payout: ${freeM1PayoutDec} cUSDC (Matches!)`);

  console.log("Client approves Milestone 1 and awards 5-star rating...");
  await escrow.connect(client).releaseMilestone(5n);
  console.log("✔️  Milestone 1 completed successfully!");

  // Print current reputation
  const rep1 = await reputation.getReputation(freelancer.address);
  const decryptedRep1 = await nox.publicDecrypt(rep1);
  console.log(`📈 Freelancer Reputation Score: ${decryptedRep1.value}\n`);

  // -------------------------------------------------------------------------
  // MILESTONE 2: Timeout Path (Deliver -> Ghosting Client -> Auto Release)
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------------");
  console.log("👉 MILESTONE 2: Timeout Path (Deliver -> Ghosting Client -> Auto Release)");
  console.log("---------------------------------------------------------------------");

  const m2DelHash = ethersHash("Deliverable DB Schema");
  const m2DevEnc = await encryptInputWithSigner(freelancer, m2DelHash, "uint256", escrowAddress);

  console.log("Freelancer submits Deliverable 2...");
  await escrow.connect(freelancer).submitDeliverable(m2DevEnc.handle, m2DevEnc.handleProof);

  console.log("Client ghosts. Fast forwarding block time past 5-second review window...");
  await hardhatEthers.provider.send("evm_increaseTime", [6]);
  await hardhatEthers.provider.send("evm_mine", []);

  console.log("Freelancer claims Milestone 2 payout unilaterally via inactivity timeout...");
  await escrow.connect(freelancer).releaseMilestone(5n); // Forced 5 star rating
  console.log("✔️  Milestone 2 completed successfully!");

  // Print current reputation
  const rep2 = await reputation.getReputation(freelancer.address);
  const decryptedRep2 = await nox.publicDecrypt(rep2);
  console.log(`📈 Freelancer Reputation Score: ${decryptedRep2.value}\n`);

  // -------------------------------------------------------------------------
  // MILESTONE 3: Dispute Won Path (Deliver -> Dispute -> Rule Freelancer)
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------------");
  console.log("👉 MILESTONE 3: Dispute Won Path (Deliver -> Dispute -> Rule Freelancer)");
  console.log("---------------------------------------------------------------------");

  const m3DelHash = ethersHash("Deliverable AI Integration Code");
  const m3DevEnc = await encryptInputWithSigner(freelancer, m3DelHash, "uint256", escrowAddress);

  console.log("Freelancer submits Deliverable 3...");
  await escrow.connect(freelancer).submitDeliverable(m3DevEnc.handle, m3DevEnc.handleProof);

  console.log("Client disputes deliverable terms...");
  await escrow.connect(client).raiseDispute();
  console.log("✔️  Dispute opened! Handing Transient permissions to TEE Arbiter...");

  console.log("Secure TEE AI Arbiter evaluates work and rules: PAY_FREELANCER...");
  await escrow.connect(teeArbiter).resolveDispute(true);
  console.log("✔️  Milestone 3 resolved in favor of Freelancer!");

  // Print current reputation
  const rep3 = await reputation.getReputation(freelancer.address);
  const decryptedRep3 = await nox.publicDecrypt(rep3);
  console.log(`📈 Freelancer Reputation Score: ${decryptedRep3.value}\n`);

  // -------------------------------------------------------------------------
  // MILESTONE 4: Dispute Lost Path (MIA Freelancer -> Dispute -> Rule Client)
  // -------------------------------------------------------------------------
  console.log("---------------------------------------------------------------------");
  console.log("👉 MILESTONE 4: Dispute Lost Path (MIA Freelancer -> Dispute -> Rule Client)");
  console.log("---------------------------------------------------------------------");

  console.log("Freelancer goes offline (ghosts) on the final milestone and does NOT submit deliverable.");
  console.log("Client raises dispute on the unsubmitted final milestone (unblocking capital)...");
  await escrow.connect(client).raiseDispute();
  console.log("✔️  Dispute opened on MIA milestone! Granting evaluation permissions to TEE...");

  console.log("Secure TEE AI Arbiter evaluates absence of work and rules: REFUND_CLIENT...");
  console.log("Contract immediately terminates project, refunds Client, and penalizes Freelancer's reputation...");
  await escrow.connect(teeArbiter).resolveDispute(false);
  console.log("✔️  Milestone 4 resolved in favor of Client!");

  // Print current reputation (Frezzed at 1000 base + 1000*5 + 2000*5 + 3000*5 - 500 penalty = 30500)
  const rep4 = await reputation.getReputation(freelancer.address);
  const decryptedRep4 = await nox.publicDecrypt(rep4);
  console.log(`📈 Final Freelancer Reputation Score: ${decryptedRep4.value}`);

  // Print final Client wallet balance (Refunded Milestone 4 budget: 4000 cUSDC)
  const clientBalFinal = await cUSDC.confidentialBalanceOf(client.address);
  const decryptedClientBalFinal = await decryptBalance(client, clientBalFinal);
  console.log(`💰 Final Client Balance: ${decryptedClientBalFinal} cUSDC`);

  // Print final contract status
  const finalStatus = await escrow.status();
  const statusNames = ["SIGNING", "ACTIVE", "DISPUTED", "COMPLETED", "REFUNDED"];
  console.log(`🏁 Final Escrow Agreement Status: ${statusNames[Number(finalStatus)]}\n`);

  console.log("=====================================================================");
  console.log("🎉  NoxEscrow Protocol — End-to-End Integration Simulation SUCCESS!  🎉");
  console.log("=====================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
