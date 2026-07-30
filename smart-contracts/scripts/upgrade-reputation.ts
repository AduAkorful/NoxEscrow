import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=========================================================");
  console.log("🚀 Upgrading NoxEscrowReputation Implementation on Sepolia");
  console.log("=========================================================\n");

  const localEnvPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(localEnvPath)) {
    const lines = fs.readFileSync(localEnvPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const privateKey = process.env.PRIVATE_KEY || "";
  if (!privateKey) throw new Error("PRIVATE_KEY missing in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`👤 Deployer/Owner Address: ${wallet.address}`);

  let reputationProxyAddress = process.env.REPUTATION_PROXY_ADDRESS || "";
  const addressesPath = path.resolve(__dirname, "../../dApp/src/contracts/addresses.json");
  if (!reputationProxyAddress && fs.existsSync(addressesPath)) {
    try {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
      if (addresses.reputationRegistry) {
        reputationProxyAddress = addresses.reputationRegistry;
      } else if (addresses.factory) {
        const factoryAbi = ["function reputationRegistry() view returns (address)"];
        const factoryContract = new ethers.Contract(addresses.factory, factoryAbi, provider);
        reputationProxyAddress = await factoryContract.reputationRegistry();
      }
    } catch (readErr) {
      console.warn("Could not read addresses.json:", readErr);
    }
  }

  if (!reputationProxyAddress) {
    reputationProxyAddress = "0xC0eEBD4D4A90946DF5841e5Df29cf2a724449632";
  }
  console.log(`📍 Reputation Proxy Target: ${reputationProxyAddress}`);

  // 1. Load compiled NoxEscrowReputation artifact
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/NoxEscrowReputation.sol/NoxEscrowReputation.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // 2. Deploy new logic implementation contract
  console.log("📦 Deploying updated NoxEscrowReputation logic implementation...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const newImpl = await factory.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log(`✔️ New Reputation Implementation deployed at: ${newImplAddress}`);

  // 3. Upgrade UUPS Proxy via upgradeToAndCall(newImplAddress, "0x")
  console.log("🔄 Executing UUPS Proxy Upgrade...");
  const proxyAbi = [
    "function upgradeToAndCall(address newImplementation, bytes memory data) external payable",
    "function owner() external view returns (address)"
  ];
  const proxyContract = new ethers.Contract(reputationProxyAddress, proxyAbi, wallet);

  const currentOwner = await proxyContract.owner();
  console.log(`👑 Current Proxy Owner: ${currentOwner}`);

  const upgradeTx = await proxyContract.upgradeToAndCall(newImplAddress, "0x");
  console.log(`⏳ Upgrade transaction sent: ${upgradeTx.hash}. Awaiting block confirmation...`);
  await upgradeTx.wait();

  console.log("\n=========================================================");
  console.log("🎉 NoxEscrowReputation Proxy Upgrade Successful!");
  console.log("=========================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Upgrade failed:", err);
    process.exit(1);
  });
