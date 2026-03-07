/**
 * SentinelBridge Simulation Engine
 * 
 * Simulates a cross-chain bridge with dynamic liquidity changes
 * to test the workflow's monitoring and circuit breaker logic
 */

export interface SimulatedBridgeState {
  sourceReserve: bigint;
  destReserve: bigint;
  targetLocked: bigint;
  isPaused: boolean;
  timestamp: number;
}

export interface SimulationScenario {
  name: string;
  description: string;
  steps: SimulationStep[];
}

export interface SimulationStep {
  name: string;
  duration: number; // milliseconds
  action: (state: SimulatedBridgeState) => void;
  description: string;
}

/**
 * Creates initial bridge state
 */
export function createInitialBridgeState(): SimulatedBridgeState {
  return {
    sourceReserve: BigInt("1000000000000000000"), // 1 token in wei
    destReserve: BigInt("500000000000000000"), // 0.5 token
    targetLocked: BigInt("200000000000000000"), // 0.2 token (20% risk)
    isPaused: false,
    timestamp: Date.now(),
  };
}

/**
 * Calculate risk ratio from state
 */
export function calculateRiskRatio(state: SimulatedBridgeState): number {
  if (state.sourceReserve === 0n) return 0;
  return Number((state.targetLocked * 100n) / state.sourceReserve) / 100;
}

/**
 * Get risk level indicator
 */
export function getRiskLevel(
  riskRatio: number
): "safe" | "warning" | "critical" {
  if (riskRatio < 0.5) return "safe";
  if (riskRatio < 0.8) return "warning";
  return "critical";
}

/**
 * SCENARIO 1: Normal Operation
 * Bridge runs healthy with low risk
 */
export const normalOperationScenario: SimulationScenario = {
  name: "Normal Operation",
  description:
    "Bridge operates healthily with consistent low-risk activity (20% → 30% → 25%)",
  steps: [
    {
      name: "Before",
      duration: 2000,
      description: "Initial state: 20% risk",
      action: (state) => {
        // No change - just observe
      },
    },
    {
      name: "Small withdrawal",
      duration: 3000,
      description: "User withdraws tokens, locked decreases",
      action: (state) => {
        state.targetLocked = BigInt("250000000000000000"); // 25% risk
      },
    },
    {
      name: "Small deposit",
      duration: 3000,
      description: "User deposits tokens back",
      action: (state) => {
        state.targetLocked = BigInt("200000000000000000"); // 20% risk
      },
    },
    {
      name: "Recovery",
      duration: 2000,
      description: "Bridge stable, risk remains safe",
      action: (state) => {
        // Steady state
      },
    },
  ],
};

/**
 * SCENARIO 2: Risk Escalation
 * Bridge activity increases, approaching warning threshold
 */
export const riskEscalationScenario: SimulationScenario = {
  name: "Risk Escalation",
  description:
    "Moderate trading activity drives risk from safe to warning zone (20% → 45% → 72%)",
  steps: [
    {
      name: "Start",
      duration: 2000,
      description: "Begin at 20% risk",
      action: (state) => {
        state.targetLocked = BigInt("200000000000000000");
      },
    },
    {
      name: "Moderate demand",
      duration: 3000,
      description: "Increased trading, risk rises to 45%",
      action: (state) => {
        state.targetLocked = BigInt("450000000000000000");
      },
    },
    {
      name: "Heavy demand",
      duration: 3000,
      description: "Mass trading, risk jumps to 72% (warning zone)",
      action: (state) => {
        state.targetLocked = BigInt("720000000000000000");
      },
    },
    {
      name: "Stable warning",
      duration: 2000,
      description: "Risk stays high but below critical threshold",
      action: (state) => {
        // Hold at 72%
      },
    },
  ],
};

/**
 * SCENARIO 3: Crisis Event
 * Sudden massive demand spikes risk to critical → PAUSE
 */
export const crisisEventScenario: SimulationScenario = {
  name: "Crisis Event",
  description:
    "Sudden liquidity crisis: risk explodes from 20% → 85% → PAUSE (Emergency circuit breaker)",
  steps: [
    {
      name: "Normal state",
      duration: 2000,
      description: "Bridge running normally at 20% risk",
      action: (state) => {
        state.targetLocked = BigInt("200000000000000000");
        state.isPaused = false;
      },
    },
    {
      name: "First shock",
      duration: 3000,
      description: "Sudden withdrawal spike, risk jumps to 60%",
      action: (state) => {
        state.targetLocked = BigInt("600000000000000000");
      },
    },
    {
      name: "Panic selling",
      duration: 2000,
      description: "More users panic, risk hits 82% (exceeds 80% threshold)",
      action: (state) => {
        state.targetLocked = BigInt("820000000000000000");
      },
    },
    {
      name: "CRITICAL ALERT",
      duration: 1000,
      description: "⚠️ WORKFLOW DETECTS CRITICAL RISK",
      action: (state) => {
        // Log alert (workflow would execute pause here)
      },
    },
    {
      name: "PAUSE EXECUTED",
      duration: 2000,
      description: "🚨 Bridge paused - no new transactions allowed",
      action: (state) => {
        state.isPaused = true;
      },
    },
    {
      name: "Emergency state",
      duration: 2000,
      description: "Bridge is paused, team can investigate and fix",
      action: (state) => {
        // Stay paused
      },
    },
  ],
};

/**
 * SCENARIO 4: Liquidity Depletion
 * Locked amount exceeds available reserves (insolvency)
 */
export const liquidityDepletionScenario: SimulationScenario = {
  name: "Liquidity Depletion",
  description:
    "Reserves drain faster than normal (1000 → 400), risk ratio exceeds 100% (INSOLVENT)",
  steps: [
    {
      name: "Starting point",
      duration: 2000,
      description: "Normal reserves: 1000 with 200 locked (20% risk)",
      action: (state) => {
        state.sourceReserve = BigInt("1000000000000000000");
        state.targetLocked = BigInt("200000000000000000");
      },
    },
    {
      name: "Reserves drop",
      duration: 3000,
      description: "RPC error loses 300 reserves, now 700 available",
      action: (state) => {
        state.sourceReserve = BigInt("700000000000000000"); // Risk now 28%
      },
    },
    {
      name: "Further depletion",
      duration: 3000,
      description: "Smart contract bug drains more, reserves drop to 400",
      action: (state) => {
        state.sourceReserve = BigInt("400000000000000000"); // Risk now 50%
      },
    },
    {
      name: "Critical reserves",
      duration: 2000,
      description: "Reserves low (400) with high locked (350) = 87% critical risk",
      action: (state) => {
        state.targetLocked = BigInt("350000000000000000");
      },
    },
    {
      name: "PAUSE TRIGGERED",
      duration: 2000,
      description: "🚨 Workflow pauses bridge before insolvency",
      action: (state) => {
        state.isPaused = true;
      },
    },
  ],
};

/**
 * Get all available scenarios
 */
export function getAllScenarios(): SimulationScenario[] {
  return [
    normalOperationScenario,
    riskEscalationScenario,
    crisisEventScenario,
    liquidityDepletionScenario,
  ];
}

/**
 * Run a scenario step-by-step with callbacks
 */
export async function runScenario(
  scenario: SimulationScenario,
  onStepStart: (step: SimulationStep, state: SimulatedBridgeState) => void,
  onStepEnd: (step: SimulationStep, state: SimulatedBridgeState) => void
): Promise<void> {
  const state = createInitialBridgeState();

  console.log(
    `\n🎯 Running Scenario: ${scenario.name}\n📝 ${scenario.description}\n`
  );

  for (const step of scenario.steps) {
    onStepStart(step, state);
    step.action(state);

    // Wait for step duration
    await new Promise((resolve) => setTimeout(resolve, step.duration));

    onStepEnd(step, state);
  }

  console.log(`\n✅ Scenario completed: ${scenario.name}\n`);
}

/**
 * Format state for display
 */
export function formatBridgeState(state: SimulatedBridgeState): string {
  const riskRatio = calculateRiskRatio(state);
  const riskLevel = getRiskLevel(riskRatio);
  const statusEmoji =
    state.isPaused ? "🚨" : riskLevel === "safe" ? "✅" : "⚠️";

  return `
${statusEmoji} Bridge State:
   Source Reserve: ${(Number(state.sourceReserve) / 1e18).toFixed(4)} tokens
   Dest Reserve:   ${(Number(state.destReserve) / 1e18).toFixed(4)} tokens
   Target Locked:  ${(Number(state.targetLocked) / 1e18).toFixed(4)} tokens
   Risk Ratio:     ${riskRatio.toFixed(2)}%
   Status:         ${state.isPaused ? "PAUSED 🚨" : riskLevel.toUpperCase()}
  `;
}
