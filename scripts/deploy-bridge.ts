import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n🚀 Deploying SentinelBridge Mock Contracts...\n");

  // Connect to RPC Node
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.SOURCE_RPC || process.env.TESTNET_RPC || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  let signer;
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    console.log(`🔑 Using deployer wallet: ${signer.address}`);
  } else {
    signer = await provider.getSigner(0);
    console.log(`🔑 Using local node signer: ${await signer.getAddress()}`);
  }

  // Read contract ABI and bytecode
  const contractJson = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json"),
      "utf8"
    )
  );

  // Deploy the contract
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    signer
  );

  const sourceBridge: any = await factory.deploy();
  await sourceBridge.waitForDeployment();

  const contractAddress = await sourceBridge.getAddress();

  console.log("✅ SourceBridge deployed!");
  console.log(`📍 Address: ${contractAddress}`);

  // Get initial state
  const sourceReserve = await sourceBridge.getSourceReserves();
  const destReserve = await sourceBridge.getDestReserves();
  const lockedAmount = await sourceBridge.getLockedAmount();
  const riskRatio = await sourceBridge.getRiskRatio();
  const isPaused = await sourceBridge.isPaused();

  console.log("\n📊 Initial Bridge State:");
  console.log(`   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens`);
  console.log(`   Dest Reserve:   ${ethers.formatEther(destReserve)} tokens`);
  console.log(`   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens`);
  console.log(`   Risk Ratio:     ${riskRatio.toString()}%`);
  console.log(`   Bridge Paused:  ${isPaused ? "YES 🚨" : "NO ✅"}`);

  console.log("\n📝 Next steps:");
  console.log("1. Update .env.local with the contract address:");
  console.log(`   NEXT_PUBLIC_BRIDGE_ADDRESS=${contractAddress}`);
  console.log("2. Update RPC endpoint in .env.local:");
  console.log("   SOURCE_RPC=http://127.0.0.1:8545");
  console.log("   DEST_RPC=http://127.0.0.1:8545");
  console.log("3. Run the demo: pnpm run demo:crisis\n");

  // Save contract address to a file for use in other scripts
  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp", { recursive: true });
  }
  fs.writeFileSync(
    "./tmp/bridge-address.json",
    JSON.stringify({ address: contractAddress }, null, 2)
  );
  console.log("✅ Contract address saved to tmp/bridge-address.json");

  // Auto-sync CRE workflow config with deployed address
  const creConfigPath = path.join(process.cwd(), "src/workflows/sentinel-bridge/config.json");
  if (fs.existsSync(creConfigPath)) {
    const creConfig = JSON.parse(fs.readFileSync(creConfigPath, "utf-8"));
    creConfig.bridgeAddress = contractAddress;
    fs.writeFileSync(creConfigPath, JSON.stringify(creConfig, null, "\t") + "\n");
    console.log("✅ CRE workflow config.json synced with deployed address");
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
