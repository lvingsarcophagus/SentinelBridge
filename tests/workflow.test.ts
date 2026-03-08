import { evaluateRisk, RiskLevel, RiskAction, BridgeSnapshot, RiskEngineConfig } from "../src/workflows/sentinel-bridge/risk-engine";

describe("SentinelBridge Risk Engine Tests", () => {
  const baseConfig: RiskEngineConfig = {
    baselineHistory: [100, 100, 100, 100], // 100 ETH history
    velocityMultiplierThreshold: 2.0,
    stdDeviationThreshold: 3.0,
    staticThresholdPercent: 80,
    expectedReserveRatio: 2.0,
    maxOracleDriftPercent: 10,
  };

  const createSnapshot = (overrides?: Partial<BridgeSnapshot>): BridgeSnapshot => ({
    sourceReserve: BigInt("200000000000000000000"), // 200 ETH
    destReserve: BigInt("100000000000000000000"), // 100 ETH
    lockedAmount: BigInt("100000000000000000000"), // 100 ETH
    riskRatio: 50,
    timestamp: Date.now(),
    ...overrides,
  });

  describe("evaluateRisk", () => {
    it("should return LOW risk for healthy snapshot", () => {
      const snapshot = createSnapshot();
      const result = evaluateRisk(snapshot, baseConfig);

      expect(result.level).toBe(RiskLevel.LOW);
      expect(result.action).toBe(RiskAction.MONITOR);
      expect(result.overallScore).toBeLessThan(30);
    });

    it("should return CRITICAL risk when static threshold is exceeded", () => {
      const snapshot = createSnapshot({ riskRatio: 85 });
      const result = evaluateRisk(snapshot, baseConfig);

      expect(result.level).toBe(RiskLevel.CRITICAL);
      expect(result.action).toBe(RiskAction.PAUSE);
      expect(result.reasons.some(r => r.includes("[WARN] Static threshold exceeded"))).toBe(true);
    });

    it("should return HIGH risk for extreme velocity (slow drain)", () => {
      const config = { ...baseConfig, baselineHistory: [100, 101, 102, 103, 104] }; // Avg change: 1
      const snapshot = createSnapshot({ 
        // Current change is 10 (114 - 104) compared to avg change of 1 -> 10x multiplier
        lockedAmount: BigInt("114000000000000000000") 
      });
      const result = evaluateRisk(snapshot, config);

      expect(result.velocityScore).toBe(100);
      expect(result.level).toBe(RiskLevel.HIGH);
    });

    it("should return MEDIUM risk for extreme oracle drift independently", () => {
      const snapshot = createSnapshot({
        sourceReserve: BigInt("400000000000000000000"), // Ratio = 4.0
        destReserve: BigInt("100000000000000000000"),
      });
      const result = evaluateRisk(snapshot, baseConfig);

      expect(result.oracleDriftScore).toBe(100);
      expect(result.level).toBe(RiskLevel.LOW); // Weighted score is 25 (100 * 0.25) which is < 30
      expect(result.action).toBe(RiskAction.MONITOR);
    });

    it("should return CRITICAL risk for governance hijack", () => {
      const snapshot = createSnapshot({ unauthorizedGovernanceEvent: true });
      const result = evaluateRisk(snapshot, baseConfig);

      expect(result.level).toBe(RiskLevel.CRITICAL);
      expect(result.action).toBe(RiskAction.PAUSE);
      expect(result.reasons.some(r => r.includes("Governance Hijack Detected"))).toBe(true);
    });
    
    it("should return CRITICAL risk for proof fraud", () => {
      const snapshot = createSnapshot({ failedProofVerification: true });
      const result = evaluateRisk(snapshot, baseConfig);

      expect(result.level).toBe(RiskLevel.CRITICAL);
      expect(result.action).toBe(RiskAction.PAUSE);
      expect(result.reasons.some(r => r.includes("Proof Fraud Detected"))).toBe(true);
    });
  });
});
