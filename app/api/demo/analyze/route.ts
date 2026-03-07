import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === "analyze") {
      // 1. Read config to get Groq API Key and baseline
      const configPath = path.join(process.cwd(), "src/workflows/sentinel-bridge/config.json");
      if (!fs.existsSync(configPath)) {
        return NextResponse.json({ error: "Missing config.json" }, { status: 400 });
      }
      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const groqKey = configData.groqApiKey;

      if (!groqKey || groqKey === "gsk_...") {
        return NextResponse.json({ 
          assessment: "No AI Key Configured",
          confidence: 0,
          details: "Please configure a valid Groq API key in src/workflows/sentinel-bridge/config.json to enable Threat Analytics.",
          recommendation: "MONITOR"
        });
      }

      // 2. Fetch the current bridge state via local RPC call
      const bridgeAddressPath = path.join(process.cwd(), "tmp/bridge-address.json");
      if (!fs.existsSync(bridgeAddressPath)) {
        return NextResponse.json({ error: "Contract not deployed" }, { status: 400 });
      }
      const { address: contractAddress } = JSON.parse(fs.readFileSync(bridgeAddressPath, "utf-8"));

      // Read ABI
      const abiPath = path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json");
      if (!fs.existsSync(abiPath)) {
        return NextResponse.json({ error: "ABI not found" }, { status: 400 });
      }

      // Quick script to fetch on-chain state via ethers (using ESM since package.js is type: module)
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
      riskRatio: Number(riskRatio),
      sourceReserve: ethers.formatEther(source),
      destReserve: ethers.formatEther(dest),
      lockedAmount: ethers.formatEther(locked),
      isPaused: paused,
      governanceCompromised: govCompromised,
      failedProof: proofFailed
    }));
}
main();
      `;

      const tmpScriptPath = path.join(process.cwd(), "tmp/fetch-state-tmp.js");
      fs.writeFileSync(tmpScriptPath, scriptCode);

      let onchainState;
      try {
        const { stdout } = await execAsync(`node ${tmpScriptPath}`);
        onchainState = JSON.parse(stdout);
      } catch (err: any) {
        console.error("fetch-state script failed:", err.message);
        console.error("stdout:", err.stdout);
        console.error("stderr:", err.stderr);
        return NextResponse.json({ 
          error: "Failed to read on-chain state",
          details: err.message,
          stderr: err.stderr
        }, { status: 500 });
      } finally {
        fs.unlinkSync(tmpScriptPath);
      }

      // Calculate velocity indicators for the AI
      const baselineLocked = 200; // baseline locked amount in ETH
      const currentLocked = parseFloat(onchainState.lockedAmount);
      const lockedDelta = currentLocked - baselineLocked;
      let velocityIndicator = "NORMAL";
      if (lockedDelta >= 500) velocityIndicator = "SINGLE_BLOCK_SPIKE";
      else if (lockedDelta >= 50) velocityIndicator = "GRADUAL_INCREASE";

      const systemPrompt = `You are SentinelBridge AI, an advanced on-chain risk analyst. 
Analyze the following live bridge state and provide a JSON response. 
You must return ONLY a raw JSON object with exactly the following structure, no markdown, no other text:
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

Baseline normal Risk Ratio is ~20% (200 ETH locked / 1000 ETH reserves). Hard pause is typically at 80%.

Live Telemetry:
- Risk Ratio: ${onchainState.riskRatio}%
- Locked Amount: ${onchainState.lockedAmount} ETH
- Source Reserves: ${onchainState.sourceReserve} ETH
- Destination Reserves: ${onchainState.destReserve} ETH
- Locked Delta from Baseline: ${lockedDelta.toFixed(1)} ETH
- Velocity Indicator: ${velocityIndicator}
- Circuit Breaker Status: ${onchainState.isPaused ? "ACTIVATED" : "INACTIVE"}
- Unauthorized Governance Event: ${onchainState.governanceCompromised ? "CRITICAL_DETECTED" : "None"}
- Proof Verification Failure: ${onchainState.failedProof ? "CRITICAL_DETECTED" : "None"}`;

      // 4. Call Groq
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

      if (!groqRes.ok) {
        const errorText = await groqRes.text();
        console.error("Groq API Error Body:", errorText);
        throw new Error(`Groq API Error: ${groqRes.statusText} - ${errorText}`);
      }

      const groqData = await groqRes.json();
      const aiResponse = JSON.parse(groqData.choices[0].message.content);

      // 5. Return state + AI analysis
      return NextResponse.json({
        state: onchainState,
        ai: aiResponse
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
