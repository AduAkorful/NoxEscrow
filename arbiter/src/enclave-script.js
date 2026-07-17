import { createEthersHandleClient } from "@iexec-nox/handle";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ethers } from "ethers";
import axios from "axios";
import crypto from "crypto";

// Load configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIVATE_KEY = process.env.TEE_ARBITER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const NOX_GATEWAY_URL = process.env.NOX_GATEWAY_URL || `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT || "8080"}`;
const NOX_SUBGRAPH_URL = process.env.NOX_SUBGRAPH_URL || "https://example.com/subgraphs/id/none";

// ABI for resolveDispute on NoxEscrowContract
const escrowABI = [
  "function resolveDispute(bool ruleInFavorOfFreelancer) external"
];

// AES-256-GCM Decryption Helper
function decryptPayload(ciphertextHex, keyHex, ivHex) {
  try {
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");

    // Standard WebCrypto AES-GCM package: last 16 bytes is the authentication tag
    const tag = ciphertext.subarray(ciphertext.length - 16);
    const encryptedData = ciphertext.subarray(0, ciphertext.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(`AES-GCM decryption failed: ${error.message}`);
  }
}

// Convert a hex string back to a readable UTF-8 string (stripping trailing null-bytes)
function hexToUtf8(hex) {
  try {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    const buf = Buffer.from(cleanHex, "hex");
    return buf.toString("utf8").replace(/\0+$/, "");
  } catch {
    return hex;
  }
}

async function main() {
  console.log("==========================================================");
  console.log("🤖  NoxEscrow Secure TEE AI Arbiter Enclave Script Active  🤖");
  console.log("==========================================================\n");

  // 1. Parse Input Parameters
  let payload = {};
  if (process.argv[2]) {
    try {
      payload = JSON.parse(process.argv[2]);
      console.log("📥 Loaded input payload from command line argument.");
    } catch {
      console.log("📥 Arguments provided are not JSON. Attempting env parsing...");
    }
  }

  const escrowAddress = payload.escrowAddress || process.env.ESCROW_ADDRESS;
  const milestoneIndex = payload.milestoneIndex || process.env.MILESTONE_INDEX;
  const reqsHandle = payload.reqsHandle || process.env.REQS_HANDLE;
  const devsHandle = payload.devsHandle || process.env.DEVS_HANDLE;

  if (!escrowAddress || milestoneIndex === undefined || !reqsHandle || !devsHandle) {
    console.error("❌ ERROR: Missing required input parameters.");
    console.error("Required: escrowAddress, milestoneIndex, reqsHandle, devsHandle");
    process.exit(1);
  }

  console.log(`📍 Escrow Contract: ${escrowAddress}`);
  console.log(`📍 Milestone Index: ${milestoneIndex}`);
  console.log(`📍 Requirements Handle: ${reqsHandle}`);
  console.log(`📍 Deliverables Handle: ${devsHandle}\n`);

  // 2. Setup Ethereum Signer & Nox Handle Client
  let wallet;
  let useLiveSigner = false;

  if (PRIVATE_KEY) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    useLiveSigner = true;
    console.log(`🔑 Connected to RPC node using TEE wallet address: ${wallet.address}`);
  } else {
    // Local testing or dry-run fallback
    wallet = ethers.Wallet.createRandom();
    console.log(`⚠️ No TEE_ARBITER_PRIVATE_KEY provided. Operating in DRY-RUN mode.`);
    console.log(`Generated transient dry-run wallet: ${wallet.address}`);
  }

  console.log(`🔗 Connecting to Nox Gateway: ${NOX_GATEWAY_URL}`);
  const handleClient = await createEthersHandleClient(wallet, {
    smartContractAddress: "0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685",
    gatewayUrl: NOX_GATEWAY_URL,
    subgraphUrl: NOX_SUBGRAPH_URL
  });

  // 3. Decrypt Handles using the Nox KMS
  console.log("🔓 Querying Nox KMS for handle decryption permissions...");
  let reqsDecryptedValue, devsDecryptedValue;
  try {
    const reqsDecrypted = await handleClient.decrypt(reqsHandle);
    reqsDecryptedValue = reqsDecrypted.value;
    console.log(`✔️ Decrypted requirements handle successfully.`);
  } catch (error) {
    console.error(`❌ Failed to decrypt requirements handle:`, error.message);
    process.exit(1);
  }

  try {
    const devsDecrypted = await handleClient.decrypt(devsHandle);
    devsDecryptedValue = devsDecrypted.value;
    console.log(`✔️ Decrypted deliverables handle successfully.`);
  } catch (error) {
    console.error(`❌ Failed to decrypt deliverables handle:`, error.message);
    process.exit(1);
  }

  const reqsHex = reqsDecryptedValue.toString(16).padStart(64, "0");
  const devsHex = devsDecryptedValue.toString(16).padStart(64, "0");

  // 4. Retrieve and Decrypt Milestone Payloads
  let plaintextRequirements = "";
  let plaintextDeliverables = "";
  let clientStatement = "None provided.";
  let freelancerStatement = "None provided.";
  let supabaseRecordFound = false;

  // Try to load from local JSON database first (Local Offline Testing Mode)
  try {
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve("/home/aduakorful/dev/NoxEscrow/arbiter/local-db.json");
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      const record = data.find(
        r => r.escrow_address.toLowerCase() === escrowAddress.toLowerCase() &&
             r.milestone_index === Number(milestoneIndex)
      );
      if (record) {
        supabaseRecordFound = true;
        console.log("🗄️ Local JSON database record matched successfully!");
        clientStatement = record.client_statement || clientStatement;
        freelancerStatement = record.freelancer_statement || freelancerStatement;
        
        // If local record contains raw plaintext, use it directly (offline mock)
        if (record.plaintext_requirements && record.plaintext_deliverables) {
          plaintextRequirements = record.plaintext_requirements;
          plaintextDeliverables = record.plaintext_deliverables;
          console.log("✔️ Loaded requirements & deliverables plaintext directly from local JSON database.");
        } else {
          // Fall back to decryption using local keys
          const reqsUrl = `https://gateway.pinata.cloud/ipfs/${record.reqs_cid}`;
          const devsUrl = `https://gateway.pinata.cloud/ipfs/${record.devs_cid}`;

          console.log(`📥 Downloading requirements from IPFS: ${reqsUrl}`);
          const reqsResp = await axios.get(reqsUrl);
          console.log(`📥 Downloading deliverables from IPFS: ${devsUrl}`);
          const devsResp = await axios.get(devsUrl);

          plaintextRequirements = decryptPayload(reqsResp.data.ciphertext, reqsHex, reqsResp.data.iv);
          plaintextDeliverables = decryptPayload(devsResp.data.ciphertext, devsHex, devsResp.data.iv);
          console.log("✔️ Plaintext deliverables and requirements decrypted successfully from IPFS payload.");
        }
      }
    }
  } catch (dbError) {
    console.warn("⚠️ Local database read skipped or failed:", dbError.message);
  }

  if (!supabaseRecordFound && SUPABASE_URL && SUPABASE_KEY) {
    console.log("🗄️ Supabase configuration detected. Querying metadata table...");
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: record, error } = await supabase
        .from("escrow_metadata")
        .select("*")
        .eq("escrow_address", escrowAddress.toLowerCase())
        .eq("milestone_index", Number(milestoneIndex))
        .single();

      if (error || !record) {
        console.log(`ℹ️ No Supabase metadata record found for ${escrowAddress} Milestone ${milestoneIndex}.`);
      } else {
        supabaseRecordFound = true;
        console.log("✔️ Metadata record fetched successfully. Resolving IPFS payloads...");
        
        clientStatement = record.client_statement || clientStatement;
        freelancerStatement = record.freelancer_statement || freelancerStatement;

        // Fetch encrypted payload from IPFS
        const reqsUrl = `https://gateway.pinata.cloud/ipfs/${record.reqs_cid}`;
        const devsUrl = `https://gateway.pinata.cloud/ipfs/${record.devs_cid}`;

        console.log(`📥 Downloading requirements from IPFS: ${reqsUrl}`);
        const reqsResp = await axios.get(reqsUrl);
        console.log(`📥 Downloading deliverables from IPFS: ${devsUrl}`);
        const devsResp = await axios.get(devsUrl);

        // Decrypt payload via AES-GCM using the decrypted keys
        plaintextRequirements = decryptPayload(reqsResp.data.ciphertext, reqsHex, reqsResp.data.iv);
        plaintextDeliverables = decryptPayload(devsResp.data.ciphertext, devsHex, devsResp.data.iv);
        console.log("✔️ Plaintext deliverables and requirements decrypted successfully from IPFS payload.");
      }
    } catch (dbError) {
      console.warn("⚠️ Failed to query metadata database:", dbError.message);
    }
  }

  // Fallback to direct ASCII conversion if no Supabase records exist (i.e. local unit/fuzz tests)
  if (!supabaseRecordFound) {
    console.log("🔄 falling back to direct hex-to-ASCII string recovery (Unit Test compatibility mode)...");
    plaintextRequirements = hexToUtf8(reqsHex);
    plaintextDeliverables = hexToUtf8(devsHex);
    
    console.log(`📝 Recovered Plaintext Requirements: "${plaintextRequirements}"`);
    console.log(`📝 Recovered Plaintext Deliverables: "${plaintextDeliverables}"`);
  }

  // Decode hex file deliverables to UTF-8 text if needed (e.g. if uploaded as file via dApp)
  if (plaintextDeliverables) {
    const cleanDevs = plaintextDeliverables.trim();
    // Check if cleanDevs is a valid hex string (even length, only hex chars)
    const isHex = cleanDevs.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(cleanDevs);
    if (isHex) {
      console.log("📝 Hex-encoded deliverable file detected. Decoding to readable UTF-8 text...");
      try {
        plaintextDeliverables = hexToUtf8(cleanDevs);
      } catch (err) {
        console.warn("⚠️ Failed to decode hex-encoded deliverable, proceeding with original string:", err.message);
      }
    }
  }

  // 5. Invoke Google Gemini 2.5 Flash
  let adjudicationVerdict = "REFUND_CLIENT";
  let adjudicationReasoning = "Automatic fallback due to model evaluation issue.";
  let evaluationScore = 0;

  if (GEMINI_API_KEY) {
    console.log("\n🤖 Initializing Google Gemini 2.5 Flash client...");
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const systemPrompt = `You are a highly analytical, objective, and expert Smart Contract and Software Engineering Auditor acting as the supreme arbiter for NoxEscrow.

Your task is to evaluate whether a freelancer's completed code meets the specified milestone requirements.

---
[SYSTEM EVALUATION RULES]
1. Read the Milestone Requirements carefully.
2. Examine the completed code deliverables.
3. Verify that all key criteria (compilation proofs, test coverage, functional requirements) are fully satisfied.
4. If the freelancer has successfully completed at least 90% of the core requirements and provided functional code, you MUST rule in favor of the freelancer (PAY_FREELANCER).
5. If there is a critical failure to deliver, non-functional code, or a complete lack of specified features, you MUST rule in favor of the client (REFUND_CLIENT).
6. Your response must follow this exact JSON structure:
   {
     "reasoning": "A concise, detailed summary of your assessment.",
     "score": 0-100,
     "verdict": "PAY_FREELANCER" or "REFUND_CLIENT"
   }
---`;

      const userContext = `
[MILESTONE REQUIREMENTS]
${plaintextRequirements}

[FREELANCER SUBMITTED CODE / DELIVERABLE]
${plaintextDeliverables}

[CLIENT REJECTION REASON]
${clientStatement}

[FREELANCER REBUTTAL]
${freelancerStatement}
`;

      console.log("⏳ Sending evaluation request to Gemini API...");
      const result = await model.generateContent([systemPrompt, userContext]);
      const responseText = result.response.text();

      console.log("📥 Response received from Gemini:");
      console.log(responseText);

      const responseJson = JSON.parse(responseText.trim());
      adjudicationVerdict = responseJson.verdict;
      adjudicationReasoning = responseJson.reasoning;
      evaluationScore = responseJson.score;

      console.log(`\n⚖️ Verdict: ${adjudicationVerdict} (Score: ${evaluationScore}/100)`);
      console.log(`⚖️ Reasoning: "${adjudicationReasoning}"\n`);
    } catch (aiError) {
      console.error("❌ Failed to evaluate dispute using Gemini API:", aiError.message);
      console.log("⚠️ Falling back to default refund action to protect client capital.");
    }
  } else {
    console.log("\n⚠️ GEMINI_API_KEY is missing. AI assessment skipped.");
    console.log("⚠️ Defaulting to mock evaluation: PAY_FREELANCER (ruled true for offline tests).");
    adjudicationVerdict = "PAY_FREELANCER";
    adjudicationReasoning = "Mock evaluation triggered. Offline local mode.";
  }

  const ruleInFavorOfFreelancer = (adjudicationVerdict === "PAY_FREELANCER");

  // 6. Broadcast Settlement Transaction
  if (useLiveSigner) {
    console.log(`🚀 Broadcasting resolveDispute(${ruleInFavorOfFreelancer}) to blockchain...`);
    try {
      const escrowContract = new ethers.Contract(escrowAddress, escrowABI, wallet);
      
      // Submit settlement transaction
      const tx = await escrowContract.resolveDispute(ruleInFavorOfFreelancer);
      console.log(`⏳ Transaction submitted! Hash: ${tx.hash}`);
      console.log("⏳ Waiting for transaction confirmation on-chain...");
      
      const receipt = await tx.wait();
      console.log(`✔️ Dispute Resolved successfully! block: ${receipt.blockNumber}`);
    } catch (txError) {
      console.error("❌ Failed to broadcast resolution transaction:", txError.message);
      process.exit(1);
    }
  } else {
    console.log("🚫 DRY-RUN: resolveDispute was NOT broadcasted to the network.");
    console.log(`Dry-run decision parameter: ruleInFavorOfFreelancer = ${ruleInFavorOfFreelancer}`);
  }

  console.log("\n🏁 Secure TEE AI Arbiter Execution Cycle Completed Successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error in TEE Enclave main execution flow:", err);
  process.exit(1);
});
