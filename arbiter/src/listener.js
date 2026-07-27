import { ethers } from "ethers";
import axios from "axios";
import http from "http";
import path from "path";
import { fork } from "child_process";

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

async function triggerTaskRunner(payload) {
  const PORT = process.env.PORT || 3000;
  const endpoint = IEXEC_RUNNER_ENDPOINT || `http://127.0.0.1:${PORT}/trigger-task`;
  const isLocal = endpoint.includes("127.0.0.1") || endpoint.includes("localhost");

  if (isLocal) {
    const localUrl = `http://127.0.0.1:${PORT}/trigger-task`;
    try {
      const response = await axios.post(localUrl, payload, { timeout: RUNNER_TIMEOUT });
      return response;
    } catch (err) {
      console.warn(`⚠️ Local HTTP trigger on port ${PORT} failed (${err.message}). Forking enclave script directly...`);
      return new Promise((resolve) => {
        const scriptPath = path.resolve("src/enclave-script.js");
        const child = fork(scriptPath, [JSON.stringify(payload)], {
          env: { ...process.env }
        });
        child.on("exit", (code) => {
          console.log(`🤖 [Task Runner] Enclave evaluation process exited with code ${code}`);
        });
        resolve({ status: 200, statusText: "Directly Forked" });
      });
    }
  } else {
    return await axios.post(endpoint, payload, { timeout: RUNNER_TIMEOUT });
  }
}

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
          const status = Number(await escrowContract.status());
          
          if (status === 3 || status === 4) { // 3 = COMPLETED, 4 = REFUNDED
            escrowClones.delete(cloneAddress);
            console.log(`🧹 [Reconciler] Pruned settled escrow clone from active scan list: ${cloneAddress}`);
          } else if (status === 2) { // 2 = DISPUTED status enum
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
              
              const response = await triggerTaskRunner({
                escrowAddress: cloneAddress,
                milestoneIndex: milestoneIndexStr,
                reqsHandle: reqsHex,
                devsHandle: devsHex
              });
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

async function handleDisputeOpened(log, triggeredDisputes) {
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
    const milestoneIndexStr = milestoneIndex.toString();
    const key = `${contractAddress.toLowerCase()}_${milestoneIndexStr}`;
    const now = Date.now();
    const lastTriggered = triggeredDisputes ? (triggeredDisputes.get(key) || 0) : 0;

    if (now - lastTriggered < RECONCILE_COOLDOWN) {
      console.log(`ℹ️ Dispute for ${key} was triggered recently (${Math.round((now - lastTriggered) / 1000)}s ago). Skipping duplicate trigger.`);
      return;
    }

    if (triggeredDisputes) {
      triggeredDisputes.set(key, now);
    }

    console.log(`👉 Milestone Index: ${milestoneIndex}`);
    console.log(`👉 Requirements Handle: 0x${requirementsHash.toString(16)}`);
    console.log(`👉 Deliverable Handle: 0x${deliverableHash.toString(16)}`);

    // 3. Trigger the iExec TEE execution task
    console.log("⏳ Forwarding dispute details to the iExec TEE task runner...");
    const response = await triggerTaskRunner({
      escrowAddress: contractAddress,
      milestoneIndex: milestoneIndexStr,
      reqsHandle: `0x${BigInt(requirementsHash).toString(16).padStart(64, "0")}`,
      devsHandle: `0x${BigInt(deliverableHash).toString(16).padStart(64, "0")}`
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

  const CONFIRMATION_BLOCKS = 6;
  const MAX_POLL_RANGE = 20; // 20 blocks max range per eth_getLogs call
  const MAX_ARCHIVE_LOOKBACK = 40; // Restrict lookback strictly to 40 recent blocks to avoid RPC archive node errors

  async function pollForEvents() {
    if (isPolling) return;
    isPolling = true;
    try {
      const chainLatest = await provider.getBlockNumber();
      const safeLatest = chainLatest - CONFIRMATION_BLOCKS;

      if (safeLatest <= 0) return;
      
      const maxLookback = Math.max(0, safeLatest - MAX_ARCHIVE_LOOKBACK);

      if (lastProcessedBlock === null || lastProcessedBlock < maxLookback) {
        lastProcessedBlock = maxLookback;
        console.log(`📡 Block polling initialized with ${CONFIRMATION_BLOCKS}-block safety depth. Starting from recent block: ${lastProcessedBlock}`);
      }

      if (safeLatest > lastProcessedBlock) {
        const fromBlock = lastProcessedBlock + 1;
        const toBlock = Math.min(safeLatest, fromBlock + (MAX_POLL_RANGE - 1)); // Max 20 blocks per request
        
        console.log(`🔍 Polling blocks ${fromBlock} to ${toBlock} (safe tip: ${safeLatest}, chain tip: ${chainLatest})...`);
        
        try {
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
        } catch (factoryLogErr) {
          console.warn(`⚠️ Warning fetching EscrowCreated logs (${fromBlock}..${toBlock}):`, factoryLogErr.message);
        }

        try {
          // 2. Check for formal disputes raised on any registered escrow clones
          if (escrowClones.size > 0) {
            const cloneAddresses = Array.from(escrowClones);
            const disputeLogs = await provider.getLogs({
              address: cloneAddresses.length === 1 ? cloneAddresses[0] : cloneAddresses,
              topics: [DISPUTE_OPENED_TOPIC],
              fromBlock,
              toBlock
            });

            for (const log of disputeLogs) {
              if (escrowClones.has(log.address.toLowerCase())) {
                await handleDisputeOpened(log, triggeredDisputes);
              }
            }
          }
        } catch (disputeLogErr) {
          console.warn(`⚠️ Warning fetching DisputeOpened logs (${fromBlock}..${toBlock}):`, disputeLogErr.message);
        }

        // Always advance pointer so polling is never stuck retrying past block ranges
        lastProcessedBlock = toBlock;
      }
    } catch (error) {
      console.error("⚠️ Error during event polling cycle:", error.message);
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

  // HTTP Server for Render health checks and local /trigger-task task runner
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/trigger-task") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          console.log("📥 [Task Runner] Received /trigger-task execution payload:", body);
          const payload = JSON.parse(body);
          
          const scriptPath = path.resolve("src/enclave-script.js");
          const child = fork(scriptPath, [JSON.stringify(payload)], {
            env: { ...process.env }
          });

          child.on("exit", (code) => {
            console.log(`🤖 [Task Runner] Enclave evaluation process exited with code ${code}`);
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "triggered", payload }));
        } catch (err) {
          console.error("❌ [Task Runner] Error executing trigger-task:", err.message);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("NoxEscrow Webhook Listener & Task Runner Active\n");
    }
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
