import { expect } from "chai";
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

describe("NoxEscrow Core Protocol Suite", function () {
  let hardhatEthers: any;
  let client: any;
  let freelancer: any;
  let teeArbiter: any;
  let attacker: any;
  let cUSDC: any;
  let cUSDCAddress: string;
  let reputation: any;
  let reputationAddress: string;
  let escrowImpl: any;
  let escrowImplAddress: string;
  let factory: any;
  let factoryAddress: string;

  // Helper to decrypt balances safely, checking for zero handle (uninitialized mapping)
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

  before(async function () {
    // Connect to the local Nox stack
    const connection = await nox.connect();
    hardhatEthers = connection.ethers;
    [client, freelancer, teeArbiter, attacker] = await hardhatEthers.getSigners();
  });

  beforeEach(async function () {
    try {
      // Deploy clean contracts for each test run to ensure strict isolation
      cUSDC = await hardhatEthers.deployContract("MockERC7984", []);
      cUSDCAddress = await cUSDC.getAddress();

      // Deploy NoxEscrowReputation implementation
      const reputationImpl = await hardhatEthers.deployContract("NoxEscrowReputation", []);
      const reputationImplAddress = await reputationImpl.getAddress();

      // Deploy NoxEscrowContract template/implementation
      escrowImpl = await hardhatEthers.deployContract("NoxEscrowContract", []);
      escrowImplAddress = await escrowImpl.getAddress();

      // Deploy NoxEscrowFactory implementation
      const factoryImpl = await hardhatEthers.deployContract("NoxEscrowFactory", []);
      const factoryImplAddress = await factoryImpl.getAddress();

      // Deploy Factory Proxy initialized directly in the constructor (Ethers can now call this!)
      console.log("LOG: Deploying factory proxy...");
      const factoryInitData = factoryImpl.interface.encodeFunctionData("initialize", [
        escrowImplAddress,
        hardhatEthers.ZeroAddress, // Linked afterwards
        cUSDCAddress,
        teeArbiter.address,
        attacker.address
      ]);
      const factoryProxy = await hardhatEthers.deployContract("NoxProxy", [
        factoryImplAddress,
        factoryInitData
      ]);
      factoryAddress = await factoryProxy.getAddress();
      factory = await hardhatEthers.getContractAt("NoxEscrowFactory", factoryAddress);

      // Deploy Reputation Proxy initialized directly in the constructor (No external view calls inside initialization!)
      console.log("LOG: Deploying reputation proxy...");
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
      console.log("LOG: Linking reputation registry...");
      await factory.setReputationRegistry(reputationAddress);

      // Safely set the base reputation handle (1000) using EIP-712 proof
      console.log("LOG: Setting base reputation...");
      const baseRepEnc = await encryptInputWithSigner(client, 1000n, "uint256", reputationAddress);
      await reputation.connect(client).setBaseReputation(baseRepEnc.handle, baseRepEnc.handleProof);

      // Set a very small review window of 5 seconds to bypass review windows
      // without fast-forwarding block timestamp beyond the EIP-712 proof expiration
      console.log("LOG: Setting review window...");
      await factory.setReviewWindow(5n);

      // Mint starting funds to client
      await cUSDC.mintPlain(client.address, 1000000n);
      console.log("LOG: beforeEach completed successfully!");
    } catch (e) {
      console.error("LOG ERROR: beforeEach failed!", e);
      throw e;
    }
  });

  // =========================================================================
  // SECTION 1: RIGOROUS UNIT TESTS (CUSTOM ERRORS & BOUNDARY VALIDATION)
  // =========================================================================
  describe("1. Custom Error Boundaries & Gating", function () {
    
    it("should revert with InvalidFreelancer/InvalidArbiter etc during clone initialization checks", async function () {
      // Zero freelancer
      await expect(
        factory.connect(client).createEscrow(
          hardhatEthers.ZeroAddress,
          1n,
          0n
        )
      ).to.be.revertedWithCustomError(escrowImpl, "InvalidFreelancer");

      // Zero total milestones
      await expect(
        factory.connect(client).createEscrow(
          freelancer.address,
          0n,
          0n
        )
      ).to.be.revertedWithCustomError(escrowImpl, "InvalidMilestonesCount");
    });

    it("should prevent duplicate initialization on the same escrow contract", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

      // First initialization should succeed
      await escrow.connect(client).initializeEscrow(
        [payoutEnc.handle],
        [payoutEnc.handleProof],
        [reqsEnc.handle],
        [reqsEnc.handleProof]
      );

      // Try calling initializeEscrow again (should revert with InvalidState because state is no longer SIGNING)
      await expect(
        escrow.connect(client).initializeEscrow(
          [payoutEnc.handle],
          [payoutEnc.handleProof],
          [reqsEnc.handle],
          [reqsEnc.handleProof]
        )
      ).to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("should enforce correct array lengths in initializeEscrow", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        2n, // expects 2 milestones
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Only pass 1 payout instead of 2
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);

      await expect(
        escrow.connect(client).initializeEscrow(
          [payoutEnc.handle],
          [payoutEnc.handleProof],
          [reqsEnc.handle],
          [reqsEnc.handleProof]
        )
      ).to.be.revertedWithCustomError(escrow, "LengthMismatch");
    });

    it("should prevent non-client from initializing the escrow details", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);

      // Call from attacker address
      await expect(
        escrow.connect(attacker).initializeEscrow(
          [payoutEnc.handle],
          [payoutEnc.handleProof],
          [reqsEnc.handle],
          [reqsEnc.handleProof]
        )
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("should restrict deliverable submissions strictly to the designated freelancer", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const devEnc = await encryptInputWithSigner(client, ethersHash("deliv"), "uint256", escrowAddress);
      
      // Submit from client (unauthorized)
      await expect(
        escrow.connect(client).submitDeliverable(devEnc.handle, devEnc.handleProof)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");

      // Submit from attacker (unauthorized)
      await expect(
        escrow.connect(attacker).submitDeliverable(devEnc.handle, devEnc.handleProof)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("should prevent submitting deliverable twice for the same milestone", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const dev1 = await encryptInputWithSigner(freelancer, ethersHash("deliv1"), "uint256", escrowAddress);
      const dev2 = await encryptInputWithSigner(freelancer, ethersHash("deliv2"), "uint256", escrowAddress);

      // First submit
      await escrow.connect(freelancer).submitDeliverable(dev1.handle, dev1.handleProof);

      // Second submit should revert
      await expect(
        escrow.connect(freelancer).submitDeliverable(dev2.handle, dev2.handleProof)
      ).to.be.revertedWithCustomError(escrow, "AlreadySubmitted");
    });

    it("should prevent client from releasing with invalid ratings", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const dev = await encryptInputWithSigner(freelancer, ethersHash("deliv"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev.handle, dev.handleProof);

      // Rating: 0 (invalid)
      await expect(
        escrow.connect(client).releaseMilestone(0n)
      ).to.be.revertedWithCustomError(escrow, "InvalidRating");

      // Rating: 6 (invalid)
      await expect(
        escrow.connect(client).releaseMilestone(6n)
      ).to.be.revertedWithCustomError(escrow, "InvalidRating");
    });

    it("should prevent freelancer from claiming milestone before review window has passed", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const dev = await encryptInputWithSigner(freelancer, ethersHash("deliv"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev.handle, dev.handleProof);

      // Freelancer tries to release immediately (window has not passed)
      await expect(
        escrow.connect(freelancer).releaseMilestone(5n)
      ).to.be.revertedWithCustomError(escrow, "ReviewWindowNotExpired");
    });

    it("should prevent raising dispute after the review window has expired", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const dev = await encryptInputWithSigner(freelancer, ethersHash("deliv"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev.handle, dev.handleProof);

      // Fast forward past review window (5 seconds configured)
      await hardhatEthers.provider.send("evm_increaseTime", [6]);
      await hardhatEthers.provider.send("evm_mine", []);

      // Client tries to raise dispute after review window
      await expect(
        escrow.connect(client).raiseDispute()
      ).to.be.revertedWithCustomError(escrow, "ReviewWindowExpired");
    });

    it("should enforce that only the designated TEE Arbiter address can resolve a dispute", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 100n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      const dev = await encryptInputWithSigner(freelancer, ethersHash("deliv"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev.handle, dev.handleProof);

      // Raise dispute
      await escrow.connect(client).raiseDispute();

      // Attacker tries to resolve dispute
      await expect(
        escrow.connect(attacker).resolveDispute(true)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("should restrict global reputation modifications strictly to the authorized factory or registered clone escrows", async function () {
      const fakePayout = await encryptInputWithSigner(client, 1000n, "uint256", reputationAddress);
      
      // Attacker calls addCompletedMilestone directly on reputation
      await expect(
        reputation.connect(attacker).addCompletedMilestone(freelancer.address, fakePayout.handle, 5n)
      ).to.be.revertedWithCustomError(reputation, "UnauthorizedCaller");

      // Attacker calls penalizeLostDispute directly on reputation
      await expect(
        reputation.connect(attacker).penalizeLostDispute(freelancer.address)
      ).to.be.revertedWithCustomError(reputation, "UnauthorizedCaller");
    });

    it("should allow a client to raise a dispute even if the freelancer is inactive (Ghosting/MIA)", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 1000n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      // Freelancer does NOT submit deliverable (MIA)
      // Client raises dispute unilaterally to unlock funds
      await expect(escrow.connect(client).raiseDispute()).to.emit(escrow, "DisputeOpened");

      // Verify state is DISPUTED (2)
      expect(await escrow.status()).to.equal(2n);

      // Arbiter resolves in favor of Client (refunding client)
      await escrow.connect(teeArbiter).resolveDispute(false);

      // Verify contract clone enters REFUNDED (4)
      expect(await escrow.status()).to.equal(4n);
    });

    it("should allow mutual cancellation of active escrow by both parties", async function () {
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 1000n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      // Client requests cancel
      await escrow.connect(client).mutualCancel();

      // Freelancer requests cancel, triggering full refund
      await expect(escrow.connect(freelancer).mutualCancel()).to.emit(escrow, "MutualCancellationExecuted");

      // Verify final status is REFUNDED (4)
      expect(await escrow.status()).to.equal(4n);
    });

    it("should respect the mutual cancel window and expire outstanding cancellation requests after the window passes", async function () {
      // Configure mutualCancelWindow in factory to 5 seconds
      await factory.connect(client).setMutualCancelWindow(5n);

      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        1n,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Initialize
      const payoutEnc = await encryptInputWithSigner(client, 1000n, "uint256", escrowAddress);
      const reqsEnc = await encryptInputWithSigner(client, ethersHash("req"), "uint256", escrowAddress);
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));
      await escrow.connect(client).initializeEscrow([payoutEnc.handle], [payoutEnc.handleProof], [reqsEnc.handle], [reqsEnc.handleProof]);

      // Client requests cancel
      await escrow.connect(client).mutualCancel();

      // Fast-forward 6 seconds (beyond 5 second window)
      await hardhatEthers.provider.send("evm_increaseTime", [6]);
      await hardhatEthers.provider.send("evm_mine", []);

      // Freelancer requests cancel. Since Client's request expired, it should NOT execute mutual cancellation, and contract status should remain ACTIVE (1)
      await escrow.connect(freelancer).mutualCancel();
      expect(await escrow.status()).to.equal(1n); // Status.ACTIVE

      // Client requests cancel again (this time within the new freelancer request's 5s window)
      await expect(escrow.connect(client).mutualCancel()).to.emit(escrow, "MutualCancellationExecuted");

      // Verify final status is REFUNDED (4)
      expect(await escrow.status()).to.equal(4n);
    });

    it("should allow configuring the mutualCancelWindow by the owner on the factory", async function () {
      // Set to 10 seconds
      await factory.connect(client).setMutualCancelWindow(10n);
      expect(await factory.mutualCancelWindow()).to.equal(10n);

      // Prevent non-owner from setting mutualCancelWindow
      await expect(
        factory.connect(attacker).setMutualCancelWindow(20n)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  // =========================================================================
  // SECTION 2: DIFFERENTIAL SIMULATION & FUZZ TESTS
  // =========================================================================
  describe("2. Fuzzing & Differential Simulation Matrix", function () {
    
    it("should correctly compile reputation scores across multiple randomized milestone releases", async function () {
      const totalMilestones = 5n;
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        totalMilestones,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Set operator
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

      // Generate randomized payouts (between 500 and 3000 cUSDC) and ratings (between 1 and 5)
      // to fuzz state boundaries and verify differential consistency
      const fuzzPayouts: bigint[] = [];
      const fuzzRatings: bigint[] = [];
      const milestoneReqsRaw: bigint[] = [];

      for (let i = 0; i < Number(totalMilestones); i++) {
        const payout = BigInt(500 + (i * 350) + (i % 2 === 0 ? 120 : 0));
        const rating = BigInt(1 + ((i * 2) % 5)); // Outputs ratings between 1 and 5
        fuzzPayouts.push(payout);
        fuzzRatings.push(rating);
        milestoneReqsRaw.push(ethersHash(`Fuzz Requirements Index ${i}`));
      }

      // Encrypt inputs
      const encryptedPayouts = [];
      const payoutProofs = [];
      const encryptedReqs = [];
      const reqsProofs = [];

      for (let i = 0; i < Number(totalMilestones); i++) {
        const payoutEnc = await encryptInputWithSigner(client, fuzzPayouts[i], "uint256", escrowAddress);
        encryptedPayouts.push(payoutEnc.handle);
        payoutProofs.push(payoutEnc.handleProof);

        const reqsEnc = await encryptInputWithSigner(client, milestoneReqsRaw[i], "uint256", escrowAddress);
        encryptedReqs.push(reqsEnc.handle);
        reqsProofs.push(reqsEnc.handleProof);
      }

      // Initialize
      await escrow.connect(client).initializeEscrow(
        encryptedPayouts,
        payoutProofs,
        encryptedReqs,
        reqsProofs
      );

      // Trace expected cumulative reputation score
      let expectedReputation = 1000n; // Base reputation

      // Run sequential fuzzed progression
      for (let i = 0; i < Number(totalMilestones); i++) {
        const delivHash = ethersHash(`Fuzz Deliverable Index ${i}`);
        const devEnc = await encryptInputWithSigner(freelancer, delivHash, "uint256", escrowAddress);
        
        // Freelancer submits deliverable
        await escrow.connect(freelancer).submitDeliverable(devEnc.handle, devEnc.handleProof);

        // Verify freelancer can decrypt the payout handle (Blocker 3 check)
        const freeDecryptedPayout = await decryptBalance(freelancer, encryptedPayouts[i]);
        expect(freeDecryptedPayout).to.equal(fuzzPayouts[i]);

        // Client releases with the randomized rating
        await escrow.connect(client).releaseMilestone(fuzzRatings[i]);

        // Accumulate expected score (accounting for 0.5% platform fee deduction)
        const fee = (fuzzPayouts[i] * 50n) / 10000n;
        const netPayout = fuzzPayouts[i] - fee;
        expectedReputation += netPayout * fuzzRatings[i];

        // Fetch on-chain reputation and verify differential consistency
        const repHandle = await reputation.getReputation(freelancer.address);
        const repDecrypted = await nox.publicDecrypt(repHandle);
        expect(repDecrypted.value).to.equal(expectedReputation);
      }

      // Verify final escrow state is COMPLETED (3)
      expect(await escrow.status()).to.equal(3n);
    });
  });

  // =========================================================================
  // SECTION 3: INVARIANT VERIFICATION TESTS
  // =========================================================================
  describe("3. Protocol-Level Invariants Preservation", function () {
    
    it("should guarantee double-spend prevention and automatic abortion on lost disputes (Invariants A, B, and C)", async function () {
      const totalMilestones = 3n;
      const createTx = await factory.connect(client).createEscrow(
        freelancer.address,
        totalMilestones,
        0n
      );
      const receipt = await createTx.wait();
      const escrowAddress = await getEscrowAddress(receipt, factory);
      const escrow = await hardhatEthers.getContractAt("NoxEscrowContract", escrowAddress);

      // Invariant C: Factory escrows count is consistent
      const initialEscrowsCount = await factory.escrowsCount();
      expect(await factory.allEscrows(initialEscrowsCount - 1n)).to.equal(escrowAddress);

      // Set operator
      await cUSDC.connect(client).setOperator(escrowAddress, uint48(Math.floor(Date.now() / 1000) + 3600));

      const milestonePayoutsAmount = [1000n, 2000n, 3000n];
      const totalMilestoneBudgetSum = 6000n; // Sum of payouts
      const milestoneReqsRaw = [ethersHash("R1"), ethersHash("R2"), ethersHash("R3")];

      const encryptedPayouts = [];
      const payoutProofs = [];
      const encryptedReqs = [];
      const reqsProofs = [];

      for (let i = 0; i < Number(totalMilestones); i++) {
        const payoutEnc = await encryptInputWithSigner(client, milestonePayoutsAmount[i], "uint256", escrowAddress);
        encryptedPayouts.push(payoutEnc.handle);
        payoutProofs.push(payoutEnc.handleProof);

        const reqsEnc = await encryptInputWithSigner(client, milestoneReqsRaw[i], "uint256", escrowAddress);
        encryptedReqs.push(reqsEnc.handle);
        reqsProofs.push(reqsEnc.handleProof);
      }

      // 1. Initial State: Client balance is 1000000 cUSDC
      const clientBalBefore = await cUSDC.confidentialBalanceOf(client.address);
      const decryptedClientBalBefore = await decryptBalance(client, clientBalBefore);
      expect(decryptedClientBalBefore).to.equal(1000000n);

      // 2. Client Deposits: Client balance decreases by totalMilestoneBudgetSum (6000)
      await escrow.connect(client).initializeEscrow(
        encryptedPayouts,
        payoutProofs,
        encryptedReqs,
        reqsProofs
      );

      // Invariant A (Budget Conservation): Client balance is exactly 994000
      const clientBalAfterDep = await cUSDC.confidentialBalanceOf(client.address);
      const decryptedClientBalAfterDep = await decryptBalance(client, clientBalAfterDep);
      expect(decryptedClientBalAfterDep).to.equal(1000000n - totalMilestoneBudgetSum);

      // 3. Complete Milestone 1 (Freelancer paid 1000, client balance remains unchanged at 994000)
      const dev1 = await encryptInputWithSigner(freelancer, ethersHash("D1"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev1.handle, dev1.handleProof);
      await escrow.connect(client).releaseMilestone(5n);

      const clientBalAfterM1 = await cUSDC.confidentialBalanceOf(client.address);
      const decryptedClientBalAfterM1 = await decryptBalance(client, clientBalAfterM1);
      expect(decryptedClientBalAfterM1).to.equal(994000n);

      // 4. Milestone 2 - Dispute Refunded (Rule Client, client gets refunded 2000 cUSDC)
      const dev2 = await encryptInputWithSigner(freelancer, ethersHash("D2"), "uint256", escrowAddress);
      await escrow.connect(freelancer).submitDeliverable(dev2.handle, dev2.handleProof);
      await escrow.connect(client).raiseDispute();
      
      // TEE Arbiter rules Client (refunds 2000 cUSDC to client)
      // Because client won, the contract aborts immediately and refunds ALL remaining milestone deposits (2000 + 3000 = 5000 refund total)
      await escrow.connect(teeArbiter).resolveDispute(false);

      // Invariant A: Client received the full remaining 5000 cUSDC refund (994000 previous + 5000 refund = 999000)
      const clientBalAfterM2 = await cUSDC.confidentialBalanceOf(client.address);
      const decryptedClientBalAfterM2 = await decryptBalance(client, clientBalAfterM2);
      expect(decryptedClientBalAfterM2).to.equal(999000n);

      // Invariant B: Freelancer lost reputation on lost dispute (5975 after M1 - 500 penalty = 5475)
      const repHandle = await reputation.getReputation(freelancer.address);
      const repDecrypted = await nox.publicDecrypt(repHandle);
      expect(repDecrypted.value).to.equal(5475n);

      // Final status is REFUNDED (4) since the project was terminated early on lost dispute
      expect(await escrow.status()).to.equal(4n);
    });
  });
});
