# 🚀 SentinelBridge Quick Start Guide

**Get the entire system running in 10 minutes with Hardhat + Local Node.**

---

## What You'll Have After This

- ✅ Local mock bridge contract (solidity)
- ✅ Real-time monitoring dashboard
- ✅ Live circuit breaker demonstration
- ✅ Full risk ratio monitoring
- ✅ Automatic pause on risk > 80%

---

## Prerequisites

```bash
# Make sure you have pnpm installed
node --version        # Node 18+
pnpm --version        # pnpm 9.0+
```

---

## 5-Minute Setup

### **Step 1: Start Local Blockchain** (1 minute)

Open **Terminal 1:**
```bash
cd c:\Users\nayan\OneDrive\Desktop\NJ_PROJ_2026\SentinelBridge
pnpm run node:start
```

You'll see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

**Leave this running!** ✅

---

### **Step 2: Deploy Bridge Contract** (1 minute)

Open **Terminal 2:**
```bash
pnpm run node:deploy
```

Output:
```
✅ SourceBridge deployed!
📍 Address: 0x5FbDB2315678afccb333f8a9c45b65d30269122a

📊 Initial Bridge State:
   Source Reserve: 1000.0000 tokens
   Dest Reserve:   500.0000 tokens
   Locked Amount:  200.0000 tokens
   Risk Ratio:     20%
```

**Copy this address!** (We'll use it in `.env.local`)

---

### **Step 3: See Circuit Breaker in Action** (2 minutes)

Still in **Terminal 2:**
```bash
pnpm run demo:crisis
```

You'll see:
```
PHASE 1: Normal Bridge Operation
✅ HEALTHY BRIDGE STATE
   Risk is 20% - Below 80% threshold

PHASE 2: CRISIS EVENT - Hack!
⚠️ Reserves drain to 400 tokens
   Risk jumps to 95% - Exceeds 80%!

PHASE 3: AUTOMATIC PAUSE TRIGGERED
🚨 BRIDGE PAUSED
   Circuit breaker activated successfully
```

**This is the entire point of SentinelBridge!** 🎉

---

### **Step 4: View in Dashboard** (1 minute)

Open **Terminal 3:**
```bash
pnpm run dev
```

Wait for:
```
ready started server on 0.0.0.0:3000
```

Then visit: **http://localhost:3000**

You'll see:
- 📊 Real-time bridge status
- 📈 Risk gauge (color-coded)
- 🚨 Circuit breaker status
- 🔄 Auto-refresh every 5 seconds

---

### **Step 5: Try Simulation Dashboard** (1 minute)

Visit: **http://localhost:3000/simulation**

You can:
- ▶️ Click "Normal Operation" - See healthy bridge
- ▶️ Click "Risk Escalation" - Watch risk climb
- ▶️ Click "Crisis Event" - See automatic pause
- ▶️ Click "Liquidity Depletion" - Insolvency scenario

---

## All Commands at a Glance

| Command | What It Does |
|---------|-------------|
| `pnpm run node:start` | Start local blockchain (leave running) |
| `pnpm run node:deploy` | Deploy mock bridge contract |
| `pnpm run demo:crisis` | Show circuit breaker activating |
| `pnpm run demo:normal` | Show healthy bridge operation |
| `pnpm run demo:show` | Display current bridge state |
| `pnpm run dev` | Start dashboard (http://localhost:3000) |
| `pnpm run simulate:crisis` |  In-memory crisis simulation |

---

## Understanding What You're Seeing

### Risk Gauge Colors
- 🟢 **Green** (0-50%): Safe - plenty of buffer
- 🟡 **Yellow** (50-80%): Warning - getting tight
- 🔴 **Red** (80%+): Critical - AUTO PAUSE!\

### The Numbers
```
Risk Ratio = (Locked / Source) × 100%

Example:
• 200 tokens locked / 1000 tokens source = 20% ✅
• 850 tokens locked / 1000 tokens source = 85% 🚨 → PAUSE
```

### What Happens at 80%+
```
Automatic Circuit Breaker:
1. Workflow detects risk > 80%
2. Calls pause() on bridge contract
3. Bridge is now paused
4. Users can withdraw but NOT bridge
5. Team can investigate the problem
```

---

## Troubleshooting

### "Port 8545 already in use"
Another process is using the port. Kill it:
```powershell
# Find what's using port 8545
netstat -ano | findstr :8545

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Try again
pnpm run node:start
```

### "Contract address not found"
Run deployment again:
```bash
pnpm run node:deploy
```

### Dashboard not showing updates
Make sure:
1. Local node is running (`pnpm run node:start`)
2. Browser is at http://localhost:3000 (NOT :3001)
3. Auto-refresh is ON (toggle in dashboard)

---

## Next Steps for Hackathon

Once you understand how it works:

### 📚 For Learning:
- Read [HARDHAT_LOCAL.md](./HARDHAT_LOCAL.md) - Deep dive into local setup
- Read [SIMULATION.md](./SIMULATION.md) - In-memory scenarios
- Check [workflow/index.ts](./workflow/index.ts) - The monitoring logic

### 🎬 For Demo Video:
```
1. Show dashboard at http://localhost:3000
2. Run: pnpm run demo:normal (show normal operation)
3. Run: pnpm run demo:crisis (show auto-pause)
4. Refresh dashboard (show it's paused)
5. Explain: "This is how we protect bridge users"
```

### 🚀 For Production:
Replace local mock with real bridge contract and RPC endpoints.

---

## Architecture Visualization

```
Terminal 1              Terminal 2           Browser
┌──────────────────┐   ┌──────────────┐    ┌──────────┐
│  Hardhat Node    │───│ Workflow     │────│ Dashboard│
│  http://127.0.0.1   │ Reads Contract   │ Shows Risk  │
│  :8545           │   │ Checks Risk      │ Auto-pause  │
└──────────────────┘   └──────────────┘    └──────────┘
    SourceBridge.sol      Risk > 80%?       Next.js 15
    (Mock Bridge)         → pause()         React 19
```

---

## Key Files

| File | Purpose |
|------|---------|
| `contracts/SourceBridge.sol` | Mock bridge contract |
| `scripts/deploy-bridge.ts` | Deploy to local node |
| `scripts/demo-crisis.ts` | Crisis demonstration |
| `hardhat.config.ts` | Hardhat configuration |
| `HARDHAT_LOCAL.md` | Complete local guide |

---

## Summary

You now have:

✅ **A working bridge monitoring system**  
✅ **Automatic circuit breaker**  
✅ **Real-time dashboard**  
✅ **Demonstrable to judges**  
✅ **100% local (no blockchain fees)**  

**Perfect setup for Chainlink Convergence Hackathon!**

---

## Questions?

Check the docs:
- `HARDHAT_LOCAL.md` - Complete Hardhat guide
- `SIMULATION.md` - In-memory scenarios
- `.github/copilot-instructions.md` - Project guidelines
- `README.md` - Full documentation

Happy demoing! 🚀
