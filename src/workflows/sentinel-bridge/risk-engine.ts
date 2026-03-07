/**
 * SentinelBridge Advanced Risk Engine
 *
 * Multi-dimensional behavioral analysis for detecting sophisticated exploits
 * that bypass simple static threshold checks (flash loans, slow drains,
 * reentrancy-based price manipulation, cross-chain state spoofing).
 *
 * Scoring dimensions:
 *   1. LiquidityVelocityScore  — rate-of-change vs baseline (catches slow drains)
 *   2. StdDeviationAnomaly     — statistical outlier detection (3σ rule)
 *   3. OracleDriftScore        — internal vs expected ratio divergence
 *
 * Risk classification: LOW → MEDIUM → HIGH → CRITICAL
 */

// ============ Types ============

export enum RiskLevel {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	CRITICAL = 'CRITICAL',
}

export enum RiskAction {
	MONITOR = 'MONITOR',
	RATE_LIMIT = 'RATE_LIMIT',
	PAUSE = 'PAUSE',
}

export interface BridgeSnapshot {
	sourceReserve: bigint
	destReserve: bigint
	lockedAmount: bigint
	riskRatio: number // 0-100
	timestamp: number

	// Advanced Institutional Vectors
	unauthorizedGovernanceEvent?: boolean
	failedProofVerification?: boolean
}

export interface RiskScores {
	velocityScore: number       // 0-100
	anomalyScore: number        // 0-100
	oracleDriftScore: number    // 0-100
	overallScore: number        // 0-100
	level: RiskLevel
	action: RiskAction
	reasons: string[]
}

export interface RiskEngineConfig {
	/** Baseline historical observations (locked amounts in ETH) */
	baselineHistory: number[]
	/** Multiplier: current velocity > baseline × this = alert */
	velocityMultiplierThreshold: number
	/** Standard deviations above mean to flag */
	stdDeviationThreshold: number
	/** Static risk ratio threshold (fallback) */
	staticThresholdPercent: number
	/** Expected source/dest reserve ratio (healthy = ~2.0 for 1000/500) */
	expectedReserveRatio: number
	/** Max acceptable drift from expected ratio */
	maxOracleDriftPercent: number
}

// ============ Statistical Utilities ============

function mean(values: number[]): number {
	if (values.length === 0) return 0
	return values.reduce((sum, v) => sum + v, 0) / values.length
}

function standardDeviation(values: number[]): number {
	if (values.length < 2) return 0
	const avg = mean(values)
	const squaredDiffs = values.map((v) => (v - avg) ** 2)
	return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1))
}

// ============ Score Calculators ============

/**
 * Liquidity Velocity Score
 *
 * Tracks how fast locked amount is increasing relative to baseline.
 * A slow-drain attack shows a steady, abnormal velocity even if each
 * individual reading is under the static threshold.
 */
export function computeVelocityScore(
	currentLocked: number,
	history: number[],
	multiplierThreshold: number,
): { score: number; velocity: number; baselineAvg: number; reasons: string[] } {
	const reasons: string[] = []

	if (history.length < 2) {
		return { score: 0, velocity: 0, baselineAvg: 0, reasons: ['Insufficient history for velocity analysis'] }
	}

	// Calculate baseline average change between consecutive observations
	const changes: number[] = []
	for (let i = 1; i < history.length; i++) {
		changes.push(Math.abs(history[i] - history[i - 1]))
	}
	const baselineAvgChange = mean(changes)

	// Current velocity = change from last observation to now
	const lastObservation = history[history.length - 1]
	const currentVelocity = Math.abs(currentLocked - lastObservation)

	// Score based on how many multiples of baseline the current velocity is
	let score = 0
	if (baselineAvgChange > 0) {
		const velocityMultiple = currentVelocity / baselineAvgChange

		if (velocityMultiple >= multiplierThreshold * 3) {
			score = 100
			reasons.push(`[CRITICAL] Extreme velocity: ${velocityMultiple.toFixed(1)}x baseline (${multiplierThreshold * 3}x threshold)`)
		} else if (velocityMultiple >= multiplierThreshold) {
			score = Math.min(85, Math.round(velocityMultiple / multiplierThreshold * 30))
			reasons.push(`[HIGH] High velocity: ${velocityMultiple.toFixed(1)}x baseline (${multiplierThreshold}x threshold)`)
		} else if (velocityMultiple >= multiplierThreshold * 0.5) {
			score = Math.round(velocityMultiple / multiplierThreshold * 20)
			reasons.push(`[MEDIUM] Elevated velocity: ${velocityMultiple.toFixed(1)}x baseline`)
		}
	} else if (currentVelocity > 0) {
		// Baseline was zero change, any change is notable
		score = 60
		reasons.push(`[WARN] Non-zero velocity with zero baseline change: ${currentVelocity.toFixed(2)} ETH`)
	}

	return { score, velocity: currentVelocity, baselineAvg: baselineAvgChange, reasons }
}

/**
 * Standard Deviation Anomaly Score
 *
 * Uses the 3σ rule: if current locked amount is more than N standard
 * deviations from the historical mean, it's a statistical anomaly.
 * This is mathematically defensible and catches gradual threshold-dodging.
 */
export function computeAnomalyScore(
	currentLocked: number,
	history: number[],
	stdDevThreshold: number,
): { score: number; zScore: number; mean: number; stdDev: number; reasons: string[] } {
	const reasons: string[] = []

	if (history.length < 3) {
		return { score: 0, zScore: 0, mean: 0, stdDev: 0, reasons: ['Insufficient data for anomaly detection'] }
	}

	const avg = mean(history)
	const stdDev = standardDeviation(history)

	if (stdDev === 0) {
		// All historical values are the same — any deviation is anomalous
		const isAnomaly = currentLocked !== avg
		return {
			score: isAnomaly ? 70 : 0,
			zScore: isAnomaly ? 999 : 0,
			mean: avg,
			stdDev: 0,
			reasons: isAnomaly ? ['Zero-variance history — any deviation is anomalous'] : [],
		}
	}

	// Z-score: how many standard deviations from the mean
	const zScore = (currentLocked - avg) / stdDev

	let score = 0
	if (Math.abs(zScore) >= stdDevThreshold * 2) {
		score = 100
		reasons.push(`[CRITICAL] Extreme anomaly: Z-score ${zScore.toFixed(2)} (${stdDevThreshold * 2} std-dev threshold)`)
	} else if (Math.abs(zScore) >= stdDevThreshold) {
		score = Math.min(85, Math.round(Math.abs(zScore) / stdDevThreshold * 30))
		reasons.push(`[HIGH] Statistical anomaly: Z-score ${zScore.toFixed(2)} (${stdDevThreshold} std-dev threshold)`)
	} else if (Math.abs(zScore) >= stdDevThreshold * 0.5) {
		score = Math.round(Math.abs(zScore) / stdDevThreshold * 15)
		reasons.push(`[MEDIUM] Elevated deviation: Z-score ${zScore.toFixed(2)}`)
	}

	return { score, zScore, mean: avg, stdDev, reasons }
}

/**
 * Oracle Drift Score
 *
 * Compares the bridge's internal reserve ratio against the expected ratio.
 * In a price manipulation attack, the internal ratio diverges from reality.
 */
export function computeOracleDriftScore(
	sourceReserve: number,
	destReserve: number,
	expectedRatio: number,
	maxDriftPercent: number,
): { score: number; actualRatio: number; driftPercent: number; reasons: string[] } {
	const reasons: string[] = []

	if (destReserve === 0) {
		return {
			score: 100,
			actualRatio: Infinity,
			driftPercent: 100,
			reasons: ['[CRITICAL] Destination reserve is ZERO — complete drain detected'],
		}
	}

	const actualRatio = sourceReserve / destReserve
	const driftPercent = Math.abs((actualRatio - expectedRatio) / expectedRatio) * 100

	let score = 0
	if (driftPercent >= maxDriftPercent * 2) {
		score = 100
		reasons.push(
			`[CRITICAL] Extreme oracle drift: ${driftPercent.toFixed(1)}% (ratio ${actualRatio.toFixed(2)} vs expected ${expectedRatio})`,
		)
	} else if (driftPercent >= maxDriftPercent) {
		score = Math.min(80, Math.round(driftPercent / maxDriftPercent * 25))
		reasons.push(
			`[HIGH] Oracle drift detected: ${driftPercent.toFixed(1)}% (ratio ${actualRatio.toFixed(2)} vs expected ${expectedRatio})`,
		)
	} else if (driftPercent >= maxDriftPercent * 0.5) {
		score = Math.round(driftPercent / maxDriftPercent * 10)
		reasons.push(`[INFO] Minor ratio drift: ${driftPercent.toFixed(1)}%`)
	}

	return { score, actualRatio, driftPercent, reasons }
}

// ============ Main Risk Aggregation ============

/**
 * Evaluate bridge risk with multi-dimensional heuristic analysis.
 *
 * Weights:
 *   - Velocity:     40% (catches slow drains)
 *   - Anomaly:      35% (mathematical proof of irregularity)
 *   - Oracle Drift: 25% (cross-protocol awareness)
 */
export function evaluateRisk(
	snapshot: BridgeSnapshot,
	config: RiskEngineConfig,
): RiskScores {
	const currentLockedETH = Number(snapshot.lockedAmount) / 1e18
	const sourceETH = Number(snapshot.sourceReserve) / 1e18
	const destETH = Number(snapshot.destReserve) / 1e18

	// ── Individual scores ────────────────────────────────

	const velocity = computeVelocityScore(
		currentLockedETH,
		config.baselineHistory,
		config.velocityMultiplierThreshold,
	)

	const anomaly = computeAnomalyScore(
		currentLockedETH,
		config.baselineHistory,
		config.stdDeviationThreshold,
	)

	const drift = computeOracleDriftScore(
		sourceETH,
		destETH,
		config.expectedReserveRatio,
		config.maxOracleDriftPercent,
	)

	// ── Weighted aggregation ─────────────────────────────

	const VELOCITY_WEIGHT = 0.40
	const ANOMALY_WEIGHT = 0.35
	const DRIFT_WEIGHT = 0.25

	const overallScore = Math.round(
		velocity.score * VELOCITY_WEIGHT +
		anomaly.score * ANOMALY_WEIGHT +
		drift.score * DRIFT_WEIGHT,
	)

	// Also boost if the static threshold is exceeded
	const staticBoost = snapshot.riskRatio >= config.staticThresholdPercent ? 30 : 0
	const finalScore = Math.min(100, overallScore + staticBoost)

	// ── Classify risk level ──────────────────────────────

	let level: RiskLevel
	let action: RiskAction
	
	const hasAdminHijack = snapshot.unauthorizedGovernanceEvent === true;
	const hasProofFraud = snapshot.failedProofVerification === true;

	if (hasAdminHijack || hasProofFraud || finalScore >= 80 || snapshot.riskRatio >= config.staticThresholdPercent) {
		level = RiskLevel.CRITICAL
		action = RiskAction.PAUSE
	} else if (finalScore >= 55) {
		level = RiskLevel.HIGH
		action = RiskAction.PAUSE
	} else if (finalScore >= 30) {
		level = RiskLevel.MEDIUM
		action = RiskAction.RATE_LIMIT
	} else {
		level = RiskLevel.LOW
		action = RiskAction.MONITOR
	}

	// ── Collect all reasons ──────────────────────────────

	const reasons: string[] = [
		...velocity.reasons,
		...anomaly.reasons,
		...drift.reasons,
	]

	if (staticBoost > 0) {
		reasons.push(`[WARN] Static threshold exceeded: ${snapshot.riskRatio}% >= ${config.staticThresholdPercent}%`)
	}
	if (hasAdminHijack) {
		reasons.push(`[CRITICAL] Governance Hijack Detected: Unauthorized access control event (e.g. OwnershipTransferred) on active contract.`)
	}
	if (hasProofFraud) {
		reasons.push(`[CRITICAL] Proof Fraud Detected: Cross-chain source hash verification failed. Forged message intercepted.`)
	}

	if (reasons.length === 0) {
		reasons.push('[OK] All heuristics within normal range')
	}

	return {
		velocityScore: velocity.score,
		anomalyScore: anomaly.score,
		oracleDriftScore: drift.score,
		overallScore: finalScore,
		level,
		action,
		reasons,
	}
}
