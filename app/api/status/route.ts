import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getCachedAiResponse, setCachedAiResponse } from "@/lib/cache";
import { callGroq } from "@/lib/groq-client";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. Fetch current bridge state via local RPC
    const bridgeAddressPath = path.join(process.cwd(), "tmp/bridge-address.json");
    if (!fs.existsSync(bridgeAddressPath)) {
      return NextResponse.json({ 
        ok: false, 
        isPaused: false,
        riskRatio: 0,
        sourceReserve: "0.0",
        destReserve: "0.0",
        targetLocked: "0.0",
        lastCheck: new Date().toISOString(),
        error: "Contract not deployed. Please run 'pnpm run node:deploy'."
      });
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
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    // Check if node is actually responsive
    await provider.getNetwork();
    
    const abi = JSON.parse(fs.readFileSync("${abiPath.replace(/\\/g, '/')}"))["abi"];
    const contract = new ethers.Contract("${contractAddress}", abi, provider);
    
    // Attempt calls, default to null/zero if they fail (contract might not be at this address)
    let riskRatio = 0, source = 0n, dest = 0n, locked = 0n, paused = false, govCompromised = false, proofFailed = false;
    
    try { riskRatio = await contract.getRiskRatio(); } catch(e) {}
    try { source = await contract.getSourceReserves(); } catch(e) {}
    try { dest = await contract.getDestReserves(); } catch(e) {}
    try { locked = await contract.getLockedAmount(); } catch(e) {}
    try { paused = await contract.isPaused(); } catch(e) {}
    try { govCompromised = await contract.governanceCompromised(); } catch(e) {}
    try { proofFailed = await contract.failedProof(); } catch(e) {}

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
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  }
}
main();
    `;

    const tmpScriptPath = path.join(process.cwd(), "tmp/fetch-status-tmp.js");
    fs.writeFileSync(tmpScriptPath, scriptCode);

    let onchainState;
    try {
      const { stdout } = await execAsync(`node "${tmpScriptPath}"`);
      onchainState = JSON.parse(stdout);
      
      if (!onchainState.ok) {
        return NextResponse.json({ 
          ok: false, 
          isPaused: false,
          riskRatio: 0,
          sourceReserve: "0.0",
          destReserve: "0.0",
          targetLocked: "0.0",
          lastCheck: new Date().toISOString(),
          error: "Node connection failed"
        });
      }
    } catch (err: any) {
      console.error("fetch-status execution failed:", err.message);
      return NextResponse.json({ 
        ok: false, 
        isPaused: false,
        riskRatio: 0,
        sourceReserve: "0.0",
        destReserve: "0.0",
        targetLocked: "0.0",
        lastCheck: new Date().toISOString(),
        error: "Script execution failed" 
      });
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
        const currentLocked = parseFloat(onchainState.targetLocked);
        const currentSource = parseFloat(onchainState.sourceReserve);
        
        const lockedDelta = currentLocked - 200; 
        const sourceDelta = 1000 - currentSource; 
        
        let velocityIndicator = "NORMAL";
        if (onchainState.governanceCompromised) velocityIndicator = "GOV_HIJACK";
        else if (onchainState.failedProof) velocityIndicator = "PROOF_FAIL";
        else if (sourceDelta >= 500) velocityIndicator = "MASSIVE_EXPLOIT";
        else if (lockedDelta >= 600) velocityIndicator = "FLASH_LOAN";
        else if (lockedDelta >= 50) velocityIndicator = "STEALTH_DRAIN";
        else if (lockedDelta > 5 || sourceDelta > 5) velocityIndicator = "NORMAL_TRAFFIC";

        const systemPrompt = `You are SentinelBridge AI, an advanced on-chain risk analyst. 
Analyze the following live bridge state and provide a JSON response exactly matching this structure, no markdown:
{
  "assessment": "A short max 3-word title",
  "confidence": 95,
  "details": "A 1-2 sentence explanation of WHAT is happening based on the metrics.",
  "recommendation": "MONITOR"
}

CRITICAL CLASSIFICATION RULES:
- If Velocity Indicator is "MASSIVE_EXPLOIT": assessment MUST be "MASSIVE EXPLOIT". recommendation: "EMERGENCY_PAUSE".
- If Velocity Indicator is "FLASH_LOAN": assessment MUST be "FLASH LOAN ATTACK". recommendation: "EMERGENCY_PAUSE".
- If Velocity Indicator is "STEALTH_DRAIN": assessment MUST be "STEALTH DRAIN". recommendation: "RATE_LIMIT".
- If Velocity Indicator is "GOV_HIJACK": assessment MUST be "GOVERNANCE HIJACK". recommendation: "EMERGENCY_PAUSE".
- If Velocity Indicator is "PROOF_FAIL": assessment MUST be "PROOF FRAUD". recommendation: "EMERGENCY_PAUSE".
- If Velocity Indicator is "NORMAL_TRAFFIC" or "NORMAL": assessment should be "NORMAL TRAFFIC". recommendation: "MONITOR".

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

        const cacheKey = `status-ai-${velocityIndicator}-${onchainState.riskRatio}-${onchainState.isPaused}`;
        const cachedResponse = getCachedAiResponse(cacheKey, 60); // Cache for 1 min
        
        if (cachedResponse) {
          aiResponse = cachedResponse;
          console.log("[INFO] Using cached AI status response");
        } else {
          try {
            const content = await callGroq(groqKey, systemPrompt);
              
            try {
              aiResponse = JSON.parse(content);
            } catch (e) {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  aiResponse = JSON.parse(jsonMatch[0]);
                } catch (innerE) {
                  console.error("Failed to parse extracted JSON in status", innerE);
                }
              }
            }
            if (aiResponse.assessment !== "SYSTEM OFFLINE") {
               setCachedAiResponse(cacheKey, aiResponse);
            }
          } catch (e) {
            console.error("Groq status integration failed:", e);
            aiResponse = {
              assessment: velocityIndicator === "MASSIVE_EXPLOIT" ? "MASSIVE EXPLOIT" : 
                          velocityIndicator === "FLASH_LOAN" ? "FLASH LOAN ATTACK" :
                          velocityIndicator === "STEALTH_DRAIN" ? "STEALTH DRAIN" :
                          velocityIndicator === "GOV_HIJACK" ? "GOVERNANCE HIJACK" :
                          velocityIndicator === "PROOF_FAIL" ? "PROOF FRAUD" : "NORMAL TRAFFIC",
              confidence: 85,
              details: "AI API unavailable. Using heuristic fallback analysis.",
              recommendation: velocityIndicator === "NORMAL_TRAFFIC" || velocityIndicator === "NORMAL" ? "MONITOR" : 
                              velocityIndicator === "STEALTH_DRAIN" ? "RATE_LIMIT" : "EMERGENCY_PAUSE"
            };
          }
        }
      }
    }

    // Attach AI response to the main payload
    return NextResponse.json({ ...onchainState, ai: aiResponse });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
