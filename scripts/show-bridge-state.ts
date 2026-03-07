import { ethers } from "ethers";
import fs from "fs";

/**
 * Show Bridge State
 *
 * Displays the current state of the deployed bridge contract
 * Run with: npx hardhat run scripts/show-bridge-state.ts --network localhost
 */

async function main() {
  // Get or deploy contract
  let contractAddress: string;

  // Try to read saved address
  try {
    const savedData = JSON.parse(
      fs.readFileSync("./tmp/bridge-address.json", "utf-8")
    );
    contractAddress = savedData.address;
  } catch {
    console.log(
      "❌ Contract address not found. Run: pnpm run node:deploy\n"
    );
    process.exit(1);
  }

  // Connect to Hardhat node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);

  // Read contract ABI
  const contractJson = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/SourceBridge.sol/SourceBridge.json",
      "utf8"
    )
  );

  const bridge = new ethers.Contract(contractAddress, contractJson.abi, signer);

  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║           Bridge State Status                  ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  const sourceReserve = await bridge.getSourceReserves();
  const destReserve = await bridge.getDestReserves();
  const lockedAmount = await bridge.getLockedAmount();
  const riskRatio = await bridge.getRiskRatio();
  const isPaused = await bridge.isPaused();

  console.log(`📍 Contract Address: ${contractAddress}\n`);

  console.log("📊 Reserves:");
  console.log(
    `   Source (ETH):      ${ethers.formatEther(sourceReserve)} tokens`
  );
  console.log(
    `   Destination:       ${ethers.formatEther(destReserve)} tokens`
  );
  console.log(`   Locked (bridged):  ${ethers.formatEther(lockedAmount)} tokens\n`);

  console.log("📈 Risk Analysis:");
  console.log(`   Risk Ratio:        ${riskRatio.toString()}%`);

  if (riskRatio < 50n) {
    console.log("   Status:            ✅ SAFE (< 50%)");
  } else if (riskRatio < 80n) {
    console.log("   Status:            ⚠️ WARNING (50-80%)");
  } else {
    console.log("   Status:            🚨 CRITICAL (> 80%)");
  }

  console.log(`   Paused:            ${isPaused ? "🚨 YES" : "✅ NO"}\n`);

  // Show risk gauge
  const ratio = Number(riskRatio);
  const barLength = 40;
  const filledLength = Math.round((ratio / 100) * barLength);
  const emptyLength = barLength - filledLength;

  console.log("📊 Risk Gauge:");
  console.log(
    `   [${("█").repeat(filledLength)}${("░").repeat(emptyLength)}] ${ratio}%\n`
  );

  // Interactive options
  console.log("💡 Quick Commands:");
  console.log("   pnpm run demo:crisis      # Simulate a crisis event");
  console.log("   pnpm run demo:normal      # Show normal operation");
  console.log("   pnpm run node:deploy      # Redeploy contract\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
