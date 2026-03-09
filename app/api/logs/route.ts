import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const activityLogPath = path.join(process.cwd(), "tmp/simulation-activity.log");
    let logs: string[] = [];

    // Prioritize real simulation logs if they exist
    if (fs.existsSync(activityLogPath)) {
      const content = fs.readFileSync(activityLogPath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim() && !l.includes("--- Starting"));
      if (lines.length > 0) {
        logs = lines.slice(-15).map(l => l.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-z]/g, "").trim());
      }
    }

    if (logs.length > 0) {
      return NextResponse.json({
        logs,
        timestamp: new Date().toISOString(),
      });
    }

    const bridgeAddressPath = path.join(process.cwd(), "tmp/bridge-address.json");
    if (!fs.existsSync(bridgeAddressPath)) {
      return NextResponse.json({
        logs: ["[INFO] System ready. Waiting for bridge deployment..."],
        timestamp: new Date().toISOString()
      });
    }

    const { address: contractAddress } = JSON.parse(fs.readFileSync(bridgeAddressPath, "utf-8"));
    const abiPath = path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json");

    const scriptCode = `
import { ethers } from "ethers";
import fs from "fs";

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const abi = JSON.parse(fs.readFileSync("${abiPath.replace(/\\/g, '/')}"))["abi"];
    const contract = new ethers.Contract("${contractAddress}", abi, provider);
    const riskRatio = await contract.getRiskRatio();
    const paused = await contract.isPaused();
    console.log(JSON.stringify({ riskRatio: Number(riskRatio), isPaused: paused }));
  } catch (e) { console.log(JSON.stringify({ error: e.message })); }
}
main();`;

    const tmpPath = path.join(process.cwd(), "tmp/log-state-tmp.js");
    fs.writeFileSync(tmpPath, scriptCode);
    

    // If no simulation logs or they are stale, show watchdog status
    if (logs.length === 0) {
      try {
        const { stdout } = await execAsync(`node "${tmpPath}"`);
        const state = JSON.parse(stdout);
        
        if (state.error) {
          logs = ["[ERROR] Local node connection failed. Start Hardhat node to see live logs."];
        } else {
          logs = [
            `📡 SentinelBridge Watchdog Active [${new Date().toLocaleTimeString()}]`,
            `🔍 Analyzing liquidity pool at ${contractAddress.slice(0, 10)}...`,
            `📊 Current Risk Ratio: ${state.riskRatio}.00%`,
            state.isPaused 
              ? "🚨 [EMERGENCY] Circuit Breaker ACTIVATED. Bridge operations halted."
              : state.riskRatio > 50 
                ? "⚠️ [WARN] High velocity detected. Monitoring for exploit patterns."
                : "✅ Bridge health check passed. Status: HEALTHY",
            state.riskRatio > 70 ? "📢 AI recommendation: EMERGENCY_PAUSE" : "📄 Intent Analysis: Normal operations continuing"
          ];
        }
      } catch (e) {
        logs = ["[ERROR] Failed to fetch live telemetry for logs."];
      }
    }
    
    // Ensure tmpPath is always cleaned up
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    return NextResponse.json({
      logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ logs: ["[ERROR] Log engine failure"], timestamp: new Date().toISOString() }, { status: 500 });
  }
}
