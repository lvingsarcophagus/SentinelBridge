import { ethers } from "ethers";
import fs from "fs";

/**
 * Demo Script: Flash Loan Attack -> Circuit Breaker Activation
 *
 * This script demonstrates the AI Watchdog detecting a high-velocity
 * liquidity drain indicative of a flash loan or price oracle manipulation attack.
 *
 * Run with: npx hardhat run scripts/demo-flash-loan.ts --network localhost
 */

async function main() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║       [ALERT] Flash Loan Attack Simulation     ║')
  console.log('║       Ultra-High Velocity -> Circuit Breaker   ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log('')

  let contractAddress: string;

  try {
    const savedData = JSON.parse(
      fs.readFileSync("./tmp/bridge-address.json", "utf-8")
    );
    contractAddress = savedData.address;
    console.log(`[INFO] Using existing contract: ${contractAddress}\n`);
  } catch {
    console.log("[ERROR] Contract address not found. Run deployment first.\n");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Use account 0 since setLockedAmount is onlyOwner in the mock
  const attacker = await provider.getSigner(0);

  const contractJson = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/SourceBridge.sol/SourceBridge.json",
      "utf8"
    )
  );

  const bridge = new ethers.Contract(contractAddress, contractJson.abi, attacker);

  // Helper to print bridge state
  const printState = async (phase: string) => {
    const risk = await bridge.getRiskRatio();
    const source = await bridge.getSourceReserves();
    const locked = await bridge.getLockedAmount();
    const isPaused = await bridge.isPaused();
    
    console.log(`--- [STATE] ${phase} ---`);
    console.log(`Risk Ratio:    ${risk.toString()}%`);
    console.log(`Source Reserve:${ethers.formatEther(source)} ETH`);
    console.log(`Locked Amount: ${ethers.formatEther(locked)} ETH`);
    console.log(`Status:        ${isPaused ? '🔴 PAUSED (CIRCUIT BREAKER ACTIVE)' : '🟢 ACTIVE'}\n`);
    
    return isPaused;
  };

  // Reset to clean state for demo (in case crisis demo left it paused)
  console.log("[INIT] Resetting bridge to healthy baseline...\n");
  try { await (await bridge.unpause()).wait(); } catch { /* already unpaused */ }
  await (await bridge.setReserves(ethers.parseEther("1000"), ethers.parseEther("500"))).wait();
  await (await bridge.setLockedAmount(ethers.parseEther("200"))).wait();

  await printState("INITIAL STATE (PRE-ATTACK)");

  // Phase 1: The attacker borrows a huge amount of flash liquidity
  console.log("[ATTACKER] Initiating Flash Loan transaction sequence...");
  console.log("[ATTACKER] Requesting 800 ETH transfer to destination chain in a single block...\n");

  try {
    const tx = await bridge.setLockedAmount(ethers.parseEther("1000"));
    await tx.wait();
    console.log("[EXPLOIT] Transaction mined. 800 ETH locked immediately.\n");
  } catch (err: any) {
    if (err.message.includes("Pausable: paused")) {
      console.log("[BLOCKED] Transaction reverted! Circuit breaker engaged before exploit could complete.\n");
    } else {
      console.log(`[ERROR] ${err.message}\n`);
    }
  }

  await printState("POST-EXPLOIT STATE (before watchdog)");

  // Phase 2: Watchdog Detection — simulate what CRE workflow does
  console.log("═══════════════════════════════════════════════");
  console.log("WATCHDOG DETECTION — Velocity Anomaly Engine");
  console.log("═══════════════════════════════════════════════\n");

  const risk = await bridge.getRiskRatio();
  const locked = await bridge.getLockedAmount();
  const baselineLocked = ethers.parseEther("200");
  const delta = locked - baselineLocked;
  const velocityMultiple = Number(ethers.formatEther(delta)) / 5; // baseline avg change ~5 ETH

  console.log("[SENTINEL] Analyzing transaction velocity...");
  console.log(`   Baseline locked:    200.0 ETH`);
  console.log(`   Current locked:     ${ethers.formatEther(locked)} ETH`);
  console.log(`   Delta:              ${ethers.formatEther(delta)} ETH in single block`);
  console.log(`   Velocity multiple:  ${velocityMultiple.toFixed(0)}x baseline (threshold: 3x)`);
  console.log(`   Risk Ratio:         ${risk.toString()}%\n`);

  if (Number(risk) >= 80) {
    console.log("[CRITICAL] Risk exceeds 80% threshold!");
    console.log("[SENTINEL] Flash loan velocity anomaly detected — activating circuit breaker...\n");

    try {
      const pauseTx = await bridge.pause();
      const receipt = await pauseTx.wait();
      console.log(`[ACTION] Bridge paused! TX: ${receipt?.hash}\n`);
    } catch (err: any) {
      if (err.message.includes("already paused")) {
        console.log("[INFO] Bridge was already paused.\n");
      } else {
        console.log(`[ERROR] Pause failed: ${err.message}\n`);
      }
    }
  }

  const paused = await printState("FINAL STATE (after watchdog)");

  if (paused) {
    console.log('✅ SUCCESS: SentinelBridge Watchdog detected the flash loan velocity and paused the bridge!');
  } else {
    console.log('❌ FAILED: The bridge is still active. The watchdog missed the anomaly.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
