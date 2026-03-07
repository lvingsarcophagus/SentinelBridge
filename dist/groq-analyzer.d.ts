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
import { type Runtime } from '@chainlink/cre-sdk';
import type { RiskScores } from './risk-engine';
export interface GroqAnalysis {
    aiRiskLevel: string;
    attackPattern: string;
    confidence: number;
    reasoning: string;
    recommendation: string;
    available: boolean;
}
/**
 * Analyze bridge state using Groq AI
 *
 * @param runtime CRE Runtime context
 * @param riskScores Results from the heuristic RiskEngine
 * @param bridgeState Current bridge state snapshot
 * @param groqApiKey API key for Groq
 */
export declare function analyzeWithGroq<C>(runtime: Runtime<C>, riskScores: RiskScores, bridgeState: {
    sourceReserve: string;
    destReserve: string;
    lockedAmount: string;
    riskRatio: number;
}, groqApiKey: string): GroqAnalysis;
//# sourceMappingURL=groq-analyzer.d.ts.map