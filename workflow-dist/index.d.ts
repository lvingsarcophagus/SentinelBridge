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
import { Workflow } from "./types";
/**
 * Main SentinelBridge workflow function
 *
 * Orchestrates the listen → evaluate → act pattern:
 * 1. Listen for bridge events (implicit through CRE event triggers)
 * 2. Evaluate reserve ratios against risk thresholds
 * 3. Act by calling pause() if threshold is exceeded
 */
export declare const workflow: Workflow;
export default workflow;
//# sourceMappingURL=index.d.ts.map