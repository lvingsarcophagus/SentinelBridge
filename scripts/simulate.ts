#!/usr/bin/env node

/**
 * SentinelBridge Simulation CLI
 * 
 * Run scenarios locally to test the monitoring workflow
 * Usage: npx ts-node scripts/simulate.ts [scenario-number]
 */

import {
  getAllScenarios,
  runScenario,
  formatBridgeState,
  calculateRiskRatio,
  getRiskLevel,
  SimulatedBridgeState,
  SimulationStep,
} from "../lib/simulation";

/**
 * Main simulation runner
 */
async function main() {
  const args = process.argv.slice(2);
  const scenarioIndex = args[0] ? parseInt(args[0], 10) - 1 : -1;

  const scenarios = getAllScenarios();

  // Show menu if no scenario specified
  if (scenarioIndex < 0 || scenarioIndex >= scenarios.length) {
    console.log("\n╔════════════════════════════════════════════════╗");
    console.log("║     SentinelBridge Simulation Engine            ║");
    console.log("╚════════════════════════════════════════════════╝\n");

    console.log("Available Scenarios:\n");

    scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.name}`);
      console.log(`   ${scenario.description}\n`);
    });

    console.log("Usage:");
    console.log("  pnpm run simulate:scenario 1   # Run Normal Operation");
    console.log("  pnpm run simulate:scenario 2   # Run Risk Escalation");
    console.log("  pnpm run simulate:scenario 3   # Run Crisis Event");
    console.log("  pnpm run simulate:scenario 4   # Run Liquidity Depletion\n");

    return;
  }

  const scenario = scenarios[scenarioIndex];

  // Run the scenario with visual feedback
  let stepCount = 0;

  await runScenario(
    scenario,
    (step: SimulationStep, state: SimulatedBridgeState) => {
      stepCount++;
      const riskRatio = calculateRiskRatio(state);
      const riskLevel = getRiskLevel(riskRatio);

      console.log(`\n${"─".repeat(60)}`);
      console.log(
        `Step ${stepCount}: ${step.name} (${(step.duration / 1000).toFixed(1)}s)`
      );
      console.log(`📋 ${step.description}`);
      console.log(`${formatBridgeState(state)}`);

      // Show workflow action
      if (riskRatio > 0.8) {
        console.log(`🚨 WORKFLOW ALERT: Risk exceeds 80% - PAUSE TRIGGERED`);
      } else if (riskRatio > 0.5) {
        console.log(`⚠️  WORKFLOW WARNING: Risk in warning zone (50-80%)`);
      } else {
        console.log(`✅ WORKFLOW OK: Bridge health is good`);
      }
    },

    (step: SimulationStep, state: SimulatedBridgeState) => {
      // Step end callback
    }
  );

  console.log(`${"─".repeat(60)}\n`);

  // Summary
  const finalState = createFinalState(scenario);
  const riskRatio = calculateRiskRatio(finalState);

  console.log("╔════════════════════════════════════════════════╗");
  console.log("║              Simulation Complete               ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  console.log("Key Takeaways:");
  console.log(
    "• The workflow continuously monitors reserve ratios"
  );
  console.log("• When risk exceeds 80%, the circuit breaker activates");
  console.log(
    "• Bridge is paused to prevent insolvency and user losses"
  );
  console.log(
    "• Team has time to investigate and fix underlying issues\n"
  );
}

/**
 * Create final state from last step action
 */
function createFinalState(scenario: any): any {
  const state = {
    sourceReserve: BigInt("1000000000000000000"),
    destReserve: BigInt("500000000000000000"),
    targetLocked: BigInt("200000000000000000"),
    isPaused: false,
    timestamp: Date.now(),
  };
  
  if (scenario.steps.length > 0) {
    const lastStep = scenario.steps[scenario.steps.length - 1];
    lastStep.action(state);
  }
  
  return state;
}

// Run the CLI
main().catch(console.error);
