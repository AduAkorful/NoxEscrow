import { ethers } from "ethers";
import axios from "axios";
import http from "http";

// Environment variables strictly required or validated
const RPC_URL = process.env.RPC_URL;
const FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
const IEXEC_RUNNER_ENDPOINT = process.env.IEXEC_RUNNER_ENDPOINT;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "15000", 10);
const RECONCILIATION_INTERVAL = parseInt(process.env.RECONCILIATION_INTERVAL || "300000", 10);
const RUNNER_TIMEOUT = parseInt(process.env.IEXEC_RUNNER_TIMEOUT || "45000", 10);
const RECONCILE_COOLDOWN = parseInt(process.env.RECONCILE_COOLDOWN || "120000", 10);

if (!RPC_URL) {
  console.error("❌ ERROR: RPC_URL environment variable is required.");
  process.exit(1);
}

if (!FACTORY_ADDRESS) {
  console.error("❌ ERROR: ESCROW_FACTORY_ADDRESS environment variable is required.");
  process.exit(1);
}

if (!IEXEC_RUNNER_ENDPOINT) {
  console.error("❌ ERROR: IEXEC_RUNNER_ENDPOINT environment variable is required.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ABI snippet for factory verification and clone tracking
const factoryABI = [
  "function isEscrowContract(address) view returns (bool)",
  "function escrowsCount() view returns (uint256)",
  "function allEscrows(uint256) view returns (address)",
  "event EscrowCreated(address indexed escrowAddress, address indexed client, address indexed freelancer, uint256 totalMilestones)"
];

// ABI snippet for escrow clone event parsing and status querying
const escrowABI = [
  "event DisputeOpened(uint256 indexed milestoneIndex, uint256 requirementsHash, uint256 deliverableHash)",
  "function status() view returns (uint8)",
  "function activeMilestoneIndex() view returns (uint256)",
  "function milestones(uint256) view returns (bytes32 requirementsHash, bytes32 deliverableHash, bytes32 payoutHandle, uint128 submissionTime, bool isSubmitted, bool isSettled)"
];

async function reconcileDisputes(escrowClones, triggeredDisputes) {
  console.log(`\n🔄 [Reconciler] Running active dispute reconciliation scan over ${escrowClones.size} whitelisted contracts...`);
  const cloneList = Array.from(escrowClones);
  const chunkSize = 10;

  for (let i = 0; i < cloneList.length; i += chunkSize) {
    const chunk = cloneList.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (cloneAddress) => {
        try {
          const escrowContract = new ethers.Contract(cloneAddress, escrowABI, provider);
          const status = await escrowContract.status();
          
          if (Number(status) === 2) { // 2 = DISPUTED status enum
            const milestoneIndex = await escrowContract.activeMilestoneIndex();
            const milestoneIndexStr = milestoneIndex.toString();
            const key = `${cloneAddress.toLowerCase()}_${milestoneIndexStr}`;
            const lastTriggered = triggeredDisputes.get(key) || 0;
            const now = Date.now();
            
            if (now - lastTriggered > RECONCILE_COOLDOWN) { // Cooldown check
              console.log(`⚠️ [Reconciler] Detected active unresolved dispute on contract ${cloneAddress} Milestone ${milestoneIndexStr}. Re-triggering TEE Arbiter...`);
              const milestoneInfo = await escrowContract.milestones(milestoneIndex);
              const { requirementsHash, deliverableHash } = milestoneInfo;
              
              const reqsHex = typeof requirementsHash === "string" ? requirementsHash : `0x${BigInt(requirementsHash).toString(16).padStart(64, "0")}`;
              const devsHex = typeof deliverableHash === "string" ? deliverableHash : `0x${BigInt(deliverableHash).toString(16).padStart(64, "0")}`;
              
              triggeredDisputes.set(key, now);
              
              const response = await axios.post(IEXEC_RUNNER_ENDPOINT, {
                escrowAddress: cloneAddress,
                milestoneIndex: milestoneIndexStr,
                reqsHandle: reqsHex,
                devsHandle: devsHex
              }, { timeout: RUNNER_TIMEOUT });
              console.log(`🚀 [Reconciler] TEE execution triggered successfully! Response:`, response.status === 200 ? "Success" : response.statusText);
            }
          }
        } catch (err) {
          console.warn(`⚠️ [Reconciler] Failed to scan or reconcile clone ${cloneAddress}:`, err.message);
        }
      })
    );
  }
}

const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryABI, provider);

console.log("==========================================================");
console.log("🛡️  NoxEscrow Decentralized Webhook Listener Active  🛡️");
console.log(`📡 RPC Node: ${RPC_URL}`);
console.log(`🏭 Factory Address: ${FACTORY_ADDRESS}`);
console.log(`🚀 iExec TEE Trigger Endpoint: ${IEXEC_RUNNER_ENDPOINT}`);
console.log(`⏱️ Polling Interval: ${POLL_INTERVAL}ms`);
console.log(`⏱️ Reconciliation Interval: ${RECONCILIATION_INTERVAL}ms`);
console.log("==========================================================\n");

// Filter to listen globally for the DisputeOpened event on any contract
// Topic 0: Keccak256 hash of "DisputeOpened(uint256,uint256,uint256)"
const DISPUTE_OPENED_TOPIC = ethers.id("DisputeOpened(uint256,uint256,uint256)");
const ESCROW_CREATED_TOPIC = ethers.id("EscrowCreated(address,address,address,uint256)");

async function handleDisputeOpened(log) {
  try {
    const contractAddress = log.address;
    console.log(`\n🔔 Event detected! Log address: ${contractAddress}`);

    // 1. Verify that the contract is a legitimate clone deployed by our factory
    const isVerified = await factoryContract.isEscrowContract(contractAddress);
    if (!isVerified) {
      console.log(`⚠️ Ignored event from unauthorized contract: ${contractAddress}`);
      return;
    }

    console.log(`✔️ Verified escrow contract clone: ${contractAddress}`);

    // 2. Parse the DisputeOpened event parameters
    const escrowContract = new ethers.Contract(contractAddress, escrowABI, provider);
    const parsedLog = escrowContract.interface.parseLog(log);
    
    const { milestoneIndex, requirementsHash, deliverableHash } = parsedLog.args;
    console.log(`👉 Milestone Index: ${milestoneIndex}`);
    console.log(`👉 Requirements Handle: 0x${requirementsHash.toString(16)}`);
    console.log(`👉 Deliverable Handle: 0x${deliverableHash.toString(16)}`);

    // 3. Trigger the iExec TEE execution task
    console.log("⏳ Forwarding dispute details to the iExec TEE task runner...");
    const response = await axios.post(IEXEC_RUNNER_ENDPOINT, {
      escrowAddress: contractAddress,
      milestoneIndex: milestoneIndex.toString(),
      reqsHandle: `0x${BigInt(requirementsHash).toString(16).padStart(64, "0")}`,
      devsHandle: `0x${BigInt(deliverableHash).toString(16).padStart(64, "0")}`
    }, { timeout: RUNNER_TIMEOUT });

    console.log(`🚀 iExec TEE execution triggered successfully! Response:`, response.status === 200 ? "Success" : response.statusText);
  } catch (error) {
    console.error("❌ Error processing log event:", error.message);
  }
}

async function main() {
  let keepRunning = true;
  let lastProcessedBlock = null;
  let isPolling = false;
  const escrowClones = new Set();
  const triggeredDisputes = new Map();

  // On startup: load all existing escrow clones from the factory to construct initial whitelist
  try {
    const count = Number(await factoryContract.escrowsCount());
    console.log(`🔍 Initializing clone registry. Found ${count} existing escrow clones in factory.`);
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
      const chunk = [];
      for (let j = i; j < Math.min(i + batchSize, count); j++) {
        chunk.push(factoryContract.allEscrows(j));
      }
      const addresses = await Promise.all(chunk);
      for (const addr of addresses) {
        escrowClones.add(addr.toLowerCase());
      }
    }
    if (escrowClones.size > 0) {
      console.log(`✔️ Loaded ${escrowClones.size} clones into active whitelist.`);
    }
  } catch (err) {
    console.error("⚠️ Warning: Failed to load existing escrow clones from factory on startup:", err.message);
  }

  async function pollForEvents() {
    if (isPolling) return;
    isPolling = true;
    try {
      const latestBlock = await provider.getBlockNumber();
      
      if (lastProcessedBlock === null) {
        lastProcessedBlock = latestBlock;
        console.log(`📡 Block polling initialized. Starting from block: ${lastProcessedBlock}`);
        return;
      }

      if (latestBlock > lastProcessedBlock) {
        const fromBlock = lastProcessedBlock + 1;
        const toBlock = Math.min(latestBlock, fromBlock + 99); // Max 100 blocks per request
        
        console.log(`🔍 Polling blocks ${fromBlock} to ${toBlock} (latest: ${latestBlock})...`);
        
        // 1. Check for any newly created escrow clones from the factory
        const escrowCreatedLogs = await provider.getLogs({
          address: FACTORY_ADDRESS,
          topics: [ESCROW_CREATED_TOPIC],
          fromBlock,
          toBlock
        });

        for (const log of escrowCreatedLogs) {
          try {
            const parsed = factoryContract.interface.parseLog(log);
            const cloneAddress = parsed.args.escrowAddress.toLowerCase();
            if (!escrowClones.has(cloneAddress)) {
              console.log(`➕ Dynamic registry: Registered new escrow clone: ${cloneAddress}`);
              escrowClones.add(cloneAddress);
            }
          } catch (parseErr) {
            console.error("⚠️ Failed to parse EscrowCreated log:", parseErr.message);
          }
        }

        // 2. Check for formal disputes raised on any registered escrow clones
        if (escrowClones.size > 0) {
          const disputeLogs = await provider.getLogs({
            topics: [DISPUTE_OPENED_TOPIC],
            fromBlock,
            toBlock
          });

          for (const log of disputeLogs) {
            if (escrowClones.has(log.address.toLowerCase())) {
              await handleDisputeOpened(log);
            }
          }
        } else {
          console.log("ℹ️ Skipping dispute polling (no active escrow clones registered).");
        }

        lastProcessedBlock = toBlock;
      }
    } catch (error) {
      console.error("⚠️ Error during event polling:", error.message);
    } finally {
      isPolling = false;
    }
  }

  // Start polling loop
  const pollingIntervalId = setInterval(() => {
    if (keepRunning) {
      pollForEvents();
    }
  }, POLL_INTERVAL);

  // Start active dispute reconciliation loop
  const reconciliationIntervalId = setInterval(() => {
    if (keepRunning && escrowClones.size > 0) {
      reconcileDisputes(escrowClones, triggeredDisputes).catch((err) => {
        console.error("⚠️ Error in reconciliation loop:", err.message);
      });
    }
  }, RECONCILIATION_INTERVAL);

  // Run immediately once on start to initialize or catch up
  pollForEvents();

  // Simple HTTP Server for Render free-tier health checks
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("NoxEscrow Webhook Listener Active\n");
  });
  
  server.listen(PORT, () => {
    console.log(`🏥 Health Check server listening on port ${PORT}`);
  });

  // Handle process shutdown cleanly
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down listener gracefully...");
    keepRunning = false;
    clearInterval(pollingIntervalId);
    clearInterval(reconciliationIntervalId);
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("❌ Fatal error in Webhook Listener main loop:", err);
  process.exit(1);
});
