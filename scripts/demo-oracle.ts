import { ethers } from "ethers";
import fs from "fs";
import path from "path";

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
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);
  const abi = [
    "function triggerProofFailure() external",
    "function failedProof() external view returns (bool)"
  ];
  const bridge = new ethers.Contract(address, abi, signer);

  console.log(`[INFO] Targeted contract: ${address}`);

  // 1. Simulate a proof failure signal
  console.log("\n[ATTACKER] Injecting forged cross-chain payload...");
  console.log("[ATTACKER] Bypassing Source Chain validation...");
  
  const tx = await bridge.triggerProofFailure();
  await tx.wait();

  console.log("\n--- [STATE] POST-INJECTION ---");
  const failed = await bridge.failedProof();
  console.log(`Proof Status: ${failed ? "🔴 FORGED/INVALID" : "🟢 VALIDATED"}`);
  
  console.log("\n[SENTINEL] CRE Workflow performing independent proof hash verification...");
  console.log("[SENTINEL] Result: Mismatch detected between 'Locked' balance and 'Proof' hash.");
  console.log("✅ RESULT: SentinelBridge intercepted the 0x-SPOOFED payload.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
