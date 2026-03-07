import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. Fetch current bridge state via local RPC
    const bridgeAddressPath = path.join(process.cwd(), "tmp/bridge-address.json");
    if (!fs.existsSync(bridgeAddressPath)) {
      return NextResponse.json({ error: "Contract not deployed" }, { status: 400 });
    }
    const { address: contractAddress } = JSON.parse(fs.readFileSync(bridgeAddressPath, "utf-8"));

    const abiPath = path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json");
    if (!fs.existsSync(abiPath)) {
      return NextResponse.json({ error: "ABI not found" }, { status: 400 });
    }

    const scriptCode = `
import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const abi = JSON.parse(fs.readFileSync("${abiPath.replace(/\\/g, '/')}"))["abi"];
  const contract = new ethers.Contract("${contractAddress}", abi, provider);
  const riskRatio = await contract.getRiskRatio();
  const source = await contract.getSourceReserves();
  const dest = await contract.getDestReserves();
  const locked = await contract.getLockedAmount();
  const paused = await contract.isPaused();
  const govCompromised = await contract.governanceCompromised();
  const proofFailed = await contract.failedProof();
  console.log(JSON.stringify({
    ok: true,
    isPaused: paused,
    riskRatio: Number(riskRatio),
    sourceReserve: ethers.formatEther(source),
    destReserve: ethers.formatEther(dest),
    targetLocked: ethers.formatEther(locked),
    lastCheck: new Date().toISOString(),
    lastTransactionHash: null,
    governanceCompromised: govCompromised,
    failedProof: proofFailed
  }));
}
main();
    `;

    const tmpScriptPath = path.join(process.cwd(), "tmp/fetch-status-tmp.js");
    fs.writeFileSync(tmpScriptPath, scriptCode);

    let onchainState;
    try {
      const { stdout } = await execAsync(`node ${tmpScriptPath}`);
      onchainState = JSON.parse(stdout);
    } catch (err: any) {
      console.error("fetch-status script failed:", err.message);
      return NextResponse.json({ error: "Failed to read state" }, { status: 500 });
    } finally {
      if (fs.existsSync(tmpScriptPath)) {
        fs.unlinkSync(tmpScriptPath);
      }
    }

    // 2. Call Groq for AI Assessment
    const configPath = path.join(process.cwd(), "src/workflows/sentinel-bridge/config.json");
    let aiResponse = {
      assessment: "SYSTEM OFFLINE",
      confidence: 0,
      details: "No active AI config found.",
      recommendation: "MONITOR"
    };

    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const groqKey = configData.groqApiKey;

      if (groqKey && groqKey !== "gsk_...") {
        // Calculate velocity indicators for the AI
        const baselineLocked = 200; // baseline locked amount in ETH
        const currentLocked = parseFloat(onchainState.targetLocked);
        const lockedDelta = currentLocked - baselineLocked;
        let velocityIndicator = "NORMAL";
        if (lockedDelta >= 500) velocityIndicator = "SINGLE_BLOCK_SPIKE";
        else if (lockedDelta >= 50) velocityIndicator = "GRADUAL_INCREASE";

        const systemPrompt = `You are SentinelBridge AI, an advanced on-chain risk analyst. 
Analyze the following live bridge state and provide a JSON response exactly matching this structure, no markdown:
{
  "assessment": "A short max 3-word title",
  "confidence": 95,
  "details": "A 1-2 sentence explanation of WHAT is happening based on the metrics.",
  "recommendation": "MONITOR"
}

CRITICAL CLASSIFICATION RULES:
- If Velocity Indicator is "SINGLE_BLOCK_SPIKE" (delta >= 500 ETH in one observation): assessment MUST be "FLASH LOAN CRISIS" or "FLASH CRISIS"
- If Velocity Indicator is "GRADUAL_INCREASE" (delta 50-500 ETH over multiple observations): assessment should be "STEALTH DRAIN" 
- If Governance Event is CRITICAL_DETECTED: assessment should be "GOVERNANCE HIJACK"
- If Proof Failure is CRITICAL_DETECTED: assessment should be "PROOF FRAUD"
- If Risk < 30% and velocity is NORMAL: assessment should be "NORMAL CLEAR"

Baseline normal Risk Ratio is ~20% (200 ETH locked / 1000 ETH reserves). Hard pause is at 80%.

Live Telemetry:
- Risk Ratio: ${onchainState.riskRatio}%
- Locked Amount: ${onchainState.targetLocked} ETH
- Source Reserves: ${onchainState.sourceReserve} ETH
- Destination Reserves: ${onchainState.destReserve} ETH
- Locked Delta from Baseline: ${lockedDelta.toFixed(1)} ETH
- Velocity Indicator: ${velocityIndicator}
- Circuit Breaker Status: ${onchainState.isPaused ? "ACTIVATED" : "INACTIVE"}
- Unauthorized Governance Event: ${onchainState.governanceCompromised ? "CRITICAL_DETECTED" : "None"}
- Proof Verification Failure: ${onchainState.failedProof ? "CRITICAL_DETECTED" : "None"}`;

        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: systemPrompt }],
              temperature: 0.1,
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            aiResponse = JSON.parse(groqData.choices[0].message.content);
          }
        } catch (e) {
          console.error("Groq status integration failed:", e);
        }
      }
    }

    // Attach AI response to the main payload
    return NextResponse.json({ ...onchainState, ai: aiResponse });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
