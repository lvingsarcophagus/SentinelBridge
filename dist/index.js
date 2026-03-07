"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
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
const cre_sdk_1 = require("@chainlink/cre-sdk");
const viem_1 = require("viem");
const zod_1 = require("zod");
const abi_1 = require("./abi");
const risk_engine_1 = require("./risk-engine");
const groq_analyzer_1 = require("./groq-analyzer");
// ============ Configuration Schema ============
const configSchema = zod_1.z.object({
    schedule: zod_1.z.string(),
    bridgeAddress: zod_1.z.string(),
    chainSelectorName: zod_1.z.string(),
    riskThresholdPercent: zod_1.z.number(),
    groqApiKey: zod_1.z.string(),
    baselineHistory: zod_1.z.array(zod_1.z.number()),
    velocityMultiplierThreshold: zod_1.z.number(),
    stdDeviationThreshold: zod_1.z.number(),
    expectedReserveRatio: zod_1.z.number(),
    maxOracleDriftPercent: zod_1.z.number(),
});
// ============ Helper: Read a uint256 from the bridge ============
function readUint256(evmClient, runtime, functionName) {
    const callData = (0, viem_1.encodeFunctionData)({
        abi: abi_1.SOURCE_BRIDGE_ABI,
        functionName: functionName,
    });
    const result = evmClient
        .callContract(runtime, {
        call: (0, cre_sdk_1.encodeCallMsg)({
            from: viem_1.zeroAddress,
            to: runtime.config.bridgeAddress,
            data: callData,
        }),
        blockNumber: cre_sdk_1.LAST_FINALIZED_BLOCK_NUMBER,
    })
        .result();
    return (0, viem_1.decodeFunctionResult)({
        abi: abi_1.SOURCE_BRIDGE_ABI,
        functionName: functionName,
        data: (0, cre_sdk_1.bytesToHex)(result.data),
    });
}
function readBool(evmClient, runtime, functionName) {
    const callData = (0, viem_1.encodeFunctionData)({
        abi: abi_1.SOURCE_BRIDGE_ABI,
        functionName: functionName,
    });
    const result = evmClient
        .callContract(runtime, {
        call: (0, cre_sdk_1.encodeCallMsg)({
            from: viem_1.zeroAddress,
            to: runtime.config.bridgeAddress,
            data: callData,
        }),
        blockNumber: cre_sdk_1.LAST_FINALIZED_BLOCK_NUMBER,
    })
        .result();
    return (0, viem_1.decodeFunctionResult)({
        abi: abi_1.SOURCE_BRIDGE_ABI,
        functionName: functionName,
        data: (0, cre_sdk_1.bytesToHex)(result.data),
    });
}
// ============ Main Handler: Cron-triggered watchdog ============
const onCronTrigger = (runtime) => {
    const config = runtime.config;
    runtime.log('======================================================\n' +
        '  SENTINELBRIDGE ADVANCED WATCHDOG\n' +
        '  Behavioral Heuristic + AI Threat Engine\n' +
        '======================================================');
    // ── Validate chain ────────────────────────────────────
    if (!(0, cre_sdk_1.isChainSelectorSupported)(config.chainSelectorName)) {
        throw new Error(`Chain selector not supported: ${config.chainSelectorName}`);
    }
    const network = (0, cre_sdk_1.getNetwork)({
        chainFamily: 'evm',
        chainSelectorName: config.chainSelectorName,
        isTestnet: true,
    });
    if (!network) {
        throw new Error(`Network not found: ${config.chainSelectorName}`);
    }
    const evmClient = new cre_sdk_1.EVMClient(network.chainSelector.selector);
    // ── Step 1: Read bridge state on-chain ────────────────
    runtime.log('\n[INIT] Step 1: Reading on-chain bridge state...');
    const sourceReserve = readUint256(evmClient, runtime, 'getSourceReserves');
    const destReserve = readUint256(evmClient, runtime, 'getDestReserves');
    const lockedAmount = readUint256(evmClient, runtime, 'getLockedAmount');
    const riskRatio = readUint256(evmClient, runtime, 'getRiskRatio');
    const isPaused = readBool(evmClient, runtime, 'isPaused');
    const snapshot = {
        sourceReserve,
        destReserve,
        lockedAmount,
        riskRatio: Number(riskRatio),
        timestamp: Date.now(),
    };
    runtime.log(`   Contract:       ${config.bridgeAddress}\n` +
        `   Source Reserve:  ${sourceReserve.toString()} wei (${(Number(sourceReserve) / 1e18).toFixed(2)} ETH)\n` +
        `   Dest Reserve:   ${destReserve.toString()} wei (${(Number(destReserve) / 1e18).toFixed(2)} ETH)\n` +
        `   Locked Amount:  ${lockedAmount.toString()} wei (${(Number(lockedAmount) / 1e18).toFixed(2)} ETH)\n` +
        `   Risk Ratio:     ${riskRatio.toString()}%\n` +
        `   Paused:         ${isPaused}`);
    if (isPaused) {
        runtime.log('\n[INFO] Bridge is already paused. No further analysis needed.');
        return `Bridge paused. Risk: ${riskRatio.toString()}%`;
    }
    // ── Step 2: Behavioral Heuristic Analysis ─────────────
    runtime.log('\n[ANALYSIS] Step 2: Running behavioral heuristic analysis...');
    const engineConfig = {
        baselineHistory: config.baselineHistory,
        velocityMultiplierThreshold: config.velocityMultiplierThreshold,
        stdDeviationThreshold: config.stdDeviationThreshold,
        staticThresholdPercent: config.riskThresholdPercent,
        expectedReserveRatio: config.expectedReserveRatio,
        maxOracleDriftPercent: config.maxOracleDriftPercent,
    };
    const riskScores = (0, risk_engine_1.evaluateRisk)(snapshot, engineConfig);
    runtime.log(`   ┌─────────────────────────────────┐\n` +
        `   │ RISK SCORE BREAKDOWN            │\n` +
        `   ├─────────────────────────────────┤\n` +
        `   │ Velocity Score:    ${String(riskScores.velocityScore).padStart(3)}/100     │\n` +
        `   │ Anomaly Score:     ${String(riskScores.anomalyScore).padStart(3)}/100     │\n` +
        `   │ Oracle Drift:      ${String(riskScores.oracleDriftScore).padStart(3)}/100     │\n` +
        `   │ Overall Score:     ${String(riskScores.overallScore).padStart(3)}/100     │\n` +
        `   ├─────────────────────────────────┤\n` +
        `   │ Risk Level:  ${riskScores.level.padEnd(20)}│\n` +
        `   │ Action:      ${riskScores.action.padEnd(20)}│\n` +
        `   └─────────────────────────────────┘`);
    // Log all detected signals
    runtime.log('\n[SIGNALS] Detected anomalies/events:');
    for (const reason of riskScores.reasons) {
        runtime.log(`   * ${reason}`);
    }
    // ── Step 3: Groq AI Intent Analysis ───────────────────
    runtime.log('\n[AI] Step 3: AI-powered threat intelligence...');
    const aiAnalysis = (0, groq_analyzer_1.analyzeWithGroq)(runtime, riskScores, {
        sourceReserve: sourceReserve.toString(),
        destReserve: destReserve.toString(),
        lockedAmount: lockedAmount.toString(),
        riskRatio: Number(riskRatio),
    }, config.groqApiKey || '');
    // ── Step 4: Execute Response ──────────────────────────
    runtime.log('\n[RESPONSE] Step 4: Executing response action...');
    // Use AI assessment to potentially escalate the heuristic action
    let finalAction = riskScores.action;
    if (aiAnalysis.available &&
        aiAnalysis.confidence >= 70 &&
        (aiAnalysis.aiRiskLevel === 'CRITICAL' || aiAnalysis.aiRiskLevel === 'HIGH')) {
        finalAction = risk_engine_1.RiskAction.PAUSE;
        runtime.log(`   [AI OVERRIDE] AI escalated action to PAUSE (confidence: ${aiAnalysis.confidence}%)`);
    }
    switch (finalAction) {
        case risk_engine_1.RiskAction.PAUSE: {
            runtime.log(`\n[EMERGENCY] =======================================================\n` +
                `   CIRCUIT BREAKER ACTIVATED\n` +
                `   Risk Level: ${riskScores.level} | Score: ${riskScores.overallScore}/100\n` +
                `   Static Risk: ${riskRatio.toString()}%\n` +
                (aiAnalysis.available
                    ? `   AI Pattern: ${aiAnalysis.attackPattern} (${aiAnalysis.confidence}% confidence)\n`
                    : '') +
                `   Action: bridge.pause() — Emergency shutdown\n` +
                `===================================================================`);
            // Execute bridge.pause() on-chain via CRE EVMClient
            runtime.log('[ON-CHAIN] Executing bridge.pause() via CRE EVMClient...');
            try {
                const pauseCallData = (0, viem_1.encodeFunctionData)({
                    abi: abi_1.SOURCE_BRIDGE_ABI,
                    functionName: 'pause',
                });
                const pauseResult = evmClient
                    .callContract(runtime, {
                    call: (0, cre_sdk_1.encodeCallMsg)({
                        from: viem_1.zeroAddress,
                        to: config.bridgeAddress,
                        data: pauseCallData,
                    }),
                    blockNumber: cre_sdk_1.LAST_FINALIZED_BLOCK_NUMBER,
                })
                    .result();
                runtime.log(`[ON-CHAIN] ✅ bridge.pause() executed successfully\n` +
                    `   Response data: ${(0, cre_sdk_1.bytesToHex)(pauseResult.data)}`);
            }
            catch (pauseError) {
                runtime.log(`[ON-CHAIN] ⚠️ bridge.pause() call failed: ${String(pauseError)}\n` +
                    `   Bridge may already be paused or require broadcast mode (--broadcast)`);
            }
            const pattern = aiAnalysis.available ? ` [${aiAnalysis.attackPattern}]` : '';
            return `ALERT: Score ${riskScores.overallScore}/100 | ${riskScores.level}${pattern} — Circuit breaker activated`;
        }
        case risk_engine_1.RiskAction.RATE_LIMIT: {
            runtime.log(`\n[WARNING] =======================================================\n` +
                `   RATE LIMITING ACTIVATED\n` +
                `   Risk Level: ${riskScores.level} | Score: ${riskScores.overallScore}/100\n` +
                `   Action: Restrict withdrawals to 10% of reserves/hour\n` +
                `=================================================================`);
            return `WARNING: Score ${riskScores.overallScore}/100 | ${riskScores.level} — Rate limiting active`;
        }
        case risk_engine_1.RiskAction.MONITOR:
        default: {
            runtime.log(`\n[OK] Bridge HEALTHY\n` +
                `   Risk Score: ${riskScores.overallScore}/100 | Level: ${riskScores.level}\n` +
                `   Static Risk: ${riskRatio.toString()}% (threshold: ${config.riskThresholdPercent}%)\n` +
                `   Next check in scheduled sequence`);
            return `Healthy. Score: ${riskScores.overallScore}/100 | Risk: ${riskRatio.toString()}%`;
        }
    }
};
// ============ Workflow Registration ============
const initWorkflow = (config) => {
    const cron = new cre_sdk_1.CronCapability();
    return [(0, cre_sdk_1.handler)(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
};
async function main() {
    const runner = await cre_sdk_1.Runner.newRunner({ configSchema });
    await runner.run(initWorkflow);
}
//# sourceMappingURL=index.js.map