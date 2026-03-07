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
	return `You are a DeFi security analyst AI. Analyze the following cross-chain bridge state for potential exploits.

## Bridge State Snapshot
- Source Reserve: ${bridgeState.sourceReserve} wei
- Dest Reserve: ${bridgeState.destReserve} wei  
- Locked Amount: ${bridgeState.lockedAmount} wei
- Static Risk Ratio: ${bridgeState.riskRatio}%
- Unauthorized Governance Event: ${(bridgeState as any).unauthorizedGovernanceEvent ? "DETECTED" : "None"}
- Proof Verification Failure: ${(bridgeState as any).failedProofVerification ? "DETECTED" : "None"}

## Heuristic Analysis Results
- Liquidity Velocity Score: ${riskScores.velocityScore}/100
- Statistical Anomaly Score: ${riskScores.anomalyScore}/100 
- Oracle Drift Score: ${riskScores.oracleDriftScore}/100
- Overall Weighted Score: ${riskScores.overallScore}/100
- Heuristic Risk Level: ${riskScores.level}

## Detected Signals
${riskScores.reasons.map((r) => `- ${r}`).join('\n')}

## Instructions
Based on this data, return EXACTLY this JSON format (no markdown, no quotes, no text outside the JSON):
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "attackPattern": "none|flash_loan|slow_drain|reentrancy|price_manipulation|state_spoofing|unknown",
  "confidence": <0-100>,
  "reasoning": "<one sentence explaining your assessment>",
  "recommendation": "<one sentence: what action to take>"
}`
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

		const groqResult = JSON.parse(bodyStr)

		if (groqResult.error) {
			runtime.log(`[ERROR] Groq API Error: ${groqResult.error.message}`)
			return getFallbackAnalysis(riskScores)
		}

		// Groq returns the result in choices[0].message.content
		const contentStr = groqResult.choices?.[0]?.message?.content || '{}'
		
		// Remove markdown formatting if present
		const cleanContent = contentStr.replace(/```json\n?|\n?```/g, '').trim()
		const parsedAnalysis = JSON.parse(cleanContent)

		const finalAnalysis = {
			aiRiskLevel: parsedAnalysis.aiRiskLevel || riskScores.level,
			attackPattern: parsedAnalysis.attackPattern || 'unknown',
			confidence: parsedAnalysis.confidence || 0,
			reasoning: parsedAnalysis.reasoning || 'No reasoning provided',
			recommendation: parsedAnalysis.recommendation || `Heuristic action: ${riskScores.action}`,
			available: true,
		}

		runtime.log(
			`[AI_RESULT] Assessment:\n` +
			`   Risk Level:    ${finalAnalysis.aiRiskLevel}\n` +
			`   Attack Pattern: ${finalAnalysis.attackPattern}\n` +
			`   Confidence:    ${finalAnalysis.confidence}%\n` +
			`   Reasoning:     ${finalAnalysis.reasoning}\n` +
			`   Action:        ${finalAnalysis.recommendation}`
		)

		return finalAnalysis
	} catch (error) {
		runtime.log(`[ERROR] Failed to parse Groq response: ${error}`)
		return getFallbackAnalysis(riskScores)
	}
}
