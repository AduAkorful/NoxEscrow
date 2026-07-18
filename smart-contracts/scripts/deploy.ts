import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  console.log("=========================================================");
  console.log("🚀  NoxEscrow Protocol — Automated Deployer Suite  🚀");
  console.log("=========================================================\n");

  // 1. Connect to the network / Nox stack
  console.log("🔌 Resolving network connection...");
  const connection = await nox.connect();
  const hardhatEthers = connection.ethers;
  const [deployer] = await hardhatEthers.getSigners();
  
  const networkName = (await hardhatEthers.provider.getNetwork()).name;
  console.log(`🌐 Network: ${networkName}`);
  console.log(`👤 Deployer Address: ${deployer.address}\n`);

  const gatewayUrl = process.env.NOX_GATEWAY_URL || `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT || "8080"}`;

  // 2. Deploy Canonical Wrapped Token (Mock for development/test networks)
  console.log("📦 Deploying mock confidential ERC-7984 wrapped token...");
  const cUSDC = await hardhatEthers.deployContract("MockERC7984", []);
  const cUSDCAddress = await cUSDC.getAddress();
  console.log(`✔️  Mock cUSDC Token deployed at: ${cUSDCAddress}`);

  // 3. Deploy Implementations
  console.log("\n📦 Deploying logic implementation contracts...");
  const reputationImpl = await hardhatEthers.deployContract("NoxEscrowReputation", []);
  const reputationImplAddress = await reputationImpl.getAddress();
  console.log(`✔️  Reputation logic deployed at: ${reputationImplAddress}`);

  const escrowImpl = await hardhatEthers.deployContract("NoxEscrowContract", []);
  const escrowImplAddress = await escrowImpl.getAddress();
  console.log(`✔️  Escrow logic template deployed at: ${escrowImplAddress}`);

  const factoryImpl = await hardhatEthers.deployContract("NoxEscrowFactory", []);
  const factoryImplAddress = await factoryImpl.getAddress();
  console.log(`✔️  Factory logic deployed at: ${factoryImplAddress}`);

  // 4. Deploy Factory Proxy (Proxied via NoxProxy for UUPS-upgradeability)
  console.log("\n🔄 Orchestrating Factory Proxy deployment...");
  const teeArbiterAddress = process.env.TEE_ARBITER || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const treasuryAddress = deployer.address;

  const factoryInitData = factoryImpl.interface.encodeFunctionData("initialize", [
    escrowImplAddress,
    hardhatEthers.ZeroAddress, // Link Reputation registry after its proxy is active
    cUSDCAddress,
    teeArbiterAddress,
    treasuryAddress
  ]);
  const factoryProxy = await hardhatEthers.deployContract("NoxProxy", [
    factoryImplAddress,
    factoryInitData
  ]);
  const factoryAddress = await factoryProxy.getAddress();
  const factory = await hardhatEthers.getContractAt("NoxEscrowFactory", factoryAddress);
  console.log(`✔️  UUPS Factory Proxy active at: ${factoryAddress}`);

  // 5. Deploy Reputation Proxy
  console.log("🔄 Orchestrating Reputation Proxy deployment...");
  const reputationInitData = reputationImpl.interface.encodeFunctionData("initialize", [
    factoryAddress
  ]);
  const reputationProxy = await hardhatEthers.deployContract("NoxProxy", [
    reputationImplAddress,
    reputationInitData
  ]);
  const reputationAddress = await reputationProxy.getAddress();
  const reputation = await hardhatEthers.getContractAt("NoxEscrowReputation", reputationAddress);
  console.log(`✔️  UUPS Reputation Proxy active at: ${reputationAddress}`);

  // 6. Establish Factory Registry Linking
  console.log("\n🔗 Linking Reputation Registry in Factory...");
  const linkTx = await factory.setReputationRegistry(reputationAddress);
  await linkTx.wait();
  console.log("✔️  Registry link settled successfully!");

  // 7. Initialize Base Reputation score (1000) inside TEE registry
  console.log("🛡️  Initializing base starting reputation (1000) under ZK...");
  try {
    const baseRepEnc = await encryptInputWithSigner(deployer, 1000n, "uint256", reputationAddress, gatewayUrl);
    const setBaseTx = await reputation.connect(deployer).setBaseReputation(baseRepEnc.handle, baseRepEnc.handleProof);
    await setBaseTx.wait();
    console.log("✔️  Base reputation initialized successfully!");
  } catch (err: any) {
    console.warn("⚠️  Skipped automatic base reputation setup: Handle gateway is offline. Configure manually later.", err.message);
  }

  // 8. Configure Protocol Windows
  console.log("\n⚙️  Configuring default protocol duration windows...");
  const setReviewTx = await factory.setReviewWindow(3 * 24 * 3600); // 3 days default review
  await setReviewTx.wait();
  console.log("✔️  Default review window set to 3 days.");

  const setCancelTx = await factory.setMutualCancelWindow(7 * 24 * 3600); // 7 days default mutual cancel window
  await setCancelTx.wait();
  console.log("✔️  Default mutual cancel window set to 7 days.");

  // 9. Sync contract deployment addresses to the frontend dApp config
  console.log("\n🗄️  Synchronizing deployment parameters with frontend dApp config...");
  const addressesPath = path.resolve(__dirname, "../../dApp/src/contracts/addresses.json");
  
  const addressConfig = {
    factory: factoryAddress,
    cUSDC: cUSDCAddress,
    teeArbiter: process.env.TEE_ARBITER || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    gatewayUrl: gatewayUrl
  };

  fs.writeFileSync(addressesPath, JSON.stringify(addressConfig, null, 2), "utf8");
  console.log(`✔️  Frontend address parameters updated at: ${addressesPath}`);

  // Synchronize with dApp/.env file if it exists
  const envPath = path.resolve(__dirname, "../../dApp/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    
    envContent = envContent.replace(/^VITE_NOX_ESCROW_FACTORY=.*$/m, `VITE_NOX_ESCROW_FACTORY=${factoryAddress}`);
    envContent = envContent.replace(/^VITE_CUSDC_TOKEN=.*$/m, `VITE_CUSDC_TOKEN=${cUSDCAddress}`);
    envContent = envContent.replace(/^VITE_TEE_ARBITER=.*$/m, `VITE_TEE_ARBITER=${addressConfig.teeArbiter}`);
    envContent = envContent.replace(/^VITE_GATEWAY_URL=.*$/m, `VITE_GATEWAY_URL=${gatewayUrl}`);
    
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(`✔️  Frontend .env parameters synchronized at: ${envPath}`);
  }

  console.log("\n=========================================================");
  console.log("🎉  NoxEscrow Core Protocol Deployed Successfully!       🎉");
  console.log("=========================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
