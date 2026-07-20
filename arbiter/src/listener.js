import { ethers } from "ethers";
import axios from "axios";
import http from "http";

// Environment variables with sensible defaults for local development
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
const IEXEC_RUNNER_ENDPOINT = process.env.IEXEC_RUNNER_ENDPOINT || "http://127.0.0.1:3000/trigger-task";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "15000", 10);

if (!FACTORY_ADDRESS) {
  console.error("❌ ERROR: ESCROW_FACTORY_ADDRESS environment variable is required.");
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

// ABI snippet for escrow clone event parsing
const escrowABI = [
  "event DisputeOpened(uint256 indexed milestoneIndex, uint256 requirementsHash, uint256 deliverableHash)"
];

const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryABI, provider);

console.log("==========================================================");
console.log("🛡️  NoxEscrow Decentralized Webhook Listener Active  🛡️");
console.log(`📡 RPC Node: ${RPC_URL}`);
console.log(`🏭 Factory Address: ${FACTORY_ADDRESS}`);
console.log(`🚀 iExec TEE Trigger Endpoint: ${IEXEC_RUNNER_ENDPOINT}`);
console.log(`⏱️ Polling Interval: ${POLL_INTERVAL}ms`);
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
      reqsHandle: `0x${requirementsHash.toString(16).padStart(64, "0")}`,
      devsHandle: `0x${deliverableHash.toString(16).padStart(64, "0")}`
    });

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

  // On startup: load all existing escrow clones from the factory to construct initial whitelist
  try {
    const count = await factoryContract.escrowsCount();
    console.log(`🔍 Initializing clone registry. Found ${count} existing escrow clones in factory.`);
    const fetchPromises = [];
    for (let i = 0; i < count; i++) {
      fetchPromises.push(factoryContract.allEscrows(i));
    }
    const addresses = await Promise.all(fetchPromises);
    for (const addr of addresses) {
      escrowClones.add(addr.toLowerCase());
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
            address: Array.from(escrowClones),
            topics: [DISPUTE_OPENED_TOPIC],
            fromBlock,
            toBlock
          });

          for (const log of disputeLogs) {
            await handleDisputeOpened(log);
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
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("❌ Fatal error in Webhook Listener main loop:", err);
  process.exit(1);
});
