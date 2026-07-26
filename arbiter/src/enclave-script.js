import { createEthersHandleClient } from "@iexec-nox/handle";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { ethers } from "ethers";
import axios from "axios";
import crypto from "crypto";

// Load configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIVATE_KEY = process.env.TEE_ARBITER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const NOX_GATEWAY_URL = process.env.NOX_GATEWAY_URL;
const NOX_SUBGRAPH_URL = process.env.NOX_SUBGRAPH_URL;

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

// Helper to parse and decrypt files referenced in metadata JSON objects
async function parseAndResolveJsonPayload(payloadText, decryptionHexKey) {
  try {
    const parsed = JSON.parse(payloadText.trim());
    let resolvedText = parsed.text || "";
    
    if (parsed.files && Array.isArray(parsed.files) && parsed.files.length > 0) {
      resolvedText += "\n\n--- [ATTACHED FILES DETECTED] ---";
      for (const file of parsed.files) {
        try {
          console.log(`📥 [Arbiter Enclave] Downloading and decrypting attachment: ${file.name} (${file.cid})`);
          const fileData = await downloadFromIPFS(file.cid);
          const decryptedHex = decryptPayload(fileData.ciphertext, decryptionHexKey, fileData.iv);
          const decryptedContent = hexToUtf8(decryptedHex);
          
          resolvedText += `\n\nFile Name: ${file.name}\nFile Content:\n\`\`\`\n${decryptedContent}\n\`\`\n`;
        } catch (fileErr) {
          console.warn(`⚠️ [Arbiter Enclave] Failed to decrypt attachment ${file.name}:`, fileErr.message);
          resolvedText += `\n\nFile Name: ${file.name}\n[Unable to decrypt file content: ${fileErr.message}]`;
        }
      }
    }
    return resolvedText;
  } catch (err) {
    // If not JSON, return the original plaintext string directly
    return payloadText;
  }
}

// Helper to download JSON payload from IPFS with failover gateways & Data URI handling
async function downloadFromIPFS(cid) {
  if (!cid) {
    throw new Error("Invalid CID parameter.");
  }

  // Handle inline Data URIs directly
  if (cid.startsWith("data:")) {
    try {
      console.log("📥 Resolving inline Data URI payload...");
      const base64Data = cid.split(",")[1];
      const jsonStr = Buffer.from(base64Data, "base64").toString("utf8");
      return JSON.parse(jsonStr);
    } catch (dataUriErr) {
      throw new Error(`Failed to parse inline Data URI payload: ${dataUriErr.message}`);
    }
  }

  const pinataJwt = process.env.PINATA_JWT || process.env.VITE_PINATA_JWT;
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];

  const fetchGateway = async (url) => {
    const headers = {};
    if (pinataJwt && url.includes("pinata.cloud")) {
      headers["Authorization"] = `Bearer ${pinataJwt}`;
    }
    const resp = await axios.get(url, { headers, timeout: 10000 });
    if (resp.status === 200 && resp.data) {
      return resp.data;
    }
    throw new Error(`Non-200 response from gateway ${url}`);
  };

  try {
    console.log(`📥 Downloading IPFS payload in parallel across ${gateways.length} gateways...`);
    const data = await Promise.any(gateways.map(url => fetchGateway(url)));
    return data;
  } catch (err) {
    throw new Error(`Failed to download from all IPFS gateways for CID ${cid}.`);
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

  const isLocalNetwork = RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost") || RPC_URL.includes("31337") || process.env.LOCAL_DRY_RUN === "true";

  if (PRIVATE_KEY) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    useLiveSigner = true;
    console.log(`🔑 Connected to RPC node using TEE wallet address: ${wallet.address}`);
  } else {
    if (!isLocalNetwork) {
      console.error("❌ FATAL ERROR: Missing TEE_ARBITER_PRIVATE_KEY on public network! Preventing silent dry-run.");
      process.exit(1);
    }
    // Local testing or dry-run fallback
    wallet = ethers.Wallet.createRandom();
    console.log(`⚠️ No TEE_ARBITER_PRIVATE_KEY provided. Operating in DRY-RUN mode.`);
    console.log(`Generated transient dry-run wallet: ${wallet.address}`);
  }

  console.log(`🔗 Connecting to Nox Gateway: ${NOX_GATEWAY_URL}`);
  const handleClient = await createEthersHandleClient(wallet, {
    smartContractAddress: process.env.NOX_CONTRACT_MANAGER,
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
    const dbPath = path.resolve(process.cwd(), "local-db.json");
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
          const reqsData = await downloadFromIPFS(record.reqs_cid);
          plaintextRequirements = decryptPayload(reqsData.ciphertext, reqsHex, reqsData.iv);

          if (record.devs_cid && record.devs_cid !== "null" && record.devs_cid !== "undefined") {
            const devsData = await downloadFromIPFS(record.devs_cid);
            plaintextDeliverables = decryptPayload(devsData.ciphertext, devsHex, devsData.iv);
          } else {
            plaintextDeliverables = "No deliverables submitted for this milestone.";
          }
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
        const reqsData = await downloadFromIPFS(record.reqs_cid);
        plaintextRequirements = decryptPayload(reqsData.ciphertext, reqsHex, reqsData.iv);

        if (record.devs_cid && record.devs_cid !== "null" && record.devs_cid !== "undefined") {
          const devsData = await downloadFromIPFS(record.devs_cid);
          plaintextDeliverables = decryptPayload(devsData.ciphertext, devsHex, devsData.iv);
        } else {
          plaintextDeliverables = "No deliverables submitted for this milestone.";
        }
        console.log("✔️ Plaintext deliverables and requirements decrypted successfully from IPFS payload.");
      }
    } catch (dbError) {
      console.warn("⚠️ Failed to query metadata database:", dbError.message);
    }
  }

  // Fallback to direct ASCII conversion if no Supabase records exist (i.e. local unit/fuzz tests)
  if (!supabaseRecordFound) {
    if (SUPABASE_URL && SUPABASE_KEY) {
      console.error("❌ ERROR: Metadata record not found in database in production mode!");
      console.error("Preventing direct hex-to-ASCII recovery of AES keys to protect system integrity.");
      process.exit(1);
    }
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

  // Parse JSON payloads to extract texts and resolve any embedded confidential file attachments
  console.log("🔍 Parsing metadata JSON payloads and resolving any encrypted file attachments...");
  plaintextRequirements = await parseAndResolveJsonPayload(plaintextRequirements, reqsHex);
  plaintextDeliverables = await parseAndResolveJsonPayload(plaintextDeliverables, devsHex);

  // 5. Invoke Google Gemini 2.5 Flash
  let adjudicationVerdict = "REFUND_CLIENT";
  let adjudicationReasoning = "Automatic fallback due to model evaluation issue.";
  let evaluationScore = 0;

  // --- Hybrid Google Gen AI SDK Initialization (AI Studio Key or local GCP ADC) ---
  const useGcpADC = !GEMINI_API_KEY || !GEMINI_API_KEY.startsWith("AIzaSy");
  
  if (GEMINI_API_KEY || useGcpADC) {
    try {
      let ai;
      if (!useGcpADC) {
        console.log("\n🤖 Initializing Google Gemini 2.5 Flash client via Google AI Studio API Key...");
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      } else {
        console.log("\n🤖 Initializing Google Gemini 2.5 Flash client via local Application Default Credentials (ADC) Vertex AI...");
        ai = new GoogleGenAI({
          vertex: true,
          project: process.env.VERTEX_PROJECT_ID,
          location: process.env.VERTEX_LOCATION
        });
      }

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

      console.log("⏳ Sending evaluation request to Gemini API (gemini-2.5-flash)...");
      
      let result;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: userContext }
                ]
              }
            ],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  reasoning: { type: "STRING" },
                  score: { type: "INTEGER" },
                  verdict: { type: "STRING", enum: ["PAY_FREELANCER", "REFUND_CLIENT"] }
                },
                required: ["reasoning", "score", "verdict"]
              }
            }
          });
          break;
        } catch (apiError) {
          console.warn(`⚠️ Gemini API attempt ${attempt}/${maxRetries} failed:`, apiError.message);
          if (attempt === maxRetries) throw apiError;
          await new Promise(res => setTimeout(res, attempt * 2000));
        }
      }

      const responseText = result.text;

      console.log("📥 Response received from Gemini:");
      console.log(responseText);

      try {
        const responseJson = JSON.parse(responseText.trim());
        
        if (!responseJson.verdict || !["PAY_FREELANCER", "REFUND_CLIENT"].includes(responseJson.verdict)) {
          throw new Error(`Invalid verdict returned by LLM: ${responseJson.verdict}`);
        }
        
        if (typeof responseJson.score !== "number" || responseJson.score < 0 || responseJson.score > 100) {
          console.warn("⚠️ Score outside bounds [0-100]. Resetting to 0.");
          responseJson.score = 0;
        }

        if (!responseJson.reasoning || typeof responseJson.reasoning !== "string") {
          responseJson.reasoning = "No reasoning provided by AI arbiter.";
        }

        adjudicationVerdict = responseJson.verdict;
        adjudicationReasoning = responseJson.reasoning;
        evaluationScore = Math.max(0, Math.min(100, Math.floor(responseJson.score)));

        console.log(`\n⚖️ Validated Verdict: ${adjudicationVerdict} (Score: ${evaluationScore}/100)`);
        console.log(`⚖️ Reasoning: "${adjudicationReasoning}"\n`);
      } catch (parseError) {
        console.error("❌ Invalid JSON or malformed format returned by Gemini:", parseError.message);
        if (!isLocalNetwork) {
          console.error("❌ FATAL: Malformed AI output on live network. Aborting to protect contract state.");
          process.exit(1);
        }
        console.log("⚠️ [Local Fallback] Reverting to safe fallback: REFUND_CLIENT to protect client capital.");
        adjudicationVerdict = "REFUND_CLIENT";
        adjudicationReasoning = "Dispute resolution automatically resolved due to malformed evaluation output.";
        evaluationScore = 0;
      }
    } catch (aiError) {
      console.error("❌ Failed to evaluate dispute using Gemini API:", aiError.message);
      if (!isLocalNetwork) {
        console.error("❌ FATAL: AI API failure on live network. Aborting to protect contract state.");
        process.exit(1);
      }
      console.log("⚠️ [Local Fallback] Reverting to safe fallback: REFUND_CLIENT to protect client capital.");
      adjudicationVerdict = "REFUND_CLIENT";
      adjudicationReasoning = "Dispute resolution failed due to AI service error.";
      evaluationScore = 0;
    }
  } else {
    console.log("\n⚠️ GEMINI_API_KEY is missing. Production AI assessment cannot proceed.");
    if (!isLocalNetwork) {
      console.error("❌ FATAL: Missing GEMINI_API_KEY on live network. Aborting to protect contract state.");
      process.exit(1);
    }
    console.log("⚠️ [Local Fallback] For safety, defaulting to REFUND_CLIENT. Disputes should use emergency resolution if no AI.");
    adjudicationVerdict = "REFUND_CLIENT";
    adjudicationReasoning = "AI assessment unavailable - safe fallback to protect client funds.";
    evaluationScore = 0;
  }

  const ruleInFavorOfFreelancer = (adjudicationVerdict === "PAY_FREELANCER");

  // 5.5 Persist live Gemini dispute evaluation record to Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log("💾 Persisting live Gemini evaluation record to Supabase...");
    try {
      await axios.post(
        `${supabaseUrl}/rest/v1/escrow_disputes`,
        {
          escrow_address: escrowAddress.toLowerCase(),
          milestone_index: parseInt(milestoneIndex, 10),
          verdict: adjudicationVerdict,
          score: evaluationScore,
          reasoning: adjudicationReasoning,
          model_name: "gemini-2.5-flash"
        },
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
          },
          timeout: 10000
        }
      );
      console.log("✔️ Live Gemini evaluation record persisted to Supabase!");
    } catch (sbErr) {
      console.error("⚠️ Warning: Failed to persist dispute record to Supabase:", sbErr.message);
    }
  }

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
