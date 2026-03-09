/**
 * Groq AI Analyzer for SentinelBridge
 *
 * Uses CRE HTTPClient to query Groq's LLaMA model for
 * intelligent risk assessment of bridge state changes.
 *
 * The AI analyzes transaction velocity, reserve ratios, and
 * anomaly scores to determine if patterns match known attack
 * vectors (flash loans, reentrancy, slow drain, state spoofing).
 *
 * Falls back to heuristic scoring if Groq is unavailable.
 */
import {
	HTTPClient,
	type Runtime,
} from '@chainlink/cre-sdk'
import type { RiskScores } from './risk-engine'

// ============ Types ============

export interface GroqAnalysis {
	aiRiskLevel: string
	attackPattern: string
	confidence: number // 0-100
	reasoning: string
	recommendation: string
	available: boolean
}


// ============ Prompt Construction ============

function buildAnalysisPrompt(
	riskScores: RiskScores,
	bridgeState: {
		sourceReserve: string
		destReserve: string
		lockedAmount: string
		riskRatio: number
	},
): string {
	const sourceETH = (BigInt(bridgeState.sourceReserve) / BigInt(1e18)).toString()
	const destETH = (BigInt(bridgeState.destReserve) / BigInt(1e18)).toString()
	const lockedETH = (BigInt(bridgeState.lockedAmount) / BigInt(1e18)).toString()
	
	return `You are an expert DeFi security analyst specializing in cross-chain bridge vulnerabilities. Your task is to assess this bridge's risk level and identify attack patterns.

## CRITICAL ASSESSMENT CRITERIA:
- ANY risk score >= 75/100 should trigger HIGH or CRITICAL risk level
- ANY governance event or proof failure = IMMEDIATE CRITICAL
- Velocity > 50x baseline = CRITICAL (flash loan pattern)
- Locked amount > 50% of reserves = HIGH (drain pattern)
- Multiple elevated scores together = ESCALATE TO HIGH/CRITICAL

## Live Bridge State
- Source Reserve: ${sourceETH} ETH (${bridgeState.sourceReserve} wei)
- Destination Reserve: ${destETH} ETH (${bridgeState.destReserve} wei)
- Locked Amount: ${lockedETH} ETH (${bridgeState.lockedAmount} wei)
- Risk Ratio: ${bridgeState.riskRatio.toFixed(1)}% (CRITICAL if >= 80%)
- Governance Compromised: ${(bridgeState as any).unauthorizedGovernanceEvent ? "YES - CRITICAL" : "No"}
- Proof Failed: ${(bridgeState as any).failedProofVerification ? "YES - CRITICAL" : "No"}

## Heuristic Scores (0-100 scale)
- Liquidity Velocity: ${riskScores.velocityScore} (rate-of-change from baseline)
- Statistical Anomaly: ${riskScores.anomalyScore} (3-sigma deviation detection)
- Oracle Drift: ${riskScores.oracleDriftScore} (reserve ratio divergence)
- Overall Weighted: ${riskScores.overallScore} (40% velocity + 35% anomaly + 25% drift)
- Recommended Level: ${riskScores.level}

## Detected Signals & Reasons
${riskScores.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## YOUR TASK:
Analyze the above metrics and identify the attack pattern. Consider:
- Is this a flash loan (sudden spike)?
- Is this a slow drain (steady velocity)?
- Is this reentrancy or price manipulation (ratio divergence)?
- Are there institutional attack vectors (governance/proof)?

## RESPONSE FORMAT - Return ONLY valid JSON, no markdown, no extra text:
{
  "aiRiskLevel": "LOW",
  "attackPattern": "none",
  "confidence": 90,
  "reasoning": "Single sentence explaining why you chose this risk level based on the metrics.",
  "recommendation": "One sentence with recommended action: MONITOR, RATE_LIMIT, or PAUSE"
}

## FIELD REQUIREMENTS:
- aiRiskLevel: MUST be exactly one of: LOW, MEDIUM, HIGH, CRITICAL
- attackPattern: MUST be one of: none, flash_loan, slow_drain, reentrancy, price_manipulation, state_spoofing, unknown
- confidence: Integer 0-100 (your confidence in this assessment)
- reasoning: Explain your decision in one clear sentence
- recommendation: State the action in one sentence

Return ONLY the JSON object. No other text before or after.`
}


// ============ Public API ============

/**
 * Analyze bridge state using Groq AI
 *
 * @param runtime CRE Runtime context
 * @param riskScores Results from the heuristic RiskEngine
 * @param bridgeState Current bridge state snapshot
 * @param groqApiKey API key for Groq
 */
export function analyzeWithGroq<C>(
	runtime: Runtime<C>,
	riskScores: RiskScores,
	bridgeState: {
		sourceReserve: string
		destReserve: string
		lockedAmount: string
		riskRatio: number
	},
	groqApiKey: string,
): GroqAnalysis {
	const getFallbackAnalysis = (scores: RiskScores): GroqAnalysis => ({
		aiRiskLevel: scores.level,
		attackPattern: 'none',
		confidence: 0,
		reasoning: 'AI analysis failed — using heuristic scores fallback',
		recommendation: `Heuristic action: ${scores.action}`,
		available: false,
	})
	if (!groqApiKey || groqApiKey === 'YOUR_GROQ_API_KEY') {
		runtime.log('[WARN] Groq API key not configured — using heuristic analysis only')
		return {
			aiRiskLevel: riskScores.level,
			attackPattern: 'none',
			confidence: 0,
			reasoning: 'AI analysis unavailable — using heuristic scores',
			recommendation: `Heuristic action: ${riskScores.action}`,
			available: false,
		}
	}

	runtime.log('[SYSTEM] Querying Groq AI for threat intelligence...')

	const prompt = buildAnalysisPrompt(riskScores, bridgeState)

	const request = {
		method: 'POST',
		url: 'https://api.groq.com/openai/v1/chat/completions',
		headers: {
			Authorization: `Bearer ${groqApiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'llama-3.1-8b-instant',
			messages: [
				{
					role: 'system',
					content:
						'You are an AI Sentinel determining cross-chain bridge risk based on heuristic metrics. Analyze the provided data and respond ONLY in valid JSON.',
				},
				{
					role: 'user',
					content: prompt,
				},
			],
			temperature: 0.1,
			max_tokens: 250,
		}),
	}

	// Workaround for generic typing issues with sendRequest
	const httpResponse = new HTTPClient().sendRequest(runtime as any, request).result()

	if (!httpResponse || !httpResponse.body) {
		runtime.log('[WARN] Groq API returned empty response')
		return getFallbackAnalysis(riskScores)
	}

	try {
		// CRE HTTPClient returns the response body as a string when called this way
		const bodyStr = typeof httpResponse.body === 'string' 
			? httpResponse.body 
			: Buffer.from(httpResponse.body as Uint8Array).toString('utf-8')

		runtime.log(`[DEBUG] Raw Groq response: ${bodyStr.substring(0, 200)}...`)

		const groqResult = JSON.parse(bodyStr)

		if (groqResult.error) {
			runtime.log(`[ERROR] Groq API Error: ${groqResult.error.message}`)
			return getFallbackAnalysis(riskScores)
		}

		// Groq returns the result in choices[0].message.content
		const contentStr = groqResult.choices?.[0]?.message?.content || ''
		
		if (!contentStr) {
			runtime.log('[ERROR] Groq returned empty content')
			return getFallbackAnalysis(riskScores)
		}

		runtime.log(`[DEBUG] Content from Groq: ${contentStr.substring(0, 300)}...`)
		
		// Extract JSON - handle markdown wrappers and various formatting
		let jsonObj: any
		
		try {
			// Try direct parse first
			jsonObj = JSON.parse(contentStr)
		} catch (parseError) {
			runtime.log(`[DEBUG] Direct JSON parse failed, attempting extraction...`)
			
			// Try to extract JSON from markdown code blocks
			let cleanContent = contentStr
				.replace(/^```json\s*/gm, '')
				.replace(/^```\s*/gm, '')
				.replace(/\s*```$/gm, '')
				.trim()
			
			// Extract JSON object using regex
			const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
			if (jsonMatch) {
				try {
					jsonObj = JSON.parse(jsonMatch[0])
					runtime.log(`[DEBUG] Successfully extracted JSON from response`)
				} catch (innerError) {
					runtime.log(`[ERROR] Failed to parse extracted JSON: ${innerError}`)
					return getFallbackAnalysis(riskScores)
				}
			} else {
				runtime.log(`[ERROR] No JSON object found in Groq response`)
				return getFallbackAnalysis(riskScores)
			}
		}

		// Validate and normalize the response
		const aiRiskLevel = String(jsonObj.aiRiskLevel || '').toUpperCase()
		const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
		
		if (!validRiskLevels.includes(aiRiskLevel)) {
			runtime.log(`[WARN] Invalid risk level from AI: ${aiRiskLevel}, defaulting to heuristic`)
			return getFallbackAnalysis(riskScores)
		}

		const attackPattern = String(jsonObj.attackPattern || 'unknown').toLowerCase()
		const validPatterns = ['none', 'flash_loan', 'slow_drain', 'reentrancy', 'price_manipulation', 'state_spoofing', 'unknown']
		
		if (!validPatterns.includes(attackPattern)) {
			runtime.log(`[WARN] Invalid attack pattern from AI: ${attackPattern}`)
		}

		// Parse confidence as number
		let confidence = parseInt(jsonObj.confidence, 10) || 0
		confidence = Math.max(0, Math.min(100, confidence))

		const finalAnalysis = {
			aiRiskLevel,
			attackPattern: validPatterns.includes(attackPattern) ? attackPattern : 'unknown',
			confidence,
			reasoning: String(jsonObj.reasoning || 'AI assessment based on heuristic metrics'),
			recommendation: String(jsonObj.recommendation || `Heuristic action: ${riskScores.action}`),
			available: true,
		}

		runtime.log(
			`[AI_RESULT] ✓ Assessment:\n` +
			`   Risk Level:    ${finalAnalysis.aiRiskLevel}\n` +
			`   Attack Pattern: ${finalAnalysis.attackPattern}\n` +
			`   Confidence:    ${finalAnalysis.confidence}%\n` +
			`   Reasoning:     ${finalAnalysis.reasoning}\n` +
			`   Action:        ${finalAnalysis.recommendation}`
		)

		return finalAnalysis
	} catch (error) {
		runtime.log(`[ERROR] Critical failure in Groq response handling: ${error}`)
		return getFallbackAnalysis(riskScores)
	}
}
