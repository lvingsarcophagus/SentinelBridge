# SentinelBridge - Liquidity Watchdog

**Automated Circuit Breaker for Cross-Chain Bridge Liquidity Monitoring**

A Next.js-based monitoring dashboard with an integrated Chainlink Runtime Environment (CRE) workflow for protecting cross-chain bridge protocols from liquidity depletion. Built for the Chainlink Convergence Hackathon.

---

## 🚀 **Get Started in 5 Minutes**

### **Step 1: Start Hardhat Node (Terminal 1)**
```bash
pnpm run node:start
```
Will output: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

### **Step 2: Start Dashboard (Terminal 2)**
```bash
pnpm run dev
```
Will output: `Local: http://localhost:3000 (or 3002 if port 3000 in use)`

### **Step 3: Open Demo Controller in Browser**
Go to: **http://localhost:3000/demo-controller** or **http://localhost:3002/demo-controller**

Then click:
1. 🚀 **"Start Hardhat Node"** (or skip if already running from step 1)
2. 📝 **"Deploy Contract"** 
3. 🚨 **"Crisis Demo"** - Watch the 4-phase circuit breaker in action!

**That's it!** You'll see:
- ✅ Deploy status with contract address
- ✅ 4-phase crisis scenario with live output
- ✅ Automatic circuit breaker activation at 95% risk
- ✅ Activity log showing all actions

**Command-Line Alternative:**
```bash
pnpm run node:deploy          # Deploy contract (auto-syncs CRE config)
pnpm run demo:crisis          # Run crisis demo (4-phase circuit breaker)
pnpm run demo:flash           # Flash loan attack → watchdog pauses bridge
pnpm run demo:stealth         # Stealth drain detection (bypasses static threshold)
pnpm run demo:governance      # Governance hijack → VETO queued
pnpm run demo:normal          # Show normal operation
pnpm run demo:show            # Display current bridge state
```

**📖 Detailed Guides:** See [QUICK_START.md](./QUICK_START.md) | [HARDHAT_LOCAL.md](./HARDHAT_LOCAL.md)

---

## 🎯 Technical Overview (Hackathon Judges Start Here)

SentinelBridge represents a new paradigm in cross-chain security: **Active AI Defense via the Chainlink Runtime Environment (CRE).**

Most bridges rely on static thresholds (e.g., "Pause if TVL drops 50%"). Sophisticated attackers bypass these using slow-drains or flash-loan timing. We built a Watchdog that relies on **AI-driven intent analysis** to detect *anomalous state changes* rather than just volume drops. 

### 1. The "CRE + AI" Architecture
We built our Watchdog completely on the new **Chainlink Runtime Environment** (`@chainlink/cre-sdk` v1.1.4).
- **`CronCapability`** triggers the watchdog on a configurable schedule (`workflow.yaml`)
- **`EVMClient`** reads on-chain state (`getSourceReserves`, `getLockedAmount`, `getRiskRatio`, `isPaused`) using `callContract()` + `encodeCallMsg()` via `viem`
- **`HTTPClient`** streams live bridge telemetry to **Groq's LLaMA-3.1-8B-Instant** for AI intent analysis
- **Why Groq?** Security circuit breakers cannot wait 5 seconds for a GPT-4 response. Groq's ultra-low latency inference classifies the attack pattern before the next block is mined.

### 2. The State Change (The Defense)
If the CRE Risk Engine (combining heuristic velocity scoring and Groq's AI intent analysis) detects an exploit (e.g., `STEALTH DRAIN` or `FLASH CRISIS`), the workflow executes a definitive **on-chain state change via `EVMClient.callContract()`**: calling `bridge.pause()` on the `SourceBridge.sol` smart contract. This physically prevents further liquidity depletion.

### 3. Run the CRE Simulation
```bash
# Run the official CRE SDK workflow simulation
pnpm run simulate

# Or directly:
cre workflow simulate ./src/workflows/sentinel-bridge --target local-simulation --non-interactive
```

> **Note:** We also built a full visual "Demo Controller" dashboard at `/demo-controller` that runs realistic exploit scenarios against a local Hardhat node and streams Groq AI deductions live. See the Quick Start above.

## 📋 Project Structure

```
sentinel-bridge-watchdog/
├── src/workflows/sentinel-bridge/     # ★ CRE WORKFLOW (start here for judges)
│   ├── index.ts                      # Main CRE handler (CronCapability + EVMClient)
│   ├── risk-engine.ts                # Multi-dimensional behavioral risk scoring
│   ├── groq-analyzer.ts             # AI threat analysis via CRE HTTPClient
│   ├── abi.ts                        # SourceBridge ABI for CRE
│   ├── config.json                   # CRE config (bridge address, thresholds)
│   └── workflow.yaml                 # CRE simulation settings
├── contracts/                        # Solidity Contracts
│   └── SourceBridge.sol              # Mock bridge with pause/unpause
├── scripts/                          # Hardhat Demo Scripts
│   ├── deploy-bridge.ts              # Deploy contract (auto-syncs CRE config)
│   ├── demo-crisis.ts                # Crisis: reserves drain → circuit breaker
│   ├── demo-flash-loan.ts           # Flash loan: velocity anomaly → pause
│   ├── demo-stealth-drain.ts        # Stealth drain: bypasses 80% threshold
│   ├── demo-governance.ts           # Governance hijack → VETO
│   ├── demo-normal.ts                # Normal healthy operation
│   └── show-bridge-state.ts          # Display current bridge state
├── app/                              # Next.js Dashboard
│   ├── page.tsx                      # Main monitoring dashboard
│   ├── demo-controller/page.tsx     # Visual demo controller
│   ├── docs/page.tsx                # Documentation page
│   └── api/
│       ├── status/route.ts           # GET /api/status (+ Groq AI assessment)
│       ├── pause/route.ts            # POST /api/pause
│       ├── demo/execute/route.ts    # POST /api/demo/execute
│       └── demo/analyze/route.ts    # POST /api/demo/analyze
├── components/                        # React Components
├── lib/                              # API client + utilities
├── hardhat.config.ts                 # Hardhat 3 configuration
├── tsconfig.workflow.json            # TypeScript config (CRE workflow)
└── package.json                      # Dependencies (@chainlink/cre-sdk)
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Access to Chainlink CRE environment
- EVM RPC endpoints for source and destination chains

### Installation

```bash
# Install dependencies with pnpm
pnpm install

# Build both Next.js and CRE workflow
pnpm run build

# Start development server
pnpm run dev

# In another terminal, watch workflow changes
pnpm run workflow:watch
```

The dashboard will be available at `http://localhost:3000`

### Configuration

1. Create `.env.local` from template:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your SentinelBridge configuration:
   ```env
   # Bridge contract address
   NEXT_PUBLIC_BRIDGE_ADDRESS=0x1234567890123456789012345678901234567890
   
   # Chain IDs
   SOURCE_CHAIN_ID=1                # Ethereum
   DEST_CHAIN_ID=137                # Polygon
   
   # Risk thresholds
   MAX_RISK_RATIO=0.8               # 80% of source reserves
   EMERGENCY_THRESHOLD=1000000000000000000  # 1 token in wei
   
   # RPC endpoints
   SOURCE_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   DEST_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

## 📊 Dashboard Features

### Hero Section
- **Animated Background**: GPU-accelerated Three.js shader effect
- **Particle Reveal**: Cyan, Blue, Purple color theme
- **Call-To-Action**: Navigate to dashboard or learn more
- **Feature Highlights**: 3 key benefit cards with icons
- **Live Badge**: Shows real-time status indicator

### Real-Time Monitoring
- **System Status**: Bridge operational state and pause status
- **Risk Gauge**: Visual representation of liquidity risk with color-coded zones
- **Reserve Details**: Current reserve balances on both chains
- **Circuit Breaker History**: Latest emergency actions taken

### Key Metrics
- **Risk Ratio**: (Target Locked / Source Reserve) × 100%
- **Max Threshold**: Configurable limit (default 80%)
- **Health Status**: 🟢 Safe, 🟡 Warning, 🔴 Critical

### Auto-Refresh
Dashboard auto-refreshes every 5 seconds to show latest workflow state. Can be toggled on/off with the "Auto-Refresh" button.

## 🔧 API Routes

### GET `/api/status`
Returns current workflow status and reserve balances:
```json
{
  "ok": true,
  "isPaused": false,
  "riskRatio": 42.5,
  "sourceReserve": "1000000000000000000",
  "destReserve": "500000000000000000",
  "targetLocked": "425000000000000000",
  "lastCheck": "2026-03-06T12:34:56.789Z",
  "lastTransactionHash": null
}
```

### POST `/api/pause`
Manually trigger bridge pause (admin only):
```json
{
  "ok": true,
  "transactionHash": "0xabc123def456789"
}
```

### GET `/api/logs`
Fetch recent workflow event logs:
```json
{
  "logs": ["🚀 SentinelBridge initialized", "📡 Event received", ...],
  "timestamp": "2026-03-06T12:34:56.789Z"
}
```

## 🛠️ CRE Workflow Architecture

> **Key files for judges:** `src/workflows/sentinel-bridge/index.ts`, `risk-engine.ts`, `groq-analyzer.ts`

### CRE SDK Capabilities Used

| Capability | SDK Import | Usage |
|---|---|---|
| **CronCapability** | `@chainlink/cre-sdk` | Triggers watchdog on schedule |
| **EVMClient** | `@chainlink/cre-sdk` | Reads bridge state + executes `pause()` |
| **HTTPClient** | `@chainlink/cre-sdk` | Calls Groq LLaMA API for AI analysis |
| **Runner** | `@chainlink/cre-sdk` | Workflow registration + config schema |

### Risk Engine (Multi-Dimensional)

| Dimension | Weight | Detects |
|---|---|---|
| LiquidityVelocityScore | 40% | Slow drains, abnormal withdrawal rates |
| StdDeviationAnomaly (3σ) | 35% | Statistical outliers vs baseline |
| OracleDriftScore | 25% | Reserve ratio manipulation |

### Workflow Flow
```
CRE CronCapability Trigger
  ├─→ EVMClient.callContract() — Read bridge state
  ├─→ risk-engine.ts — Multi-dimensional heuristic scoring
  ├─→ HTTPClient → Groq LLaMA — AI threat classification
  ├─→ AI can escalate heuristic action if confidence ≥ 70%
  └─→ EVMClient.callContract() — Execute bridge.pause() on-chain
```

### Response Tiers
- **LOW** → MONITOR (continue watching)
- **MEDIUM** → RATE_LIMIT (restrict withdrawals)
- **HIGH** → PAUSE (circuit breaker)
- **CRITICAL** → PAUSE + AI alert with attack pattern classification

## 🎨 Customization Guide

### Canvas Hero Section
The hero section uses an advanced Three.js shader animation. To customize:

**Change Colors**:
```tsx
// In components/HeroSection.tsx
<CanvasRevealEffect
  colors={[
    [0, 255, 200],    // Cyan
    [59, 130, 246],   // Blue
    [139, 92, 246],   // Purple
  ]}
/>
```

**Adjust Animation Speed** (0.1 = slow, 1.0 = fast):
```tsx
<CanvasRevealEffect
  animationSpeed={0.5}  // Current: balanced
/>
```

**Change Particle Size**:
```tsx
<CanvasRevealEffect
  dotSize={3}  // 1=fine mist, 3=visible, 5+=bold
/>
```

For detailed Canvas customization, see [CANVAS_SETUP.md](CANVAS_SETUP.md).

### Modifying Risk Threshold Logic
1. Update thresholds in `src/workflows/sentinel-bridge/config.json`
2. Adjust scoring weights in `src/workflows/sentinel-bridge/risk-engine.ts`
3. Test with demo scenarios: `pnpm run demo:crisis`, `pnpm run demo:stealth`

### Adding EVM Calls to CRE Workflow
1. Define ABI in `src/workflows/sentinel-bridge/abi.ts`
2. Use `EVMClient.callContract()` with `encodeCallMsg()` for reads/writes
3. Use `encodeFunctionData()` / `decodeFunctionResult()` from `viem`
4. Add comprehensive `runtime.log()` logging
5. Test with `pnpm run simulate`

## 🔐 Security Checklist

- [ ] Bridge address is not zero address
- [ ] Chain IDs match actual deployment
- [ ] ABI function names match contract
- [ ] Access control on pause() function
- [ ] No hardcoded API keys or secrets
- [ ] All async operations properly awaited
- [ ] Error messages don't expose sensitive data
- [ ] RPC endpoints from trusted sources

## 🚀 Production Deployment

### Key Considerations

1. **RPC Reliability**: Use redundant or commercial RPC providers
2. **Gas Optimization**: Monitor and optimize EVM calls
3. **Monitoring**: Integrate PagerDuty/Slack for alerts
4. **Smart Contract**: Ensure pause() has proper access controls
5. **Backups**: Implement manual pause mechanism
6. **Testing**: Deploy to testnet first

### Example Alert Integration
```typescript
// In workflow onEvent after executePause
if (!pauseResult.ok) {
  // Send alert
  await alerting.sendToSlack({
    channel: "#bridge-alerts",
    severity: "critical",
    message: `SentinelBridge pause failed: ${pauseResult.error}`
  });
}
```

### Deployment Steps
```bash
# 1. Build for production
pnpm run build

# 2. Build CRE workflow
pnpm run workflow:build

# 3. Deploy Next.js (Vercel, Netlify, etc.)
pnpm run start

# 4. Simulate CRE workflow locally
pnpm run simulate

# 5. Deploy CRE workflow to Chainlink network
cre workflow deploy ./src/workflows/sentinel-bridge
```

## 📚 References

### Chainlink CRE Documentation
- [CRE TypeScript SDK](https://docs.chain.link/cre)
- [Event Listening Patterns](https://docs.chain.link/cre/events)
- [EVM Read/Call Operations](https://docs.chain.link/cre/evm)

### Next.js Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Styling with Tailwind](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)

### Tools Used
- **Next.js 15**: React framework with App Router
- **React 19**: UI component library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Three.js (r156)**: 3D WebGL rendering
- **React Three Fiber**: React for Three.js
- **pnpm**: Fast, efficient package manager
- **Jest**: Unit testing framework
- **Chainlink CRE**: Event-driven workflows

### Three.js Canvas Details
- **CanvasRevealEffect**: GPU-accelerated particle animation
- **ShaderMaterial**: Custom vertex and fragment shaders
- **DotMatrix**: Perlin-like noise with time-based animation
- **Performance**: 60 FPS capped, ~150KB bundle size

## 🐛 Troubleshooting

### Dashboard not loading
- Check `.env.local` has correct values
- Verify API routes compile: `pnpm run build`
- Check browser console for client-side errors

### Workflow not triggering
- Ensure CRE environment is configured
- Check RPC endpoints are responding
- Verify bridge address is correct
- Check workflow logs in dashboard

### Risk ratio stuck at same value
- Verify reserve balances are changing
- Check locked amount is being updated
- Ensure RPC connection is stable

## ✅ Chainlink Convergence Hackathon Compliance

| Requirement | Status | Evidence |
|---|---|---|
| **CRE Workflow built** | ✅ | `src/workflows/sentinel-bridge/index.ts` |
| **Blockchain integration** | ✅ | `EVMClient.callContract()` reads + writes |
| **External API/LLM integration** | ✅ | `HTTPClient` → Groq LLaMA-3.1-8B |
| **On-chain state change** | ✅ | `bridge.pause()` via EVMClient |
| **CRE CLI simulation** | ✅ | `pnpm run simulate` |
| **Deploy script auto-syncs config** | ✅ | `deploy-bridge.ts` writes to `config.json` |
| **Public source code** | ✅ | This repository |
| **README links CRE files** | ✅ | See Project Structure above |

### Demo Scenarios — All Working ✅

| Demo | Command | What It Shows |
|---|---|---|
| **Crisis** | `pnpm run demo:crisis` | 4-phase circuit breaker (20% → 95% → PAUSED) |
| **Flash Loan** | `pnpm run demo:flash` | Velocity anomaly detection → watchdog pauses |
| **Stealth Drain** | `pnpm run demo:stealth` | Bypasses 80% static threshold, caught by 3σ |
| **Governance Hijack** | `pnpm run demo:governance` | Unauthorized ownership → VETO queued |
| **Normal** | `pnpm run demo:normal` | Healthy bridge at 20% risk |

## 📄 License

MIT

---

**Last Updated**: March 2026  
**Current Status**: ✅ All systems operational and tested  
**For Hackathon**: Chainlink Convergence 2026  
**CRE Workflow**: [`src/workflows/sentinel-bridge/index.ts`](src/workflows/sentinel-bridge/index.ts)
