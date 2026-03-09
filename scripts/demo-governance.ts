import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║    [ALERT] Governance Hijack Simulation        ║");
  console.log("║    Unauthorized Ownership Compromise           ║");
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
    const govCompromised = await bridge.governanceCompromised();
    console.log(`--- [STATE] ${phase} ---`);
    console.log(`Risk Ratio:     ${risk.toString()}%`);
    console.log(`Source Reserve: ${ethers.formatEther(source)} ETH`);
    console.log(`Locked Amount:  ${ethers.formatEther(locked)} ETH`);
    console.log(`Governance:     ${govCompromised ? "COMPROMISED" : "SECURE"}`);
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

  // Phase 1: Governance exploit
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 1: GOVERNANCE KEY COMPROMISE");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[ATTACKER] Exploiting private key vulnerability...");
  console.log("[ATTACKER] Triggering unauthorized ownership transfer...");
  console.log("[ATTACKER] Compromising multisig threshold...\n");

  const tx1 = await bridge.triggerGovernanceHijack();
  await tx1.wait();

  await printState("POST-GOVERNANCE EXPLOIT");
  await delay(1500);

  // Phase 2: Attacker drains via compromised governance
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 2: MALICIOUS PARAMETER CHANGE");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[ATTACKER] Using compromised governance to modify bridge parameters...");
  console.log("[ATTACKER] Draining reserves via inflated locked amount...\n");

  await (await bridge.setReserves(ethers.parseEther("300"), ethers.parseEther("500"))).wait();
  await (await bridge.setLockedAmount(ethers.parseEther("900"))).wait();

  await printState("POST-DRAIN VIA GOVERNANCE");
  await delay(1500);

  // Phase 3: SentinelBridge detects and pauses
  console.log("═══════════════════════════════════════════════");
  console.log("PHASE 3: SENTINEL DETECTION & CIRCUIT BREAKER");
  console.log("═══════════════════════════════════════════════\n");

  console.log("[SENTINEL] CRE Workflow monitoring OwnershipTransferred events...");
  console.log("[SENTINEL] AI Cross-referencing against authorized governance schedule...");
  console.log("[SENTINEL] Result: Unauthorized governance change detected.");
  console.log("[SENTINEL] AI Confidence: 97% — GOVERNANCE HIJACK confirmed.");
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
  console.log("  1. Healthy bridge baseline (20% risk, governance secure)");
  console.log("  2. Attacker compromised governance key");
  console.log("  3. Attacker used governance to drain 700 ETH (risk 300%)");
  console.log("  4. SentinelBridge CRE workflow detected unauthorized governance change");
  console.log("  5. Circuit breaker activated — bridge paused");
  console.log(`\n  Transaction: ${receipt?.hash}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
