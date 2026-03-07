# SentinelBridge Local Hardhat Setup

## Overview

This guide explains how to set up a **local Ethereum/Polygon simulation** using **Hardhat** to test SentinelBridge without real blockchain costs or dependencies.

You'll have:
- ✅ A local mock bridge contract
- ✅ Instant transaction finality (no block time waiting)
- ✅ Full control over bridge state (reserves, locked amounts)
- ✅ Ability to simulate hacks and see automatic circuit breaker activation
- ✅ Integration with your CRE workflow

**Perfect for:** Demoing, testing, development, and Hackathon submission!

---

## Architecture

```
Your Local Machine
├── Hardhat Node (Port 8545)
│   └── SourceBridge.sol contract
│
├── SentinelBridge Workflow
│   ├── Reads reserves from http://127.0.0.1:8545
│   ├── Calculates risk ratio
│   └── Calls pause() when risk > 80%
│
└── Next.js Dashboard
    └── Shows real-time bridge state
```

---

## Quick Start (5 minutes)

### 1️⃣ **Start Local Node**

```bash
# Terminal 1: Start Hardhat node (stays running)
pnpm run node:start

# Output:
# Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

The node will be available at `http://127.0.0.1:8545`

### 2️⃣ **Deploy Bridge Contract**

```bash
# Terminal 2: Deploy the mock bridge contract
pnpm run node:deploy

# Output:
# ✅ SourceBridge deployed!
# 📍 Address: 0x5FbDB2315678afccb333f8a9c45b65d30269122a
```

**Important:** Save this address! It's now stored in `tmp/bridge-address.json`

### 3️⃣ **Run Crisis Demo**

```bash
# Terminal 2: Show the circuit breaker in action
pnpm run demo:crisis

# You'll see:
# PHASE 1: Normal operation (20% risk) ✅
# PHASE 2: Reserves drained (400 of 1000) ⚠️
# PHASE 3: Risk escalates to 95% 🚨
# PHASE 4: Circuit breaker activates! PAUSE ✅
```

### 4️⃣ **View Dashboard**

```bash
# Terminal 3: Start Next.js dashboard
pnpm run dev

# Visit: http://localhost:3000
```

---

## Understanding the Flow

### The Mock Bridge Contract

**File:** `contracts/SourceBridge.sol`

Key functions:
```solidity
getSourceReserves()     → Returns available tokens (1000 ether by default)
getLockedAmount()       → Returns tokens bridged to other chain (200 by default)
getRiskRatio()          → Returns (locked / source) * 100
pause()                 → Emergency pause (called by workflow when risk > 80%)
```

**Key State Variables:**
```
sourceReserve = 1000 tokens  // Total available
lockedAmount = 200 tokens    // Currently at risk elsewhere
riskRatio = 20%             // locked / source × 100
paused = false              // Not paused initially
```

### Risk Calculation

```
Risk Ratio = (Locked Amount / Source Reserve) × 100%

Examples:
• 200 / 1000 × 100 = 20% ✅ Safe
• 450 / 1000 × 100 = 45% ⚠️ Warning
• 850 / 1000 × 100 = 85% 🚨 Critical → PAUSE
• 1200 / 1000 × 100 = 120% 💥 Insolvent
```

---

## Demo Scenarios

### Scenario 1: Normal Operation 🟢

```bash
pnpm run demo:normal

# Shows:
# - Bridge operating at 20% risk
# - Users bridge/unbridge tokens
# - Risk stays below 80% threshold
# - Workflow says "All systems nominal"
```

### Scenario 2: Crisis Event 🔴

```bash
pnpm run demo:crisis

# Shows:
# - Normal start (20% risk)
# - Hack drains 60% of reserves
# - Risk jumps to 95% (exceeds 80%)
# - Automatic pause triggers
# - Bridge is now paused
```

### Scenario 3: Check Current State 📊

```bash
pnpm run demo:show

# Shows:
# ✅ Bridge State Status
# 📊 Current reserves
# 📈 Risk analysis
# 📊 Visual risk gauge
```

---

## Integration with Workflow

### Configure for Local Testing

**File:** `.env.local`

```bash
# Use local node for both chains (they're the same contract!)
SOURCE_CHAIN_ID=31337
DEST_CHAIN_ID=31337

# Point to local Hardhat node
SOURCE_RPC=http://127.0.0.1:8545
DEST_RPC=http://127.0.0.1:8545

# Use deployed contract address (from pnpm run node:deploy)
NEXT_PUBLIC_BRIDGE_ADDRESS=0x5FbDB2315678afccb333f8a9c45b65d30269122a

# Local CRE settings
CRE_ENV=local
CHECK_INTERVAL=10
```

### Update Workflow Code

**File:** `workflow/index.ts`

The workflow already reads from environment variables:
```typescript
const state = {
  sourceChainId: parseInt(process.env.SOURCE_CHAIN_ID || "1"),
  destChainId: parseInt(process.env.DEST_CHAIN_ID || "137"),
  bridgeAddress: process.env.NEXT_PUBLIC_BRIDGE_ADDRESS,
  // ... rest of config
};
```

If using local node, it will:
1. Read `http://127.0.0.1:8545` for RPC
2. Query the contract at your deployed address
3. Call `pause()` if risk > 80%

---

## Testing Workflow with Simulations

### Automatic Testing

You can simulate the workflow reading your local contract:

```bash
# Test that workflow can read from local node
npx hardhat run scripts/demo-crisis.ts --network localhost

# Then manually verify:
pnpm run demo:show
```

### Manual Testing Flow

1. **Deploy contract:**
   ```bash
   pnpm run node:deploy
   ```

2. **Start CRE workflow simulation:**
   ```bash
   pnpm run simulate:crisis
   ```

3. **Check contract state:**
   ```bash
   pnpm run demo:show
   ```

4. **Dashboard should reflect state:**
   ```bash
   pnpm run dev
   # Visit http://localhost:3000
   ```

---

## Manipulating Contract State (for Testing)

### Simulate a Hack

```bash
# Set reserves to 0 (total drain)
npx hardhat console --network localhost

> const bridge = await ethers.getContractAt("SourceBridge", "0x5FbDB...");
> await bridge.setReserves(0, 500);
> (await bridge.getRiskRatio()).toString()
'∞' // Infinite risk!
```

### Increase Locked Amount

```bash
> await bridge.setLockedAmount(ethers.parseEther("950"));
> (await bridge.getRiskRatio()).toString()
'95' // 95% risk!
```

### Pause/Unpause

```bash
> await bridge.pause();
> await bridge.isPaused()
true

> await bridge.unpause();
> await bridge.isPaused()
false
```

---

## Hardhat Console (Interactive Testing)

Start interactive console:

```bash
npx hardhat console --network localhost
```

Then interact with the contract:

```javascript
// Get contract instance
const bridge = await ethers.getContractAt("SourceBridge", "0x5FbDB2315678afccb333f8a9c45b65d30269122a");

// Check state
const risk = await bridge.getRiskRatio();
console.log("Risk:", risk.toString(), "%");

// Modify state
await bridge.setReserves(ethers.parseEther("400"), ethers.parseEther("500"));
await bridge.setLockedAmount(ethers.parseEther("380"));

// Trigger pause
await bridge.pause();
console.log("Paused:", await bridge.isPaused());
```

---

## Directory Structure

```
SentinelBridge/
├── contracts/
│   └── SourceBridge.sol           # Mock bridge contract
├── scripts/
│   ├── deploy-bridge.ts           # Deploy to node
│   ├── demo-normal.ts             # Normal operation scenario
│   ├── demo-crisis.ts             # Crisis event scenario
│   └── show-bridge-state.ts        # Check current state
├── hardhat.config.ts              # Hardhat configuration
├── .env.local                      # Local environment config
└── HARDHAT_LOCAL.md               # This file
```

---

## Comparison: Local vs Real Chains

| Feature | Local Hardhat | Testnet | Mainnet |
|---------|---------------|---------|---------|
| **Speed** | Instant | 5-15s blocks | 12s blocks |
| **Cost** | Free | Free (testnet) | $$ (gas fees) |
| **Setup** | 2 minutes | 30 minutes | Real money |
| **Debugging** | Full control | Limited | No control |
| **Demo Ready** | Yes | Yes | Production ready |
| **Testing** | Perfect | Good | Real-world test |

---

## Troubleshooting

### Port 8545 Already in Use

```bash
# Kill existing process on port 8545
# On Windows:
netstat -ano | findstr :8545
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -i :8545
kill -9 <PID>

# Then restart
pnpm run node:start
```

### Contract Address Not Found

```bash
# If demo scripts can't find the contract:
pnpm run node:deploy
# This creates tmp/bridge-address.json
```

### RPC Connection Errors

```bash
# Make sure node is running:
pnpm run node:start

# In a new terminal, verify connection:
curl http://127.0.0.1:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}'
```

### Workflow Not Reading Contract

Check `.env.local`:
```bash
# Must match deployed address
NEXT_PUBLIC_BRIDGE_ADDRESS=0x5FbDB2315678afccb333f8a9c45b65d30269122a

# Must point to local node
SOURCE_RPC=http://127.0.0.1:8545
DEST_RPC=http://127.0.0.1:8545
```

---

## Real-World Upgrade Path

Once you're comfortable with local testing:

### Step 1: Testnet (Same Mock Contracts)

```bash
# Deploy to Ethereum Sepolia + Polygon Mumbai
DEPLOY_NETWORK=sepolia pnpm run node:deploy
DEPLOY_NETWORK=polygon-mumbai pnpm run node:deploy

# Update .env.local with testnet RPC endpoints
SOURCE_RPC=https://sepolia.infura.io/v3/YOUR_KEY
DEST_RPC=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
```

### Step 2: Real Contracts

Deploy actual bridge contracts instead of mocks.

### Step 3: Production

Deploy to mainnet with real bridge protocol.

---

## Scripts Summary

```bash
# Local Node Management
pnpm run node:start              # Start local Hardhat node (port 8545)
pnpm run node:deploy             # Deploy contract to local node

# Demos & Testing
pnpm run demo:normal             # Show normal bridge operation
pnpm run demo:crisis             # Show crisis → auto pause
pnpm run demo:show               # Display current bridge state

# Dashboard
pnpm run dev                      # Start Next.js dashboard
pnpm run build                    # Build entire project

# Simulations (in-memory, no RPC)
pnpm run simulate:scenario       # Interactive scenario menu
pnpm run simulate:normal         # Normal operation sim
pnpm run simulate:crisis         # Crisis event sim
```

---

## Key Takeaways

✅ **Local testing** = Fast, free, full control  
✅ **Mock contracts** = Perfect for demos and validation  
✅ **Hardhat node** = Instant transaction finality  
✅ **Circuit breaker** = Automatic pause when risk > 80%  
✅ **Zero blockchain** = No gas, no waiting, no real money  

**Perfect for Hackathon:** You can demonstrate the entire system working locally without any real chain dependencies!

---

## Next Steps

1. ✅ Start local node: `pnpm run node:start`
2. ✅ Deploy contract: `pnpm run node:deploy`
3. ✅ Run crisis demo: `pnpm run demo:crisis`
4. ✅ Check dashboard: `pnpm run dev`
5. ✅ Tell your judges: "The entire system works locally with automatic circuit breaker activation!"

---

For more details, see [SIMULATION.md](./SIMULATION.md) for in-memory simulations.
