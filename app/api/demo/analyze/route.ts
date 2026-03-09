import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getCachedAiResponse, setCachedAiResponse } from "@/lib/cache";
import { callGroq } from "@/lib/groq-client";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    let action = "analyze";
    try {
      const body = await request.json();
      if (body.action) action = body.action;
    } catch (e) {
      // Default to "analyze" if no JSON body is provided
    }

    if (action === "analyze") {
      // 1. Read config to get Groq API Key and baseline
      const configPath = path.join(process.cwd(), "src/workflows/sentinel-bridge/config.json");
      let groqKey = process.env.GROQ_API_KEY;
      
      if (!groqKey && fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        groqKey = configData.groqApiKey;
      }

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
        return NextResponse.json({
          state: { riskRatio: 0, sourceReserve: "0.0", destReserve: "0.0", lockedAmount: "0.0", isPaused: false },
          ai: { assessment: "AWAITING DEPLOY", confidence: 0, details: "Contract not yet deployed. Deploy the contract first to enable AI analysis.", recommendation: "MONITOR" }
        });
      }
      const { address: contractAddress } = JSON.parse(fs.readFileSync(bridgeAddressPath, "utf-8"));

      // Read ABI
      const abiPath = path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json");
      if (!fs.existsSync(abiPath)) {
        return NextResponse.json({
          state: { riskRatio: 0, sourceReserve: "0.0", destReserve: "0.0", lockedAmount: "0.0", isPaused: false },
          ai: { assessment: "ABI MISSING", confidence: 0, details: "Contract ABI not found. Build contracts first.", recommendation: "MONITOR" }
        });
      }

      // Quick script to fetch on-chain state via ethers (using ESM since package.js is type: module)
      const scriptCode = `
import { ethers } from "ethers";
import fs from "fs";

async function main() {
  try {
    const rpcUrl = "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getNetwork();
    
    const abi = JSON.parse(fs.readFileSync("${abiPath.replace(/\\/g, '/')}"))["abi"];
    const contract = new ethers.Contract("${contractAddress}", abi, provider);
    
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
      riskRatio: Number(riskRatio),
      sourceReserve: ethers.formatEther(source),
      destReserve: ethers.formatEther(dest),
      lockedAmount: ethers.formatEther(locked),
      isPaused: paused,
      governanceCompromised: govCompromised,
      failedProof: proofFailed
    }));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  }
}
main();
      `;

      const tmpScriptPath = path.join(process.cwd(), "tmp/fetch-state-tmp.js");
      fs.writeFileSync(tmpScriptPath, scriptCode);

      let onchainState;
      try {
        const { stdout } = await execAsync(`node "${tmpScriptPath}"`);
        onchainState = JSON.parse(stdout);
        
        if (!onchainState.ok) {
           return NextResponse.json({ 
             state: {
               riskRatio: 0,
               sourceReserve: "0.0",
               destReserve: "0.0",
               lockedAmount: "0.0",
               isPaused: false,
               governanceCompromised: false,
               failedProof: false
             },
             ai: {
               assessment: "OFFLINE",
               confidence: 0,
               details: "Local node is not responding or bridge is not deployed at the expected address.",
               recommendation: "INITIALIZE"
             }
           });
        }
      } catch (err: any) {
        console.error("fetch-state script failed:", err.message);
        return NextResponse.json({ 
          state: {
            riskRatio: 0,
            sourceReserve: "0.0",
            destReserve: "0.0",
            lockedAmount: "0.0",
            isPaused: false,
            governanceCompromised: false,
            failedProof: false
          },
          ai: {
            assessment: "CONNECTION ERROR",
            confidence: 0,
            details: "Failed to communicate with local simulation node.",
            recommendation: "REBOOT"
          }
        });
      } finally {
        fs.unlinkSync(tmpScriptPath);
      }

      // Calculate velocity indicators for the AI
      const currentLocked = parseFloat(onchainState.lockedAmount);
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
Analyze the following live bridge state and provide a JSON response. 
You must return ONLY a raw JSON object with exactly the following structure, no markdown, no other text:
{
  "assessment": "A short max 3-word title",
  "confidence": 95,
  "details": "A 1-2 sentence explanation of WHAT is happening based on the metrics.",
  "recommendation": "MONITOR | RATE_LIMIT | EMERGENCY_PAUSE"
}

CRITICAL CLASSIFICATION RULES (YOU MUST STRICTLY OBEY THESE BASED ON "Current Heuristic Signal"):
- If Current Heuristic Signal is "MASSIVE_EXPLOIT": assessment MUST be "MASSIVE EXPLOIT". recommendation: "EMERGENCY_PAUSE".
- If Current Heuristic Signal is "FLASH_LOAN": assessment MUST be "FLASH LOAN ATTACK". recommendation: "EMERGENCY_PAUSE".
- If Current Heuristic Signal is "STEALTH_DRAIN": assessment MUST be "STEALTH DRAIN". recommendation: "RATE_LIMIT".
- If Current Heuristic Signal is "GOV_HIJACK": assessment MUST be "GOVERNANCE HIJACK". recommendation: "EMERGENCY_PAUSE".
- If Current Heuristic Signal is "PROOF_FAIL": assessment MUST be "PROOF FRAUD". recommendation: "EMERGENCY_PAUSE".
- If Current Heuristic Signal is "NORMAL_TRAFFIC" or "NORMAL": assessment should be "NORMAL TRAFFIC". recommendation: "MONITOR".

DO NOT INVENT AN ASSESSMENT. USE ONLY THE ONES ABOVE CORRESPONDING TO THE SIGNAL.

Context:
- Baseline normal Risk Ratio is ~20% (200 ETH locked / 1000 ETH reserves). 
- Hard pause is typically at 80%.

Live Telemetry:
- Risk Ratio: ${onchainState.riskRatio}%
- Locked Amount: ${onchainState.lockedAmount} ETH
- Source Reserves: ${onchainState.sourceReserve} ETH
- Destination Reserves: ${onchainState.destReserve} ETH
- Locked Delta from 200 ETH Baseline: ${lockedDelta.toFixed(1)} ETH
- Current Heuristic Signal: ${velocityIndicator}
- Circuit Breaker Status: ${onchainState.isPaused ? "ACTIVATED" : "INACTIVE"}`;

      const cacheKey = `analyze-ai-${velocityIndicator}-${onchainState.riskRatio}-${onchainState.isPaused}`;
      const cachedResponse = getCachedAiResponse(cacheKey, 60); // Cache for 1 min
      
      let aiResponse;
      if (cachedResponse) {
        aiResponse = cachedResponse;
        console.log("[INFO] Using cached AI analyze response");
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
                console.error("Failed to parse extracted JSON in analyze", innerE);
                aiResponse = { assessment: "PARSE ERROR", confidence: 0, details: "AI returned invalid JSON.", recommendation: "MONITOR" };
              }
            } else {
              aiResponse = { assessment: "PARSE ERROR", confidence: 0, details: "AI returned invalid format.", recommendation: "MONITOR" };
            }
          }
          if (aiResponse.assessment !== "SYSTEM OFFLINE") {
             setCachedAiResponse(cacheKey, aiResponse);
          }
        } catch (error: any) {
          const isRateLimit = error?.response?.status === 429;
          if (isRateLimit) {
            console.warn("[WARN] Groq API rate limit reached. Using fallback.");
          } else {
            console.error("Groq analyze API call failed:", error.message || error);
          }
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

