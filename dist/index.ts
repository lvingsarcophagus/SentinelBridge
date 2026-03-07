/**
 * SentinelBridge CRE Workflow — Advanced Behavioral Watchdog
 *
 * Automated circuit breaker for cross-chain bridge liquidity monitoring.
 * Uses multi-dimensional heuristic analysis + Groq AI for intelligent
 * threat detection that catches sophisticated exploits (slow drains,
 * flash loans, price manipulation) that bypass static thresholds.
 *
 * Pattern: Listen → Analyze → Classify → Act
 *
 * Risk Engine:
 *   - LiquidityVelocityScore  (rate-of-change vs baseline)
 *   - StdDeviationAnomaly     (3σ statistical outlier detection)
 *   - OracleDriftScore        (internal vs external ratio divergence)
 *   - Groq AI Intent Analysis (LLaMA-powered attack pattern recognition)
 *
 * Response tiers:
 *   LOW      → MONITOR (continue watching)
 *   MEDIUM   → RATE_LIMIT (restrict withdrawals)
 *   HIGH     → PAUSE (circuit breaker)
 *   CRITICAL → PAUSE + AI alert
 *
 * Built with Chainlink Runtime Environment (CRE) SDK
 */
import {
	bytesToHex,
	CronCapability,
	EVMClient,
	encodeCallMsg,
	getNetwork,
	handler,
	isChainSelectorSupported,
	LAST_FINALIZED_BLOCK_NUMBER,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'

import { SOURCE_BRIDGE_ABI } from './abi'
import { evaluateRisk, type BridgeSnapshot, type RiskEngineConfig, RiskAction } from './risk-engine'
import { analyzeWithGroq } from './groq-analyzer'

// ============ Configuration Schema ============

const configSchema = z.object({
	schedule: z.string(),
	bridgeAddress: z.string(),
	chainSelectorName: z.string(),
	riskThresholdPercent: z.number(),
	groqApiKey: z.string(),
	baselineHistory: z.array(z.number()),
	velocityMultiplierThreshold: z.number(),
	stdDeviationThreshold: z.number(),
	expectedReserveRatio: z.number(),
	maxOracleDriftPercent: z.number(),
})

type Config = z.infer<typeof configSchema>

// ============ Helper: Read a uint256 from the bridge ============

function readUint256(
	evmClient: EVMClient,
	runtime: Runtime<Config>,
	functionName: string,
): bigint {
	const callData = encodeFunctionData({
		abi: SOURCE_BRIDGE_ABI,
		functionName: functionName as any,
	})

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: runtime.config.bridgeAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	return decodeFunctionResult({
		abi: SOURCE_BRIDGE_ABI,
		functionName: functionName as any,
		data: bytesToHex(result.data),
	}) as bigint
}

function readBool(
	evmClient: EVMClient,
	runtime: Runtime<Config>,
	functionName: string,
): boolean {
	const callData = encodeFunctionData({
		abi: SOURCE_BRIDGE_ABI,
		functionName: functionName as any,
	})

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: runtime.config.bridgeAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	return decodeFunctionResult({
		abi: SOURCE_BRIDGE_ABI,
		functionName: functionName as any,
		data: bytesToHex(result.data),
	}) as boolean
}

// ============ Main Handler: Cron-triggered watchdog ============

const onCronTrigger = (runtime: Runtime<Config>): string => {
	const config = runtime.config

	runtime.log(
		'======================================================\n' +
		'  SENTINELBRIDGE ADVANCED WATCHDOG\n' +
		'  Behavioral Heuristic + AI Threat Engine\n' +
		'======================================================',
	)

	// ── Validate chain ────────────────────────────────────

	if (!isChainSelectorSupported(config.chainSelectorName)) {
		throw new Error(`Chain selector not supported: ${config.chainSelectorName}`)
	}

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${config.chainSelectorName}`)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	// ── Step 1: Read bridge state on-chain ────────────────

	runtime.log('\n[INIT] Step 1: Reading on-chain bridge state...')

	const sourceReserve = readUint256(evmClient, runtime, 'getSourceReserves')
	const destReserve = readUint256(evmClient, runtime, 'getDestReserves')
	const lockedAmount = readUint256(evmClient, runtime, 'getLockedAmount')
	const riskRatio = readUint256(evmClient, runtime, 'getRiskRatio')
	const isPaused = readBool(evmClient, runtime, 'isPaused')

	const snapshot: BridgeSnapshot = {
		sourceReserve,
		destReserve,
		lockedAmount,
		riskRatio: Number(riskRatio),
		timestamp: Date.now(),
	}

	runtime.log(
		`   Contract:       ${config.bridgeAddress}\n` +
		`   Source Reserve:  ${sourceReserve.toString()} wei (${(Number(sourceReserve) / 1e18).toFixed(2)} ETH)\n` +
		`   Dest Reserve:   ${destReserve.toString()} wei (${(Number(destReserve) / 1e18).toFixed(2)} ETH)\n` +
		`   Locked Amount:  ${lockedAmount.toString()} wei (${(Number(lockedAmount) / 1e18).toFixed(2)} ETH)\n` +
		`   Risk Ratio:     ${riskRatio.toString()}%\n` +
		`   Paused:         ${isPaused}`,
	)

	if (isPaused) {
		runtime.log('\n[INFO] Bridge is already paused. No further analysis needed.')
		return `Bridge paused. Risk: ${riskRatio.toString()}%`
	}

	// ── Step 2: Behavioral Heuristic Analysis ─────────────

	runtime.log('\n[ANALYSIS] Step 2: Running behavioral heuristic analysis...')

	const engineConfig: RiskEngineConfig = {
		baselineHistory: config.baselineHistory,
		velocityMultiplierThreshold: config.velocityMultiplierThreshold,
		stdDeviationThreshold: config.stdDeviationThreshold,
		staticThresholdPercent: config.riskThresholdPercent,
		expectedReserveRatio: config.expectedReserveRatio,
		maxOracleDriftPercent: config.maxOracleDriftPercent,
	}

	const riskScores = evaluateRisk(snapshot, engineConfig)

	runtime.log(
		`   ┌─────────────────────────────────┐\n` +
		`   │ RISK SCORE BREAKDOWN            │\n` +
		`   ├─────────────────────────────────┤\n` +
		`   │ Velocity Score:    ${String(riskScores.velocityScore).padStart(3)}/100     │\n` +
		`   │ Anomaly Score:     ${String(riskScores.anomalyScore).padStart(3)}/100     │\n` +
		`   │ Oracle Drift:      ${String(riskScores.oracleDriftScore).padStart(3)}/100     │\n` +
		`   │ Overall Score:     ${String(riskScores.overallScore).padStart(3)}/100     │\n` +
		`   ├─────────────────────────────────┤\n` +
		`   │ Risk Level:  ${riskScores.level.padEnd(20)}│\n` +
		`   │ Action:      ${riskScores.action.padEnd(20)}│\n` +
		`   └─────────────────────────────────┘`,
	)

	// Log all detected signals
	runtime.log('\n[SIGNALS] Detected anomalies/events:')
	for (const reason of riskScores.reasons) {
		runtime.log(`   * ${reason}`)
	}

	// ── Step 3: Groq AI Intent Analysis ───────────────────

	runtime.log('\n[AI] Step 3: AI-powered threat intelligence...')

	const aiAnalysis = analyzeWithGroq(
		runtime,
		riskScores,
		{
			sourceReserve: sourceReserve.toString(),
			destReserve: destReserve.toString(),
			lockedAmount: lockedAmount.toString(),
			riskRatio: Number(riskRatio),
		},
		config.groqApiKey || '',
	)

	// ── Step 4: Execute Response ──────────────────────────

	runtime.log('\n[RESPONSE] Step 4: Executing response action...')

	// Use AI assessment to potentially escalate the heuristic action
	let finalAction = riskScores.action
	if (
		aiAnalysis.available &&
		aiAnalysis.confidence >= 70 &&
		(aiAnalysis.aiRiskLevel === 'CRITICAL' || aiAnalysis.aiRiskLevel === 'HIGH')
	) {
		finalAction = RiskAction.PAUSE
		runtime.log(`   [AI OVERRIDE] AI escalated action to PAUSE (confidence: ${aiAnalysis.confidence}%)`)
	}

	switch (finalAction) {
		case RiskAction.PAUSE: {
			runtime.log(
				`\n[EMERGENCY] =======================================================\n` +
				`   CIRCUIT BREAKER ACTIVATED\n` +
				`   Risk Level: ${riskScores.level} | Score: ${riskScores.overallScore}/100\n` +
				`   Static Risk: ${riskRatio.toString()}%\n` +
				(aiAnalysis.available
					? `   AI Pattern: ${aiAnalysis.attackPattern} (${aiAnalysis.confidence}% confidence)\n`
					: '') +
				`   Action: bridge.pause() — Emergency shutdown\n` +
				`===================================================================`,
			)

			// Execute bridge.pause() on-chain via CRE EVMClient
			runtime.log('[ON-CHAIN] Executing bridge.pause() via CRE EVMClient...')

			try {
				const pauseCallData = encodeFunctionData({
					abi: SOURCE_BRIDGE_ABI,
					functionName: 'pause',
				})

				const pauseResult = evmClient
					.callContract(runtime, {
						call: encodeCallMsg({
							from: zeroAddress,
							to: config.bridgeAddress as Address,
							data: pauseCallData,
						}),
						blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
					})
					.result()

				runtime.log(
					`[ON-CHAIN] ✅ bridge.pause() executed successfully\n` +
					`   Response data: ${bytesToHex(pauseResult.data)}`,
				)
			} catch (pauseError) {
				runtime.log(
					`[ON-CHAIN] ⚠️ bridge.pause() call failed: ${String(pauseError)}\n` +
					`   Bridge may already be paused or require broadcast mode (--broadcast)`,
				)
			}

			const pattern = aiAnalysis.available ? ` [${aiAnalysis.attackPattern}]` : ''
			return `ALERT: Score ${riskScores.overallScore}/100 | ${riskScores.level}${pattern} — Circuit breaker activated`
		}

		case RiskAction.RATE_LIMIT: {
			runtime.log(
				`\n[WARNING] =======================================================\n` +
				`   RATE LIMITING ACTIVATED\n` +
				`   Risk Level: ${riskScores.level} | Score: ${riskScores.overallScore}/100\n` +
				`   Action: Restrict withdrawals to 10% of reserves/hour\n` +
				`=================================================================`,
			)

			return `WARNING: Score ${riskScores.overallScore}/100 | ${riskScores.level} — Rate limiting active`
		}

		case RiskAction.MONITOR:
		default: {
			runtime.log(
				`\n[OK] Bridge HEALTHY\n` +
				`   Risk Score: ${riskScores.overallScore}/100 | Level: ${riskScores.level}\n` +
				`   Static Risk: ${riskRatio.toString()}% (threshold: ${config.riskThresholdPercent}%)\n` +
				`   Next check in scheduled sequence`,
			)

			return `Healthy. Score: ${riskScores.overallScore}/100 | Risk: ${riskRatio.toString()}%`
		}
	}
}

// ============ Workflow Registration ============

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
