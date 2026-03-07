# SentinelBridge Simulation Guide

## Overview

The **Simulation Engine** lets you test the entire SentinelBridge monitoring workflow without needing real blockchain connections, RPC endpoints, or smart contracts. It's perfect for:

- ✅ Understanding how the system works
- ✅ Testing risk threshold logic
- ✅ Validating the circuit breaker behavior
- ✅ Training and demos
- ✅ Development and debugging

---

## Two Ways to Run Simulations

### **Option 1: Interactive Web Dashboard** 🎨

See real-time risk updates in the browser with visual gauges.

```bash
# Start the dev server
pnpm run dev

# Visit: http://localhost:3000/simulation
```

**Features:**
- Interactive scenario selection
- Live risk gauge visualization
- Real-time state updates
- Beautiful UI with color-coded risk zones

---

### **Option 2: CLI Simulation Runner** 💻

Run scenarios with detailed console output and statistics.

```bash
# Show available scenarios
pnpm run simulate:scenario

# Run specific scenario
pnpm run simulate:normal        # Normal Operation
pnpm run simulate:escalation    # Risk Escalation
pnpm run simulate:crisis        # Crisis Event
pnpm run simulate:depletion     # Liquidity Depletion
```

**Output Example:**
```
────────────────────────────────────────────────────
Step 1: Normal state (2.0s)
📋 Bridge running normally at 20% risk

✅ Bridge State:
   Source Reserve: 1.0000 tokens
   Dest Reserve:   0.5000 tokens
   Target Locked:  0.2000 tokens
   Risk Ratio:     20.00%
   Status:         HEALTHY

✅ WORKFLOW OK: Bridge health is good
```

---

## Available Scenarios

### **1. 🟢 Normal Operation**

**Duration:** ~10 seconds

**What it tests:**
- Healthy bridge operation
- Low risk ratio (20% → 30% → 25%)
- No alerts triggered

**Expected behavior:**
```
20% → 25% → 20%  (All in green zone)
✅ Workflow OK: Bridge health is good
```

**Real-world case:** Regular bridge usage with stable activity

---

### **2. 🟡 Risk Escalation**

**Duration:** ~10 seconds

**What it tests:**
- Gradual risk increase
- Crossing from safe to warning zone
- Workflow monitoring without execution

**Expected behavior:**
```
20% → 45% → 72%  (Approaching yellow zone)
⚠️ WORKFLOW WARNING: Risk in warning zone (50-80%)
```

**Real-world case:** Heavy trading pushing reserves lower

---

### **3. 🔴 Crisis Event**

**Duration:** ~10 seconds

**What it tests:**
- Sudden liquidity spike
- Risk explosion from normal → critical
- **Workflow pause execution** (circuit breaker activates)

**Expected behavior:**
```
20% → 60% → 82% (EXCEEDS 80%)
🚨 WORKFLOW ALERT: Risk exceeds 80% - PAUSE TRIGGERED
🚨 Bridge State:
   ...
   Status: PAUSED 🚨
```

**Real-world case:** Flash crash or panic withdrawal causing insolvency risk

---

### **4. 💥 Liquidity Depletion**

**Duration:** ~12 seconds

**What it tests:**
- Reserve drain scenarios
- Insolvency detection
- Emergency pause protection

**Expected behavior:**
```
Reserves: 1000 → 700 → 400 → 350
Risk: 20% → 29% → 87% (CRITICAL)
🚨 PAUSE TRIGGERED - Bridge paused
```

**Real-world case:** Smart contract bug or hacked liquidity pool

---

## Understanding the Risk Formula

$$\text{Risk Ratio} = \frac{\text{Target Locked}}{\text{Source Reserve}} \times 100\%$$

**Example:**
- Source Reserve: 1,000 tokens
- Target Locked: 850 tokens (amount bridged to other chain)
- Risk Ratio = 850 / 1,000 × 100 = **85%** → 🔴 CRITICAL

**Interpretation:**
- **0-50%:** ✅ Safe (lots of buffer for withdrawals)
- **50-80%:** ⚠️ Warning (limited buffer, approaching danger)
- **80-100%:** 🚨 Critical (insufficient reserves, pause bridge)
- **>100%:** 💥 Insolvent (bridge cannot satisfy all withdrawals)

---

## Workflow Decision Logic

The monitoring workflow follows this decision tree:

```
Is Bridge Already Paused?
  ├─ YES → Skip check, return early
  └─ NO → Continue to Step 2

Read Reserve Balances
  ├─ Success → Continue
  └─ RPC Error → Log error, retry next event

Calculate Risk Ratio = Locked / Source × 100%

Is Risk < 80% AND Locked < Source?
  ├─ YES → ✅ Status: HEALTHY
  │         Log info, update dashboard
  │         Continue monitoring
  │
  └─ NO → ⚠️ Status: AT RISK
           🚨 EMERGENCY ALERT
           Execute pause() transaction
           Bridge is paused
           Team can now investigate
```

---

## How to Interpret the Simulation

### Dashboard Indicators

**Risk Gauge:**
- 🟢 **Green** (0-50%): Safe - normal operation
- 🟡 **Yellow** (50-80%): Warning - increasing risk
- 🔴 **Red** (80-100%): Critical - execute pause

**Bridge State:**
- ✅ HEALTHY: Risk < 50%, no action needed
- ⚠️ WARNING: 50% ≤ Risk < 80%, monitor closely
- 🚨 CRITICAL: Risk ≥ 80%, automatic pause
- 🚨 PAUSED: Bridge is locked, users can withdraw but not deposit

---

## Testing Your Own Scenarios

Modify the simulation engine to test custom scenarios:

**File:** `lib/simulation.ts`

```typescript
export const customScenario: SimulationScenario = {
  name: "My Custom Scenario",
  description: "Test a specific risk escalation pattern",
  steps: [
    {
      name: "Initial state",
      duration: 2000,
      description: "Start at 30% risk",
      action: (state) => {
        state.targetLocked = BigInt("300000000000000000");
      },
    },
    // Add more steps...
  ],
};
```

Then import and run it in the CLI or dashboard!

---

## Key Insights from Simulations

### What You'll Learn

1. **Response Time**: The workflow detects threshold violations in seconds
2. **Precision**: Risk ratio calculation is exact to floating-point precision
3. **Safety**: Pause happens automatically without manual intervention
4. **Reliability**: Failed RPC calls don't crash the workflow
5. **Recovery**: Team has time to fix issues before bridge resumes

### The Innovation

Traditional approaches:
- ❌ Manual monitoring (slow)
- ❌ Governance votes (delays)
- ❌ Centralized keepers (single point of failure)

**SentinelBridge:**
- ✅ Automated 24/7 monitoring
- ✅ Instant response (seconds, not hours)
- ✅ Decentralized via Chainlink CRE
- ✅ No manual intervention needed

---

## Next Steps

### After Testing Simulations

1. **Understand the code** → Read `workflow/index.ts`
2. **Configure for real testnet** → Set up `.env.local`
3. **Deploy workflow** → `cre workflow deploy`
4. **Connect real RPC** → Point to actual blockchain
5. **Test with real data** → Monitor actual bridge

### Deployment Flow

```
Simulation (Local) 
    ↓
Testing (Testnet with real RPC)
    ↓
Staging (Testnet with real bridge contract)
    ↓
Production (Mainnet monitoring)
```

---

## Troubleshooting

### Simulation not updating?
- Check browser console for errors
- Refresh page with Ctrl+F5
- Ensure dev server is running (`pnpm run dev`)

### CLI scripts not working?
```bash
# Ensure tsx is installed
pnpm add -D tsx

# Run with explicit node
node --loader tsx scripts/simulate.ts 1
```

### Dashboard page 404?
- Ensure you're visiting `/simulation` route
- Check that dev server is running on http://localhost:3000

---

## Links

- [View Simulation Dashboard](http://localhost:3000/simulation)
- [Workflow Logic](../workflow/index.ts)
- [Simulation Engine Code](../lib/simulation.ts)
- [Copilot Instructions](../.github/copilot-instructions.md)
