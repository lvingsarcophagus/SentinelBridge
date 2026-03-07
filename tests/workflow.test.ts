/**
 * Jest Test Suite for Emergency Liquidity Watchdog Workflow
 * 
 * Test both successful liquidity checks and circuit breaker activation
 */

import { workflow } from "../src/workflow";

describe("Emergency Liquidity Watchdog - Workflow Tests", () => {
  let mockContext: any;
  let mockEVM: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockEVM = {
      read: jest.fn(),
      call: jest.fn(),
    };

    mockContext = {
      state: {
        sourceChainId: 1,
        destChainId: 137,
        bridgeAddress: "0x1234567890123456789012345678901234567890",
        thresholds: {
          maxRatio: 0.8,
          emergencyThreshold: BigInt("1000000000000000000"),
        },
        isPaused: false,
        lastCheckTimestamp: 0,
        lastRiskRatio: 0,
      },
      evm: mockEVM,
    };
  });

  describe("onInit", () => {
    it("should initialize workflow state with default values", async () => {
      if (workflow.onInit) {
        await workflow.onInit(mockContext);

        const state = mockContext.state;
        expect(state).toHaveProperty("sourceChainId");
        expect(state).toHaveProperty("bridgeAddress");
        expect(state.thresholds.maxRatio).toBe(0.8);
        expect(state.isPaused).toBe(false);
      }
    });
  });

  describe("onEvent - Healthy Bridge State", () => {
    it("should pass health check when risk ratio is below threshold", async () => {
      // Mock healthy reserves: locked = 100, source = 200
      // Risk ratio = 50% (below 80% threshold)
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "200000000000000000", // 200 tokens in wei
      }); // sourceReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "500000000000000000", // 500 tokens in wei
      }); // destReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "100000000000000000", // 100 tokens locked in wei
      }); // lockedAmount
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: false,
      }); // isPaused check

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      if (workflow.onEvent) {
        await workflow.onEvent(mockContext);

        // Should NOT call pause when healthy
        expect(mockEVM.call).not.toHaveBeenCalled();
        expect(mockContext.state.isPaused).toBe(false);
      }
    });
  });

  describe("onEvent - Risk Threshold Exceeded", () => {
    it("should trigger circuit breaker when risk ratio exceeds threshold", async () => {
      // Mock risky reserves: locked = 900, source = 1000
      // Risk ratio = 90% (above 80% threshold) → trigger pause
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "1000000000000000000", // 1000 tokens in wei
      }); // sourceReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "500000000000000000", // 500 tokens in wei
      }); // destReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "900000000000000000", // 900 tokens locked in wei (90% risk)
      }); // lockedAmount
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: false,
      }); // isPaused check

      // Mock successful pause execution
      mockEVM.call.mockResolvedValueOnce({
        ok: true,
        value: "0xabc123def456", // Transaction hash
      });

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      if (workflow.onEvent) {
        await workflow.onEvent(mockContext);

        // Should call pause when threshold exceeded
        expect(mockEVM.call).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: "pause",
            chainId: 1,
          })
        );

        expect(mockContext.state.isPaused).toBe(true);
      }
    });

    it("should handle pause execution failure gracefully", async () => {
      // Mock risky state
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "1000000000000000000",
      }); // sourceReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "500000000000000000",
      }); // destReserves
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: "950000000000000000",
      }); // lockedAmount (95% risk)
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: false,
      }); // isPaused check

      // Mock pause failure
      mockEVM.call.mockResolvedValueOnce({
        ok: false,
        error: "Contract call reverted: Unauthorized",
      });

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      if (workflow.onEvent) {
        // Should not throw, but handle error gracefully
        await expect(workflow.onEvent(mockContext)).resolves.not.toThrow();
      }
    });
  });

  describe("onEvent - Early Exit Optimization", () => {
    it("should skip check if bridge is already paused", async () => {
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: true,
      }); // isPaused = true

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      if (workflow.onEvent) {
        await workflow.onEvent(mockContext);

        // Should only call read once (for isPaused check), then return
        expect(mockEVM.read).toHaveBeenCalledTimes(1);
        expect(mockEVM.call).not.toHaveBeenCalled();
      }
    });
  });

  describe("EVM Read Failure Handling", () => {
    it("should handle RPC failure when reading source reserves", async () => {
      mockEVM.read.mockResolvedValueOnce({
        ok: true,
        value: false,
      }); // isPaused check
      mockEVM.read.mockResolvedValueOnce({
        ok: false,
        error: "RPC call failed: timeout",
      }); // sourceReserves read fails

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      if (workflow.onEvent) {
        await workflow.onEvent(mockContext);

        // Should not crash or attempt to pause
        expect(mockEVM.call).not.toHaveBeenCalled();
      }
    });
  });

  describe("onClose", () => {
    it("should log final state on workflow closure", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      if (workflow.onInit) {
        await workflow.onInit(mockContext);
      }

      mockContext.state.isPaused = true;
      mockContext.state.lastRiskRatio = 85.5;

      if (workflow.onClose) {
        await workflow.onClose(mockContext);

        // Verify logging occurs
        expect(consoleSpy).toHaveBeenCalled();
      }

      consoleSpy.mockRestore();
    });
  });

  describe("onError", () => {
    it("should handle workflow errors gracefully", async () => {
      const testError = new Error("Unexpected failure");

      if (workflow.onError) {
        // Should not throw
        await expect(
          workflow.onError(mockContext, testError)
        ).resolves.not.toThrow();
      }
    });
  });
});

/**
 * TEST SIMULATION GUIDE FOR CHAINLINK CRE
 * 
 * After running: npm run build
 * 
 * Run the workflow simulation:
 * $ cre workflow simulate ./dist/workflow.js
 * 
 * Expected output for simulation:
 * 
 * [Healthy State]:
 * ✅ Bridge health check passed. Risk ratio: 35.50%
 * 
 * [Risk State]:
 * 🚨 EMERGENCY ALERT: Risk threshold exceeded!
 * ✅ Circuit breaker activated. Bridge paused.
 */
