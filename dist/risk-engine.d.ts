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
export declare enum RiskLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum RiskAction {
    MONITOR = "MONITOR",
    RATE_LIMIT = "RATE_LIMIT",
    PAUSE = "PAUSE"
}
export interface BridgeSnapshot {
    sourceReserve: bigint;
    destReserve: bigint;
    lockedAmount: bigint;
    riskRatio: number;
    timestamp: number;
    unauthorizedGovernanceEvent?: boolean;
    failedProofVerification?: boolean;
}
export interface RiskScores {
    velocityScore: number;
    anomalyScore: number;
    oracleDriftScore: number;
    overallScore: number;
    level: RiskLevel;
    action: RiskAction;
    reasons: string[];
}
export interface RiskEngineConfig {
    /** Baseline historical observations (locked amounts in ETH) */
    baselineHistory: number[];
    /** Multiplier: current velocity > baseline × this = alert */
    velocityMultiplierThreshold: number;
    /** Standard deviations above mean to flag */
    stdDeviationThreshold: number;
    /** Static risk ratio threshold (fallback) */
    staticThresholdPercent: number;
    /** Expected source/dest reserve ratio (healthy = ~2.0 for 1000/500) */
    expectedReserveRatio: number;
    /** Max acceptable drift from expected ratio */
    maxOracleDriftPercent: number;
}
/**
 * Liquidity Velocity Score
 *
 * Tracks how fast locked amount is increasing relative to baseline.
 * A slow-drain attack shows a steady, abnormal velocity even if each
 * individual reading is under the static threshold.
 */
export declare function computeVelocityScore(currentLocked: number, history: number[], multiplierThreshold: number): {
    score: number;
    velocity: number;
    baselineAvg: number;
    reasons: string[];
};
/**
 * Standard Deviation Anomaly Score
 *
 * Uses the 3σ rule: if current locked amount is more than N standard
 * deviations from the historical mean, it's a statistical anomaly.
 * This is mathematically defensible and catches gradual threshold-dodging.
 */
export declare function computeAnomalyScore(currentLocked: number, history: number[], stdDevThreshold: number): {
    score: number;
    zScore: number;
    mean: number;
    stdDev: number;
    reasons: string[];
};
/**
 * Oracle Drift Score
 *
 * Compares the bridge's internal reserve ratio against the expected ratio.
 * In a price manipulation attack, the internal ratio diverges from reality.
 */
export declare function computeOracleDriftScore(sourceReserve: number, destReserve: number, expectedRatio: number, maxDriftPercent: number): {
    score: number;
    actualRatio: number;
    driftPercent: number;
    reasons: string[];
};
/**
 * Evaluate bridge risk with multi-dimensional heuristic analysis.
 *
 * Weights:
 *   - Velocity:     40% (catches slow drains)
 *   - Anomaly:      35% (mathematical proof of irregularity)
 *   - Oracle Drift: 25% (cross-protocol awareness)
 */
export declare function evaluateRisk(snapshot: BridgeSnapshot, config: RiskEngineConfig): RiskScores;
//# sourceMappingURL=risk-engine.d.ts.map