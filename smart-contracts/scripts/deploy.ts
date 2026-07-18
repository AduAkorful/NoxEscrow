import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { createEthersHandleClient } from "@iexec-nox/handle";
import hre from "hardhat";
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
  gatewayUrl: string,
  noxContractManager: string
) {
  const handleClient = await createEthersHandleClient(signer, {
    smartContractAddress: noxContractManager,
    gatewayUrl: gatewayUrl,
    subgraphUrl: "https://example.com/subgraphs/id/none",
  });
  return handleClient.encryptInput(value, solidityType as any, applicationContract);
}

async function verifyContract(address: string, constructorArguments: any[] = []) {
  console.log(`🔍 Verifying contract at ${address}...`);
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`✔️ Verified successfully!`);
  } catch (err: any) {
    if (err.message.includes("Already Verified") || err.message.includes("already verified")) {
      console.log(`✔️ Already Verified!`);
    } else {
      console.warn(`⚠️ Verification skipped/failed for ${address}:`, err.message);
    }
  }
}

async function deployContract(
  contractName: string,
  args: any[],
  hardhatEthers: any,
  wallet: any,
  isLocal: boolean
) {
  if (isLocal) {
    return hardhatEthers.deployContract(contractName, args);
  } else {
    const fs = await import("fs");
    const path = await import("path");
    
    let artifactSubPath = "";
    if (contractName === "MockERC7984") {
      artifactSubPath = "mocks/MockERC7984.sol/MockERC7984.json";
    } else if (contractName === "NoxEscrowReputation") {
      artifactSubPath = "NoxEscrowReputation.sol/NoxEscrowReputation.json";
    } else if (contractName === "NoxEscrowContract") {
      artifactSubPath = "NoxEscrowContract.sol/NoxEscrowContract.json";
    } else if (contractName === "NoxEscrowFactory") {
      artifactSubPath = "NoxEscrowFactory.sol/NoxEscrowFactory.json";
    } else if (contractName === "NoxProxy") {
      artifactSubPath = "mocks/NoxProxy.sol/NoxProxy.json";
    } else if (contractName === "ConfidentialUSDCToken") {
      artifactSubPath = "ConfidentialUSDCToken.sol/ConfidentialUSDCToken.json";
    }
    
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts", artifactSubPath);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    const { ethers } = await import("ethers");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    return contract;
  }
}

async function getContractAt(
  contractName: string,
  address: string,
  hardhatEthers: any,
  wallet: any,
  isLocal: boolean
) {
  if (isLocal) {
    return hardhatEthers.getContractAt(contractName, address);
  } else {
    const fs = await import("fs");
    const path = await import("path");
    
    let artifactSubPath = "";
    if (contractName === "NoxEscrowFactory") {
      artifactSubPath = "NoxEscrowFactory.sol/NoxEscrowFactory.json";
    } else if (contractName === "NoxEscrowReputation") {
      artifactSubPath = "NoxEscrowReputation.sol/NoxEscrowReputation.json";
    }
    
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts", artifactSubPath);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    const { ethers } = await import("ethers");
    return new ethers.Contract(address, artifact.abi, wallet);
  }
}

async function main() {
  console.log("=========================================================");
  console.log("🚀  NoxEscrow Protocol — Automated Deployer Suite  🚀");
  console.log("=========================================================\n");

  // 1. Connect to the network / Nox stack
  console.log("🔌 Resolving network connection...");
  const networkName = hre.network.name;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  let deployer: any;
  let hardhatEthers: any;
  const isLocal = networkName === "hardhat" || networkName === "localhost" || networkName === "unknown" || networkName === "default";

  if (isLocal) {
    console.log("🔌 Connecting to local Nox stack and booting emulator...");
    const connection = await nox.connect();
    hardhatEthers = connection.ethers;
    const signers = await hardhatEthers.getSigners();
    deployer = signers[0];
  } else {
    console.log("🔌 Connecting directly to the public network...");
    const { ethers } = await import("ethers");
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/dummy");
    const privateKey = process.env.PRIVATE_KEY || "";
    if (!privateKey) {
      throw new Error("❌ Error: PRIVATE_KEY environment variable is required.");
    }
    deployer = new ethers.Wallet(privateKey, provider);
  }

  console.log(`🌐 Network: ${networkName}`);
  console.log(`👤 Deployer Address: ${deployer.address}\n`);

  const noxContractManagerAddress = "0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf";

  const gatewayUrl = process.env.NOX_GATEWAY_URL || `http://127.0.0.1:${process.env.NOX_HANDLE_GATEWAY_HOST_PORT || "8080"}`;

  // 2. Deploy Canonical Wrapped Token (Mock for development, custom wrapper ConfidentialUSDCToken for Sepolia)
  let cUSDCAddress: string;
  const publicUSDCAddress = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590";

  if (!isLocal) {
    console.log(`📦 Deploying custom cUSDC wrapper contract pointing to public USDC (${publicUSDCAddress})...`);
    const cUSDC = await deployContract("ConfidentialUSDCToken", [publicUSDCAddress], hardhatEthers, deployer, isLocal);
    cUSDCAddress = await cUSDC.getAddress();
    console.log(`✔️  ConfidentialUSDCToken wrapper deployed at: ${cUSDCAddress}`);
  } else {
    console.log("📦 Deploying mock confidential ERC-7984 wrapped token...");
    const cUSDC = await deployContract("MockERC7984", [], hardhatEthers, deployer, isLocal);
    cUSDCAddress = await cUSDC.getAddress();
    console.log(`✔️  Mock cUSDC Token deployed at: ${cUSDCAddress}`);
  }

  // 3. Deploy Implementations
  console.log("\n📦 Deploying logic implementation contracts...");
  const reputationImpl = await deployContract("NoxEscrowReputation", [], hardhatEthers, deployer, isLocal);
  const reputationImplAddress = await reputationImpl.getAddress();
  console.log(`✔️  Reputation logic deployed at: ${reputationImplAddress}`);

  const escrowImpl = await deployContract("NoxEscrowContract", [], hardhatEthers, deployer, isLocal);
  const escrowImplAddress = await escrowImpl.getAddress();
  console.log(`✔️  Escrow logic template deployed at: ${escrowImplAddress}`);

  const factoryImpl = await deployContract("NoxEscrowFactory", [], hardhatEthers, deployer, isLocal);
  const factoryImplAddress = await factoryImpl.getAddress();
  console.log(`✔️  Factory logic deployed at: ${factoryImplAddress}`);

  // 4. Deploy Factory Proxy (Proxied via NoxProxy for UUPS-upgradeability)
  console.log("\n🔄 Orchestrating Factory Proxy deployment...");
  const teeArbiterAddress = process.env.TEE_ARBITER || "";
  if (!teeArbiterAddress || teeArbiterAddress === zeroAddress) {
    throw new Error("❌ Error: TEE_ARBITER environment variable is required.");
  }
  const treasuryAddress = deployer.address;

  const factoryInitData = factoryImpl.interface.encodeFunctionData("initialize", [
    escrowImplAddress,
    zeroAddress, // Link Reputation registry after its proxy is active
    cUSDCAddress,
    teeArbiterAddress,
    treasuryAddress
  ]);
  const factoryProxy = await deployContract("NoxProxy", [
    factoryImplAddress,
    factoryInitData
  ], hardhatEthers, deployer, isLocal);
  const factoryAddress = await factoryProxy.getAddress();
  const factory = await getContractAt("NoxEscrowFactory", factoryAddress, hardhatEthers, deployer, isLocal);
  console.log(`✔️  UUPS Factory Proxy active at: ${factoryAddress}`);

  // 5. Deploy Reputation Proxy
  console.log("🔄 Orchestrating Reputation Proxy deployment...");
  const reputationInitData = reputationImpl.interface.encodeFunctionData("initialize", [
    factoryAddress
  ]);
  const reputationProxy = await deployContract("NoxProxy", [
    reputationImplAddress,
    reputationInitData
  ], hardhatEthers, deployer, isLocal);
  const reputationAddress = await reputationProxy.getAddress();
  const reputation = await getContractAt("NoxEscrowReputation", reputationAddress, hardhatEthers, deployer, isLocal);
  console.log(`✔️  UUPS Reputation Proxy active at: ${reputationAddress}`);

  // 6. Establish Factory Registry Linking
  console.log("\n🔗 Linking Reputation Registry in Factory...");
  const linkTx = await factory.setReputationRegistry(reputationAddress);
  await linkTx.wait();
  console.log("✔️  Registry link settled successfully!");

  // 7. Initialize Base Reputation score (1000) inside TEE registry
  console.log("🛡️  Initializing base starting reputation (1000) under ZK...");
  try {
    const baseRepEnc = await encryptInputWithSigner(deployer, 1000n, "uint256", reputationAddress, gatewayUrl, noxContractManagerAddress);
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
    teeArbiter: teeArbiterAddress,
    gatewayUrl: gatewayUrl,
    noxContractManager: noxContractManagerAddress
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
    envContent = envContent.replace(/^VITE_NOX_CONTRACT_MANAGER=.*$/m, `VITE_NOX_CONTRACT_MANAGER=${noxContractManagerAddress}`);
    
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(`✔️  Frontend .env parameters synchronized at: ${envPath}`);
  }

  // Synchronize with arbiter/.env file if it exists
  const arbiterEnvPath = path.resolve(__dirname, "../../arbiter/.env");
  if (fs.existsSync(arbiterEnvPath)) {
    let envContent = fs.readFileSync(arbiterEnvPath, "utf8");
    
    envContent = envContent.replace(/^ESCROW_FACTORY_ADDRESS=.*$/m, `ESCROW_FACTORY_ADDRESS="${factoryAddress}"`);
    envContent = envContent.replace(/^PUBLIC_USDC_TOKEN=.*$/m, `PUBLIC_USDC_TOKEN="${cUSDCAddress}"`); // Also update mock token as standard public USDC for local/test purposes
    
    fs.writeFileSync(arbiterEnvPath, envContent, "utf8");
    console.log(`✔️  Arbiter .env parameters synchronized at: ${arbiterEnvPath}`);
  }

  // 10. Perform programmatic Etherscan verification if on a public/test network
  if (networkName !== "hardhat" && networkName !== "localhost" && networkName !== "unknown") {
    console.log("\n🔍 Initiating automated Etherscan verification...");
    
    // Wait for a few block confirmations to ensure Etherscan has indexed the transactions
    console.log("⏳ Waiting 15 seconds for Etherscan indexing...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Verify cUSDC wrapper contract with its underlying public token address
    await verifyContract(cUSDCAddress, [publicUSDCAddress]);
    await verifyContract(reputationImplAddress);
    await verifyContract(escrowImplAddress);
    await verifyContract(factoryImplAddress);
    await verifyContract(factoryAddress, [factoryImplAddress, factoryInitData]);
    await verifyContract(reputationAddress, [reputationImplAddress, reputationInitData]);
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
