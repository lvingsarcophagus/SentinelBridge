"use strict";
/**
 * SentinelBridge Workflow
 *
 * Automated circuit breaker for cross-chain bridge liquidity monitoring.
 * Listens to SentinelBridge events, reads reserve balances from source and destination chains,
 * and executes a pause() call if liquidity risk threshold is exceeded.
 *
 * Pattern: Listen → Evaluate → Act
 *
 * Deployed through Chainlink Runtime Environment (CRE)
 * Compiled separately with: npm run workflow:build
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflow = void 0;
const types_1 = require("./types");
/**
 * SentinelBridge contract ABI (relevant functions only)
 */
const SENTINEL_BRIDGE_ABI = [
    {
        type: "function",
        name: "getSourceReserves",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getDestReserves",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getLockedAmount",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "pause",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "isPaused",
        inputs: [],
        outputs: [{ type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "TokensBridged",
        inputs: [
            { indexed: true, name: "sender", type: "address" },
            { indexed: true, name: "amount", type: "uint256" },
            { indexed: false, name: "destination", type: "address" },
        ],
    },
];
/**
 * Initialize workflow state with SentinelBridge configuration
 */
function initializeState() {
    return {
        sourceChainId: 1, // Ethereum mainnet
        destChainId: 137, // Polygon
        bridgeAddress: "0x0000000000000000000000000000000000000000", // Replace with actual SentinelBridge
        thresholds: {
            maxRatio: 0.8, // 80% of source reserves can be locked
            emergencyThreshold: BigInt("1000000000000000000"), // 1 token in wei
        },
        isPaused: false,
        lastCheckTimestamp: 0,
        lastRiskRatio: 0,
    };
}
/**
 * Read reserve balances from both chains
 *
 * @param evm - EVM client instance
 * @param state - Current workflow state
 * @returns Promise<BridgeReserves> containing reserve data and risk assessment
 */
async function readBridgeReserves(evm, state) {
    try {
        types_1.Log.info("🔍 Reading SentinelBridge reserves...");
        // Read source chain reserves
        const sourceReserveResult = await evm.read({
            chainId: state.sourceChainId,
            contractAddress: state.bridgeAddress,
            functionName: "getSourceReserves",
            abi: SENTINEL_BRIDGE_ABI,
            args: [],
        });
        if (!sourceReserveResult.ok) {
            return {
                ok: false,
                error: `Failed to read source reserves: ${sourceReserveResult.error}`,
            };
        }
        const sourceReserve = BigInt(sourceReserveResult.value);
        // Read destination chain reserves
        const destReserveResult = await evm.read({
            chainId: state.destChainId,
            contractAddress: state.bridgeAddress,
            functionName: "getDestReserves",
            abi: SENTINEL_BRIDGE_ABI,
            args: [],
        });
        if (!destReserveResult.ok) {
            return {
                ok: false,
                error: `Failed to read destination reserves: ${destReserveResult.error}`,
            };
        }
        const destReserve = BigInt(destReserveResult.value);
        // Read locked amount (target locked on source chain)
        const lockedResult = await evm.read({
            chainId: state.sourceChainId,
            contractAddress: state.bridgeAddress,
            functionName: "getLockedAmount",
            abi: SENTINEL_BRIDGE_ABI,
            args: [],
        });
        if (!lockedResult.ok) {
            return {
                ok: false,
                error: `Failed to read locked amount: ${lockedResult.error}`,
            };
        }
        const targetLocked = BigInt(lockedResult.value);
        // Calculate risk ratio: (targetLocked / sourceReserve) * 100
        const riskRatio = sourceReserve > 0n
            ? Number((targetLocked * 100n) / sourceReserve) / 100
            : 0;
        // Determine health status
        const isHealthy = riskRatio <= state.thresholds.maxRatio &&
            targetLocked <= sourceReserve;
        types_1.Log.info(`📊 SentinelBridge Health Check:\n` +
            `   Source Reserves: ${sourceReserve.toString()}\n` +
            `   Dest Reserves: ${destReserve.toString()}\n` +
            `   Target Locked: ${targetLocked.toString()}\n` +
            `   Risk Ratio: ${riskRatio.toFixed(2)}% (Threshold: ${(state.thresholds.maxRatio * 100).toFixed(2)}%)\n` +
            `   Status: ${isHealthy ? "✅ HEALTHY" : "⚠️  AT RISK"}`);
        return {
            ok: true,
            value: {
                sourceReserve,
                destReserve,
                targetLocked,
                riskRatio,
                isHealthy,
            },
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            error: `Exception in readBridgeReserves: ${errorMessage}`,
        };
    }
}
/**
 * Execute pause on the SentinelBridge contract
 *
 * @param evm - EVM client instance
 * @param state - Current workflow state
 * @returns Promise<Result<string>> containing transaction hash or error
 */
async function executePause(evm, state) {
    try {
        types_1.Log.warn(`🚨 EMERGENCY ALERT: Risk threshold exceeded! Executing pause() on SentinelBridge...`);
        const pauseResult = await evm.call({
            chainId: state.sourceChainId,
            contractAddress: state.bridgeAddress,
            functionName: "pause",
            abi: SENTINEL_BRIDGE_ABI,
            args: [],
        });
        if (!pauseResult.ok) {
            return {
                ok: false,
                error: `Failed to execute pause: ${pauseResult.error}`,
            };
        }
        types_1.Log.info(`✅ SentinelBridge paused successfully. Tx: ${pauseResult.value}`);
        state.isPaused = true;
        return {
            ok: true,
            value: pauseResult.value,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            error: `Exception in executePause: ${errorMessage}`,
        };
    }
}
/**
 * Check if SentinelBridge is already paused
 *
 * @param evm - EVM client instance
 * @param state - Current workflow state
 * @returns Promise<Result<boolean>> containing pause status
 */
async function checkBridgePauseStatus(evm, state) {
    try {
        const pauseStatusResult = await evm.read({
            chainId: state.sourceChainId,
            contractAddress: state.bridgeAddress,
            functionName: "isPaused",
            abi: SENTINEL_BRIDGE_ABI,
            args: [],
        });
        if (!pauseStatusResult.ok) {
            return {
                ok: false,
                error: `Failed to read pause status: ${pauseStatusResult.error}`,
            };
        }
        const isPaused = Boolean(pauseStatusResult.value);
        return {
            ok: true,
            value: isPaused,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            error: `Exception in checkBridgePauseStatus: ${errorMessage}`,
        };
    }
}
/**
 * Main SentinelBridge workflow function
 *
 * Orchestrates the listen → evaluate → act pattern:
 * 1. Listen for bridge events (implicit through CRE event triggers)
 * 2. Evaluate reserve ratios against risk thresholds
 * 3. Act by calling pause() if threshold is exceeded
 */
exports.workflow = {
    name: "sentinel-bridge-watchdog",
    version: "1.0.0",
    onInit: async (context) => {
        const state = initializeState();
        context.state = state;
        types_1.Log.info("🚀 SentinelBridge Watchdog initialized");
        types_1.Log.info(`📍 SentinelBridge Watchdog Configuration:\n` +
            `   Contract: ${state.bridgeAddress}\n` +
            `   Source Chain: ${state.sourceChainId}\n` +
            `   Destination Chain: ${state.destChainId}\n` +
            `   Max Risk Ratio: ${(state.thresholds.maxRatio * 100).toFixed(2)}%`);
    },
    onEvent: async (context) => {
        const state = context.state;
        const { evm } = context;
        types_1.Log.info(`📡 SentinelBridge received event. Triggering liquidity check at ${new Date().toISOString()}`);
        try {
            // Step 1: Check if already paused (early exit optimization)
            const pauseStatusResult = await checkBridgePauseStatus(evm, state);
            if (pauseStatusResult.ok && pauseStatusResult.value) {
                types_1.Log.info("⏸️  SentinelBridge is already paused. Skipping check.");
                return;
            }
            // Step 2: Read current reserve balances from both chains
            const reservesResult = await readBridgeReserves(evm, state);
            if (!reservesResult.ok) {
                types_1.Log.error(`❌ Failed to read reserves: ${reservesResult.error}\n` +
                    `   Workflow will retry on next event.`);
                return;
            }
            const reserves = reservesResult.value;
            state.lastRiskRatio = reserves.riskRatio;
            state.lastCheckTimestamp = Date.now();
            // Step 3: Evaluate risk threshold
            // Trigger circuit breaker if:
            // - Target locked exceeds source reserves, OR
            // - Risk ratio exceeds maximum threshold
            if (!reserves.isHealthy) {
                types_1.Log.warn(`⚠️  RISK THRESHOLD EXCEEDED:\n` +
                    `   Risk Ratio: ${reserves.riskRatio.toFixed(2)}% > ` +
                    `${(state.thresholds.maxRatio * 100).toFixed(2)}%\n` +
                    `   Target Locked: ${reserves.targetLocked.toString()} exceeds ` +
                    `Source Reserves: ${reserves.sourceReserve.toString()}`);
                // Step 4: Execute pause action
                const pauseResult = await executePause(evm, state);
                if (!pauseResult.ok) {
                    types_1.Log.error(`❌ CRITICAL: Failed to pause SentinelBridge: ${pauseResult.error}\n` +
                        `   Manual intervention required!`);
                    return;
                }
                types_1.Log.info(`✅ Circuit breaker activated. SentinelBridge paused.`);
            }
            else {
                types_1.Log.info(`✅ SentinelBridge health check passed. Risk ratio: ${reserves.riskRatio.toFixed(2)}%`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            types_1.Log.error(`🔥 Unexpected error in SentinelBridge workflow: ${errorMessage}`);
        }
    },
    onError: async (_context, error) => {
        types_1.Log.error(`💥 SentinelBridge error handler triggered: ${error.message}`);
        // In production, consider alerting monitoring systems (e.g., PagerDuty)
    },
    onClose: async (context) => {
        const state = context.state;
        types_1.Log.info(`👋 SentinelBridge shutting down.\n` +
            `   Final Risk Ratio: ${state.lastRiskRatio.toFixed(2)}%\n` +
            `   Last Check: ${new Date(state.lastCheckTimestamp).toISOString()}\n` +
            `   Bridge Paused: ${state.isPaused}`);
    },
};
exports.default = exports.workflow;
//# sourceMappingURL=index.js.map