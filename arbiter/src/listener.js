import { ethers } from "ethers";
import axios from "axios";
import http from "http";

// Environment variables with sensible defaults for local development
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
const IEXEC_RUNNER_ENDPOINT = process.env.IEXEC_RUNNER_ENDPOINT || "http://127.0.0.1:3000/trigger-task";

if (!FACTORY_ADDRESS) {
  console.error("❌ ERROR: ESCROW_FACTORY_ADDRESS environment variable is required.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ABI snippet for factory verification
const factoryABI = [
  "function isEscrowContract(address) view returns (bool)"
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
console.log("==========================================================\n");

// Filter to listen globally for the DisputeOpened event on any contract
// Topic 0: Keccak256 hash of "DisputeOpened(uint256,uint256,uint256)"
const DISPUTE_OPENED_TOPIC = ethers.id("DisputeOpened(uint256,uint256,uint256)");
const disputeFilter = {
  topics: [DISPUTE_OPENED_TOPIC]
};

async function main() {
  provider.on(disputeFilter, async (log) => {
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
  });

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
    server.close();
    provider.removeAllListeners();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("❌ Fatal error in Webhook Listener main loop:", err);
  process.exit(1);
});
