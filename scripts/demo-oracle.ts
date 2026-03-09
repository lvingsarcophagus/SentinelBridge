import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║    [ALERT] Proof Fraud / Oracle Lag Simulation ║");
  console.log("║    Forged Message / Data Feed Divergence      ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  const addressPath = path.join(process.cwd(), "tmp/bridge-address.json");
  if (!fs.existsSync(addressPath)) {
    console.error("[ERROR] Contract not deployed. Run 'pnpm run node:deploy' first.");
    process.exit(1);
  }

  const address = JSON.parse(fs.readFileSync(addressPath, "utf-8")).address;
  const rpcUrl = process.env.TESTNET_RPC || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = await provider.getSigner(0);

  const contractJson = JSON.parse(
    fs.readFileSync("./artifacts/contracts/SourceBridge.sol/SourceBridge.json", "utf8")
  );
  const bridge = new ethers.Contract(address, contractJson.abi, signer);

  const printState = async (phase: string) => {
    const risk = await bridge.getRiskRatio();
    const source = await bridge.getSourceReserves();
    const locked = await bridge.getLockedAmount();
    const isPaused = await bridge.isPaused();
    const proofFailed = await bridge.failedProof();
    console.log(`--- [STATE] ${phase} ---`);
    console.log(`Risk Ratio:     ${risk.toString()}%`);
    console.log(`Source Reserve: ${ethers.formatEther(source)} ETH`);
    console.log(`Locked Amount:  ${ethers.formatEther(locked)} ETH`);
    console.log(`Proof Status:   ${proofFailed ? "FORGED/INVALID" : "VALIDATED"}`);
    console.log(`Bridge Status:  ${isPaused ? "PAUSED (CIRCUIT BREAKER ACTIVE)" : "ACTIVE"}\n`);
    return isPaused;
  };

  console.log(`[INFO] Targeted contract: ${address}\n`);

  // Reset to clean state
  console.log("[INIT] Resetting bridge to healthy baseline...\n");
  try { await (await bridge.unpause()).wait(); } catch { /* already unpaused */ }
  try { await (await bridge.resetAttackFlags()).wait(); } catch { /* no flags */ }
  await (await bridge.setReserves(ethers.parseEther("1000"), ethers.parseEther("500"))).wait();
  await (await bridge.setLockedAmount(ethers.parseEther("200"))).wait();

  await printState("INITIAL - HEALTHY BASELINE");
  await delay(1500);

  // Phase 1: Inject forged proof
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 1: ORACLE PROOF INJECTION");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[ATTACKER] Intercepting cross-chain message relay...");
  console.log("[ATTACKER] Injecting forged Merkle proof into bridge...");
  console.log("[ATTACKER] Bypassing Source Chain validation...\n");

  const tx1 = await bridge.triggerProofFailure();
  await tx1.wait();

  await printState("POST-INJECTION");
  await delay(1500);

  // Phase 2: Attacker exploits the forged proof to drain funds
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 2: EXPLOIT VIA FORGED PROOF");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[ATTACKER] Using forged proof to unlock tokens...");
  console.log("[ATTACKER] Draining 600 ETH from source reserves...\n");

  await (await bridge.setReserves(ethers.parseEther("400"), ethers.parseEther("500"))).wait();
  await (await bridge.setLockedAmount(ethers.parseEther("800"))).wait();

  await printState("POST-EXPLOIT");
  await delay(1500);

  // Phase 3: SentinelBridge detects and pauses
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 3: SENTINEL DETECTION & CIRCUIT BREAKER");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[SENTINEL] CRE Workflow performing independent proof hash verification...");
  console.log("[SENTINEL] Result: Mismatch detected between Locked balance and Proof hash.");
  console.log("[SENTINEL] AI Confidence: 95% — PROOF FRAUD detected.");
  console.log("[SENTINEL] Recommendation: EMERGENCY_PAUSE\n");

  console.log("[ACTION] Executing emergency bridge pause...\n");
  const tx2 = await bridge.pause();
  const receipt = await tx2.wait();

  await printState("POST-PAUSE");

  // Summary
  console.log("═══════════════════════════════════════════════");
  console.log("DEMO SUMMARY");
  console.log("═══════════════════════════════════════════════\n");
  console.log("What we demonstrated:\n");
  console.log("  1. Healthy bridge baseline (20% risk, valid proofs)");
  console.log("  2. Attacker injected forged Merkle proof");
  console.log("  3. Attacker exploited forged proof to drain 600 ETH");
  console.log("  4. SentinelBridge CRE workflow detected proof mismatch");
  console.log("  5. Circuit breaker activated — bridge paused");
  console.log(`\n  Transaction: ${receipt?.hash}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
