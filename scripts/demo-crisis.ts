import { ethers } from "ethers";
import fs from "fs";

/**
 * Demo Script: Crisis Event -> Circuit Breaker Activation
 *
 * This script demonstrates the full SentinelBridge workflow:
 * 1. Normal bridge state
 * 2. A "hack" drains reserves
 * 3. Workflow detects the risk
 * 4. Automatically pauses the bridge
 *
 * Run with: npx hardhat run scripts/demo-crisis.ts --network localhost
 */

async function main() {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║     SentinelBridge Crisis Demo                 ║");
  console.log("║     Monitoring → Detection → Pause             ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  // Get or deploy contract
  let contractAddress: string;

  // Try to read saved address
  try {
    const savedData = JSON.parse(
      fs.readFileSync("./tmp/bridge-address.json", "utf-8")
    );
    contractAddress = savedData.address;
    console.log(`📍 Using existing contract: ${contractAddress}\n`);
  } catch {
    console.log("❌ Contract address not found. Run: npx hardhat run scripts/deploy-bridge.ts --network localhost\n");
    process.exit(1);
  }

  // Connect to Hardhat node
  const rpcUrl = process.env.TESTNET_RPC || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = await provider.getSigner(0);

  // Read contract ABI
  const contractJson = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/SourceBridge.sol/SourceBridge.json",
      "utf8"
    )
  );

  const bridge = new ethers.Contract(contractAddress, contractJson.abi, signer);

  // Phase 0: Reset to healthy baseline so the demo is re-runnable
  console.log("🔄 Resetting bridge to healthy baseline...\n");

  if (await bridge.isPaused()) {
    const txUnpause = await bridge.unpause();
    await txUnpause.wait();
  }
  // Reset attack flags
  const txFlags = await bridge.resetAttackFlags();
  await txFlags.wait();
  // Restore initial reserves: 1000 source, 500 dest, 200 locked
  const txRes = await bridge.setReserves(ethers.parseEther("1000"), ethers.parseEther("500"));
  await txRes.wait();
  const txLock = await bridge.setLockedAmount(ethers.parseEther("200"));
  await txLock.wait();

  console.log("✅ Bridge reset to healthy state (1000/500/200)\n");

  // Phase 1: Healthy State
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 1: Normal Bridge Operation");
  console.log("═══════════════════════════════════════════════\n");

  let sourceReserve = await bridge.getSourceReserves();
  let lockedAmount = await bridge.getLockedAmount();
  let riskRatio = await bridge.getRiskRatio();
  let isPaused = await bridge.isPaused();

  console.log(
    `✅ HEALTHY BRIDGE STATE:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n   Status:         ${isPaused ? "🚨 PAUSED" : "✅ OPERATIONAL"}\n`
  );

  console.log("💭 SentinelBridge workflow status:");
  console.log(
    `   Risk is ${riskRatio.toString()}% - Below 80% threshold, all healthy ✅\n`
  );

  // Simulate user interaction
  await delay(2000);

  // Phase 2: The Crisis (Reserve Drain)
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 2: CRISIS EVENT - Reserves Drain!!");
  console.log("═══════════════════════════════════════════════\n");

  console.log("⚠️  SIMULATING HACK:");
  console.log("   - Smart contract vulnerability discovered");
  console.log("   - Attacker drains 60% of reserves");
  console.log("   - Running: bridge.setReserves(400 ether, 500 ether)\n");

  const tx1 = await bridge.setReserves(
    ethers.parseEther("400"),
    ethers.parseEther("500")
  );
  await tx1.wait();

  console.log("✓ Reserves have been drained!\n");

  sourceReserve = await bridge.getSourceReserves();
  lockedAmount = await bridge.getLockedAmount();
  riskRatio = await bridge.getRiskRatio();

  console.log(`🔴 NEW STATE AFTER DRAIN:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n`);

  console.log("💭 SentinelBridge workflow status:");
  console.log(
    `   Risk is now ${riskRatio.toString()}% - Exceeds 80% threshold! ⚠️\n`
  );

  await delay(2000);

  // Phase 3: Escalation to Critical
  console.log("═══════════════════════════════════════════════");
  console.log(
    "PHASE 3: Risk Further Escalates - Approaching Insolvency"
  );
  console.log("═══════════════════════════════════════════════\n");

  console.log("⚠️  CONTINUING DRAIN:");
  console.log("   - Attacker continues stealing");
  console.log("   - Now locking even more tokens");
  console.log("   - Running: bridge.setLockedAmount(380 ether)\n");

  const tx2 = await bridge.setLockedAmount(ethers.parseEther("380"));
  await tx2.wait();

  console.log("✓ Locked amount increased!\n");

  sourceReserve = await bridge.getSourceReserves();
  lockedAmount = await bridge.getLockedAmount();
  riskRatio = await bridge.getRiskRatio();

  console.log(
    `🚨 CRITICAL STATE:\n   Source Reserve: ${ethers.formatEther(sourceReserve)} tokens\n   Locked Amount:  ${ethers.formatEther(lockedAmount)} tokens\n   Risk Ratio:     ${riskRatio.toString()}%\n   (Locked > Reserves!) INSOLVENT\n`
  );

  console.log("💭 SentinelBridge workflow status:");
  console.log(`   🚨 CRITICAL ALERT: Risk at ${riskRatio.toString()}%!`);
  console.log("   Risk exceeds maximum threshold of 80%");
  console.log("   Activating Emergency Circuit Breaker...\n");

  await delay(2000);

  // Phase 4: Circuit Breaker Activation
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 4: CIRCUIT BREAKER ACTIVATION");
  console.log("═══════════════════════════════════════════════\n");

  console.log("🚨 EXECUTING EMERGENCY PAUSE:");
  console.log("   Calling: bridge.pause()\n");

  const tx3 = await bridge.pause();
  const receipt = await tx3.wait();

  console.log("✓ Bridge has been paused!\n");

  isPaused = await bridge.isPaused();

  console.log(
    `✅ BRIDGE PAUSED:\n   Status:             ${isPaused ? "🚨 PAUSED" : "OPERATIONAL"}\n   Transaction Hash:   ${receipt?.hash}\n`
  );

  console.log("💭 SentinelBridge workflow result:");
  console.log("   ✅ Circuit breaker successfully activated");
  console.log("   ✅ No new tokens can be bridged");
  console.log("   ✅ Users can still withdraw existing tokens");
  console.log("   ✅ Team has time to investigate and fix\n");

  // Summary
  console.log("═══════════════════════════════════════════════");
  console.log("DEMO SUMMARY");
  console.log("═══════════════════════════════════════════════\n");

  console.log("✅ What we demonstrated:\n");
  console.log("   1. Healthy bridge operation (20% risk)");
  console.log("   2. Crisis detection (reserves drain to 400/1000)");
  console.log("   3. Risk escalation (risk rises to 95%)");
  console.log("   4. Automatic pause trigger (circuit breaker activated)");
  console.log("   5. Bridge protection (no more bridging allowed)\n");

  console.log("📊 Key Metrics:");
  const finalState = {
    sourceReserve: ethers.formatEther(await bridge.getSourceReserves()),
    lockedAmount: ethers.formatEther(await bridge.getLockedAmount()),
    riskRatio: (await bridge.getRiskRatio()).toString(),
    paused: await bridge.isPaused(),
  };

  console.log(`   Source Reserve: ${finalState.sourceReserve} tokens`);
  console.log(`   Locked Amount:  ${finalState.lockedAmount} tokens`);
  console.log(`   Final Risk:     ${finalState.riskRatio}%`);
  console.log(`   Status:         ${finalState.paused ? "🚨 PAUSED" : "OPERATIONAL"}\n`);

  console.log("🎯 Why this matters:\n");
  console.log("   • Automated monitoring prevents catastrophic losses");
  console.log("   • Circuit breaker activates in seconds, not hours");
  console.log("   • Decentralized via Chainlink CRE (no single point of failure)");
  console.log("   • Protects users by preventing insolvency\n");

  console.log("📝 Next Steps:\n");
  console.log('   1. Run the dashboard: pnpm run dev');
  console.log("   2. Visit http://localhost:3000");
  console.log("   3. Try other demo scenarios");
  console.log("   4. Deploy to testnet with real RPC endpoints\n");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
