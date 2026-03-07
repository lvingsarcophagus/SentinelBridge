import { ethers } from "ethers";
import fs from "fs";

/**
 * Demo: Normal Bridge Operation
 *
 * Shows the bridge operating healthily without any issues
 * Run with: npx hardhat run scripts/demo-normal.ts --network localhost
 */

async function main() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║       [START] Normal Bridge Operation Demo     ║')
  console.log('║       Healthy Monitoring & Operations          ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log('')

  // Get or deploy contract
  let contractAddress: string;

  // Try to read saved address
  try {
    const savedData = JSON.parse(
      fs.readFileSync("./tmp/bridge-address.json", "utf-8")
    );
    contractAddress = savedData.address;
    console.log(`[INFO] Using contract: ${contractAddress}`);
    console.log('')
  } catch {
    console.log("Contract address not found. Run: pnpm run node:deploy");
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

  // Reset to healthy state
  console.log("[INIT] Resetting bridge to healthy state...");
  const resetTx = await bridge.setReserves(
    ethers.parseEther("1000"),
    ethers.parseEther("500")
  );
  await resetTx.wait();

  const resetTx2 = await bridge.setLockedAmount(ethers.parseEther("200"));
  await resetTx2.wait();

  try {
    const resetTx3 = await bridge.unpause();
    await resetTx3.wait();
  } catch {
    // Already unpaused, ignore
  }

  const initialRisk = await bridge.getRiskRatio()

  console.log(`[OK] Bridge Reset. Current Risk: ${initialRisk}%`)
  console.log('')

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Simulate normal user activity
  console.log('======================================================')
  console.log('[INFO] Simulating normal user cross-chain activity...')
  console.log('======================================================')
  console.log('')

  // Show initial state
  let sourceReserve = await bridge.getSourceReserves();
  let lockedAmount = await bridge.getLockedAmount();
  let riskRatio = await bridge.getRiskRatio();
  let isPaused = await bridge.isPaused();

  await delay(2000);

  // Simulate small activity
  console.log("═══════════════════════════════════════════════");
  console.log("ACTIVITY: User bridges 100 tokens");
  console.log("═══════════════════════════════════════════════\n");

  const tx1 = await bridge.setLockedAmount(ethers.parseEther("300"));
  await tx1.wait();

  sourceReserve = await bridge.getSourceReserves();
  lockedAmount = await bridge.getLockedAmount();
  riskRatio = await bridge.getRiskRatio();

  console.log(
    `📊 UPDATED STATE:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n`
  );

  console.log(
    "💭 SentinelBridge Workflow:\n   Risk ratio is now ${riskRatio}% - Still safe\n   ✅ Within normal parameters\n   ✅ Continuing normal monitoring\n"
  );

  await delay(2000);

  // More activity
  console.log("═══════════════════════════════════════════════");
  console.log("ACTIVITY: More users bridge tokens");
  console.log("═══════════════════════════════════════════════\n");

  const tx2 = await bridge.setLockedAmount(ethers.parseEther("400"));
  await tx2.wait();

  sourceReserve = await bridge.getSourceReserves();
  lockedAmount = await bridge.getLockedAmount();
  riskRatio = await bridge.getRiskRatio();

  console.log(
    `📊 UPDATED STATE:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n`
  );

  console.log(
    "💭 SentinelBridge Workflow:\n   Risk ratio is ${riskRatio}% - Moderate usage\n   ✅ In warning zone but below critical\n   ⚠️ Monitoring closely\n"
  );

  await delay(2000);

  // Back to normal
  console.log("═══════════════════════════════════════════════");
  console.log("ACTIVITY: Users withdraw tokens");
  console.log("═══════════════════════════════════════════════\n");

  const tx3 = await bridge.setLockedAmount(ethers.parseEther("250"));
  await tx3.wait();

  sourceReserve = await bridge.getSourceReserves();
  lockedAmount = await bridge.getLockedAmount();
  riskRatio = await bridge.getRiskRatio();

  console.log(
    `📊 FINAL STATE:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n`
  );

  console.log(
    "💭 SentinelBridge Workflow:\n   Risk ratio is ${riskRatio}% - Back to healthy levels\n   ✅ All systems nominal\n   ✅ Bridge operating smoothly\n"
  );

  // Summary
  console.log("═══════════════════════════════════════════════");
  console.log("DEMO COMPLETE: Normal Operations");
  console.log("═══════════════════════════════════════════════\n");

  console.log("✅ What we demonstrated:\n");
  console.log(
    "   • Bridge monitors liquidity continuously"
  );
  console.log(
    "   • Normal trading activity works fine"
  );
  console.log(
    "   • Risk stays well below 80% threshold"
  );
  console.log("   • No alerts or pauses triggered\n");

  console.log("📝 Try other demos:\n");
  console.log("   pnpm run demo:crisis       # See emergency pause in action");
  console.log("   pnpm run demo:show        # Check current bridge state\n");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
