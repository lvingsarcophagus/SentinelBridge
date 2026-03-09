<div align="center">
  <img src="public/sentinel_logo_new_1772987283819.png" alt="SentinelBridge Logo" width="150"/>
  <h1>🛡️ SentinelBridge</h1>
  <p><strong>Institutional-Grade Liquidity Watchdog & Automated Circuit Breaker</strong></p>
  <p><em>Built with Chainlink CRE & Groq Fast AI for the Convergence Hackathon 2026</em></p>

  ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
  ![Chainlink CRE](https://img.shields.io/badge/Chainlink-CRE-375BD2?logo=chainlink)
  ![Groq AI](https://img.shields.io/badge/Groq-LLaMA_3.1-orange)
  ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)
  ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

<hr/>

## Table of Contents

- [Demo Video](#-demo-video)
- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Architecture](#-architecture)
- [Chainlink CRE Workflow — Deep Dive](#%EF%B8%8F-chainlink-cre-workflow--deep-dive)
- [Core Features](#-core-features)
- [Tech Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start Guide](#-quick-start-guide)
- [Running Simulations](#-running-simulations-demo-controller)
- [API Endpoints](#-api-endpoints)
- [Smart Contract](#-smart-contract-sourcebridge)
- [Security Considerations](#-security-considerations)
- [License](#-license)

---

## 🎬 Demo Video

<div align="center">
  <a href="https://drive.google.com/file/d/1SRKN3Pf6MLVfXkb_Kee33z8MAh2E7uTR/view?usp=drive_link">
    <img src="public/sentinel_logo_new_1772987283819.png" alt="Watch Demo" width="80" style="border-radius:50%"/>
    <br/>
    <strong>▶ Watch the Full Demo Video</strong>
  </a>
</div>

---

## �🎯 The Problem

Cross-chain bridges are the lifeblood of interoperability but remain the most vulnerable attack vector in DeFi, having lost over **$2.8B** to exploits (Ronin $625M, Wormhole $326M, Nomad $190M, Multichain $126M). Traditional security systems respond to hacks *after* the funds have left the contract — by then, it is too late.

**The gap**: No existing solution combines *on-chain monitoring*, *behavioral analysis*, *AI threat classification*, and *automated emergency response* into a single trustless pipeline.

---

## 🛡️ The Solution

**SentinelBridge** is a proactive, AI-powered liquidity watchdog that monitors bridge reserves in real-time. By leveraging **Chainlink's CRE (Chainlink Runtime Environment)** and **Groq's LLaMA 3.1 AI**, it acts as an automated circuit breaker that pauses the bridge *during* an exploit — not after.

### Listen → Evaluate → Act

| Phase | Engine | What It Does |
|-------|--------|-------------|
| **Listen** | CRE `CronCapability` | Triggers every 60 seconds, reads 5 on-chain state variables via `EVMClient` |
| **Evaluate** | Heuristic Risk Engine + Groq AI | Multi-dimensional scoring (velocity 35%, anomaly 45%, oracle drift 20%) plus LLaMA AI classification |
| **Act** | CRE `EVMClient` | Calls `bridge.pause()` on-chain if AI confidence ≥ 0.8 and risk is CRITICAL |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CHAINLINK CRE RUNTIME                           │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │ CronCapability│──▶│   onCronTrigger  │──▶│    EVMClient       │  │
│  │ (every 60s)  │   │   (orchestrator)  │   │ callContract()     │  │
│  └──────────────┘   └────────┬─────────┘   │ - getSourceReserves│  │
│                              │              │ - getDestReserves  │  │
│                     ┌────────▼─────────┐   │ - getLockedAmount  │  │
│                     │   Risk Engine    │   │ - getRiskRatio     │  │
│                     │ (Heuristic Score)│   │ - isPaused         │  │
│                     │ Velocity  35%    │   │ - pause()          │  │
│                     │ Anomaly   45%    │   └────────────────────┘  │
│                     │ OracleDrift 20%  │                           │
│                     └────────┬─────────┘                           │
│                              │                                     │
│                     ┌────────▼─────────┐                           │
│                     │  Groq Analyzer   │                           │
│                     │  (HTTPClient)    │                           │
│                     │ LLaMA-3.1-8b    │                           │
│                     │ Threat Classify  │                           │
│                     └────────┬─────────┘                           │
│                              │                                     │
│                     ┌────────▼─────────┐                           │
│                     │ Decision Engine  │                           │
│                     │ MONITOR / PAUSE  │                           │
│                     │ RATE_LIMIT       │                           │
│                     └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
┌──────────────────┐                     ┌────────────────────────┐
│  SourceBridge.sol │                     │   Next.js Dashboard    │
│  (Hardhat/EVM)   │                     │   /dashboard           │
│  Solidity 0.8.20 │                     │   /demo-controller     │
└──────────────────┘                     └────────────────────────┘
```

---

## ⛓️ Chainlink CRE Workflow — Deep Dive

> **This is the core of the project.** The entire CRE workflow lives in `src/workflows/sentinel-bridge/`.

### File Map

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 322 | Main orchestrator — cron trigger, state reads, risk evaluation, AI call, pause execution |
| `risk-engine.ts` | 315 | Multi-dimensional heuristic scoring engine |
| `groq-analyzer.ts` | 245 | AI threat classification via CRE `HTTPClient` → Groq API |
| `abi.ts` | 47 | Contract ABI for `SourceBridge.sol` |
| `config.json` | 23 | Runtime config (schedule, thresholds, bridge address, Groq API key) |
| `workflow.yaml` | 9 | Local simulation config |

### CRE SDK Imports Used

```typescript
import {
  EVMClient,           // On-chain reads & writes (callContract)
  CronCapability,      // Scheduled trigger registration
  Runner,              // Workflow bootstrap & lifecycle
  handler,             // Maps triggers to handler functions
  Runtime,             // Typed config & logging access
  HTTPClient,          // Off-chain HTTP calls (Groq API)
  bytesToHex,          // Decode EVM return values
  encodeCallMsg,       // Build EVM call messages
  getNetwork,          // Resolve chain selector → network
  isChainSelectorSupported, // Validate chain ID
  LAST_FINALIZED_BLOCK_NUMBER // Target finalized block for reads
} from "@chainlink/cre-sdk";
```

### CRE Configuration Files

**`cre.yaml`** — Project-level CRE config:
```yaml
project:
  name: sentinel-bridge-watchdog
targets:
  default:
    type: cvm            # Chainlink Virtual Machine
    runtime: javascript  # JS runtime for workflow
    main: ./workflow-dist/index.js
```

**`project.yaml`** — RPC endpoint config for staging/production  
**`tsconfig.workflow.json`** — Separate TypeScript compilation for the CRE workflow (outputs to `./dist/`)

### Workflow Lifecycle

```
1. BOOTSTRAP
   main() → Runner.newRunner(configSchema) → runner.run(initWorkflow)

2. INIT
   initWorkflow(config) → CronCapability.create() → handler(cron.trigger({schedule}), onCronTrigger)

3. EXECUTION (every 60 seconds via CronCapability)
   onCronTrigger(runtime):
     ├── Step 1: Read on-chain state (5 EVMClient.callContract calls)
     │   ├── getSourceReserves()  → sourceReserve (BigInt)
     │   ├── getDestReserves()    → destReserve (BigInt)
     │   ├── getLockedAmount()    → lockedAmount (BigInt)
     │   ├── getRiskRatio()       → riskRatio (uint256)
     │   └── isPaused()           → bridgePaused (bool)
     │
     ├── Step 2: Heuristic risk scoring (evaluateRisk)
     │   ├── LiquidityVelocityScore  (35% weight)
     │   ├── StdDeviationAnomaly     (45% weight)
     │   └── OracleDriftScore        (20% weight)
     │   → Returns: { score, level: CRITICAL|HIGH|MEDIUM|LOW }
     │
     ├── Step 3: AI threat classification (analyzeWithGroq via HTTPClient)
     │   ├── Sends reserve data + risk scores to Groq API
     │   ├── LLaMA-3.1-8b classifies attack pattern
     │   └── Returns: { riskLevel, confidence, attackPattern, reasoning, recommendation }
     │
     └── Step 4: Decision engine (AI-enhanced rules)
         ├── CRITICAL + confidence ≥ 0.8 → EVMClient.callContract("pause") 🚨
         ├── HIGH + confidence ≥ 0.7     → Rate limit (log warning) ⚠️
         └── Otherwise                   → Monitor (log status) 📊
```

### How CRE Capabilities Are Used

#### 1. `CronCapability` — Scheduled Trigger
```typescript
const cron = new CronCapability(config);
handler(cron.trigger({ schedule: config.schedule }), onCronTrigger);
// Schedule: "0 */1 * * * *" (every 60 seconds)
```
The CRE runtime invokes `onCronTrigger` on the configured schedule. This is the entry point for every monitoring cycle.

#### 2. `EVMClient` — On-Chain Reads & Writes
```typescript
// READ: Get current reserve balance
const msg = encodeCallMsg({
  contractAddress: config.bridgeAddress,
  functionName: "getSourceReserves",
  abi: SOURCE_BRIDGE_ABI,
  args: [],
});
const result = await EVMClient.callContract(runtime, {
  network: getNetwork(config.chainSelector),
  callMsg: msg,
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
});
const sourceReserve = BigInt(bytesToHex(result));

// WRITE: Emergency pause
const pauseMsg = encodeCallMsg({
  contractAddress: config.bridgeAddress,
  functionName: "pause",
  abi: SOURCE_BRIDGE_ABI,
  args: [],
});
await EVMClient.callContract(runtime, {
  network: getNetwork(config.chainSelector),
  callMsg: pauseMsg,
});
```

#### 3. `HTTPClient` — Groq AI Integration
```typescript
const response = await HTTPClient.sendRequest(runtime, {
  url: "https://api.groq.com/openai/v1/chat/completions",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.groqApiKey}`,
  },
  body: JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: threatPrompt }],
    temperature: 0.1,
  }),
});
```

### Risk Engine — Heuristic Scoring

The risk engine in `risk-engine.ts` scores bridge health across three weighted dimensions:

| Dimension | Weight | What It Detects |
|-----------|--------|----------------|
| **Liquidity Velocity** | 35% | Rapid reserve changes (flash loans, mass withdrawals) |
| **Std Deviation Anomaly** | 45% | Statistical outliers from historical baseline |
| **Oracle Drift** | 20% | Price feed discrepancies, stale oracles |

**Thresholds:**
- `score ≥ 75` → **CRITICAL** (circuit breaker eligible)
- `score ≥ 50` → **HIGH** (rate limit / alert)
- `score ≥ 25` → **MEDIUM** (monitor)
- `score < 25` → **LOW** (healthy)

**Special triggers:** `governanceCompromised` or `failedProof` flags → instant **CRITICAL** (bypasses scoring)

### AI Threat Classification (Groq)

The `groq-analyzer.ts` sends bridge telemetry to Groq's LLaMA-3.1-8b model via the CRE `HTTPClient`. The AI responds with:

```json
{
  "riskLevel": "CRITICAL",
  "confidence": 0.92,
  "attackPattern": "FLASH_LOAN_EXPLOIT",
  "reasoning": "800 ETH locked in single block exceeds 3σ from baseline",
  "recommendation": "EMERGENCY_PAUSE"
}
```

The 3-stage JSON extraction handles malformed AI responses with regex fallback and heuristic defaults.

---

## ⚡ Core Features

| Feature | Description |
|---------|-------------|
| 🛡️ **Automated Circuit Breaker** | Pauses bridge operations via CRE when AI detects critical liquidity outflow |
| 🧠 **AI Threat Intelligence** | Real-time Groq LLaMA analysis with attack pattern classification |
| 🕵️ **Stealth Drain Detection** | Identifies slow-drip exploits that evade traditional TVL alerts |
| 🚨 **Governance & Proof Monitoring** | Detects compromised multi-sigs and invalid ZK-proofs |
| 📊 **Multi-Dimensional Risk Scoring** | Velocity + Anomaly + Oracle Drift with weighted scoring |
| 🎛️ **Interactive Demo Controller** | Simulate 6 attack vectors against a live Hardhat node |
| ⚡ **Emergency Kill Switch** | Manual `pause()` execution from the dashboard UI |
| 📈 **Real-Time Dashboard** | Live metrics, risk gauge, activity log, security flag indicators |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Workflow** | Chainlink CRE SDK (`@chainlink/cre-sdk`) | On-chain monitoring, scheduled triggers, emergency response |
| **AI** | Groq API (LLaMA-3.1-8b-instant) | Threat classification, confidence scoring, attack pattern recognition |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS | Dashboard, demo controller, documentation pages |
| **Smart Contracts** | Solidity 0.8.20, Hardhat 3.x | `SourceBridge.sol` — mock bridge with pause/unpause, reserves, attack flags |
| **Language** | TypeScript (strict mode) | End-to-end type safety |
| **Package Manager** | pnpm 9.0+ | Fast, efficient dependency resolution |

---

## 📁 Project Structure

```
SentinelBridge/
├── src/workflows/sentinel-bridge/   # ⛓️ CHAINLINK CRE WORKFLOW
│   ├── index.ts                     #   Main orchestrator (CronCapability → EVMClient → Risk → AI → Pause)
│   ├── risk-engine.ts               #   Multi-dimensional heuristic scoring
│   ├── groq-analyzer.ts             #   AI classification via CRE HTTPClient
│   ├── abi.ts                       #   SourceBridge contract ABI
│   ├── config.json                  #   Runtime config (schedule, thresholds)
│   └── workflow.yaml                #   Local simulation config
│
├── contracts/
│   └── SourceBridge.sol             # Mock bridge contract (Solidity 0.8.20)
│
├── app/                             # Next.js 15 App Router
│   ├── page.tsx                     #   Landing page (Hero, How It Works, Threat Coverage)
│   ├── layout.tsx                   #   Root layout (Navbar, BackgroundCanvas)
│   ├── globals.css                  #   Tailwind + custom glass-morphism theme
│   ├── dashboard/page.tsx           #   Command center (metrics, risk gauge, kill switch)
│   ├── demo-controller/page.tsx     #   Attack simulation controller
│   ├── docs/page.tsx                #   Architecture & demo documentation
│   └── api/
│       ├── status/route.ts          #   Bridge state + AI assessment
│       ├── pause/route.ts           #   Emergency kill switch (real contract interaction)
│       ├── logs/route.ts            #   Activity log endpoint
│       └── demo/
│           ├── analyze/route.ts     #   AI threat analysis
│           ├── execute/route.ts     #   Demo scenario execution
│           ├── bridge-state/route.ts#   Current bridge telemetry
│           └── status/route.ts      #   Demo status
│
├── components/                      # React components
│   ├── Navbar.tsx                   #   Glass-morphism navigation
│   ├── HeroSection.tsx              #   Landing hero with logo
│   ├── BackgroundCanvas.tsx         #   Animated background
│   ├── Spinner.tsx                  #   Loading animation
│   ├── DashboardCard.tsx            #   Metric cards
│   ├── RiskGauge.tsx                #   Visual risk indicator
│   ├── ActivityLog.tsx              #   Scrollable log feed
│   └── WorkflowActionCard.tsx       #   Workflow status cards
│
├── scripts/                         # Hardhat demo scripts
│   ├── deploy-bridge.ts             #   Contract deployment
│   ├── demo-crisis.ts               #   Catastrophic exploit simulation
│   ├── demo-flash-loan.ts           #   Flash loan attack
│   ├── demo-stealth-drain.ts        #   Slow drain attack
│   ├── demo-governance.ts           #   Governance hijack
│   ├── demo-oracle.ts               #   Oracle/proof fraud
│   ├── demo-normal.ts               #   Healthy traffic baseline
│   └── show-bridge-state.ts         #   Current state display
│
├── lib/                             # Shared utilities
│   ├── api.ts                       #   Frontend API helpers
│   ├── cache.ts                     #   Response caching
│   ├── simulation.ts                #   CLI simulation engine
│   └── utils.ts                     #   Common utilities
│
├── cre.yaml                         # CRE project config (cvm target)
├── project.yaml                     # CRE RPC endpoints
├── tsconfig.workflow.json           # CRE workflow TypeScript config
├── hardhat.config.ts                # Hardhat config (Solidity 0.8.20)
├── package.json                     # Scripts & dependencies
└── README.md                        # This file
```

---

## 🚀 Quick Start Guide

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v9.0+
- A [Groq API key](https://console.groq.com/) (free tier works)

### 1. Install Dependencies

```bash
git clone https://github.com/your-username/SentinelBridge.git
cd SentinelBridge
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Start the Local Blockchain

**Terminal 1:**
```bash
npx hardhat node
```

### 4. Deploy the Contract & Start the App

**Terminal 2:**
```bash
# Deploy SourceBridge to localhost
pnpm run node:deploy

# Build Next.js + compile CRE workflow
pnpm run build

# Start production server on port 3000
pnpm start
```

*(Alternatively, use `pnpm dev` for hot-reloading during development.)*

### 5. Open the Dashboard

Navigate to **http://localhost:3000** → Click **"Enter Command Center"** → See the live dashboard.

---

## 🎮 Running Simulations (Demo Controller)

Navigate to **http://localhost:3000/demo-controller** for the interactive UI, or use the CLI:

| Command | Scenario | What Happens |
|---------|----------|-------------|
| `pnpm run demo:normal` | Healthy Traffic | Baseline ~20% risk ratio, all flags clear |
| `pnpm run demo:crisis` | Catastrophic Exploit | 4-phase drain: 50% → 70% → 85% → PAUSE |
| `pnpm run demo:flash` | Flash Loan Attack | 800 ETH locked in single block, velocity spike |
| `pnpm run demo:stealth` | Stealth Drain | Incremental drain 350 → 450 → 550 → 650 → 720 ETH |
| `pnpm run demo:governance` | Governance Hijack | Multi-sig compromise → 700 ETH drain → PAUSE |
| `pnpm run demo:oracle` | Oracle/Proof Fraud | Forged Merkle proof → 600 ETH exploit → PAUSE |
| `pnpm run demo:show` | View State | Prints current on-chain bridge state |

### Attack Lifecycle

1. Run an attack script (e.g., `pnpm run demo:crisis`)
2. The `SourceBridge` contract state updates with simulated outflows
3. Keep the Dashboard (`/dashboard`) open — the AI instantly detects the anomaly
4. AI classifies the threat (e.g., **"MASSIVE EXPLOIT"**, confidence **0.95**)
5. Circuit breaker status flips to **ACTIVATED (Paused)** 🚨

---

## 📡 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/status` | Full bridge state + Groq AI risk assessment |
| `POST` | `/api/pause` | Execute emergency `pause()` on SourceBridge contract |
| `POST` | `/api/demo/analyze` | AI threat analysis for a given scenario |
| `POST` | `/api/demo/execute` | Run a demo scenario via Hardhat script |
| `GET` | `/api/demo/bridge-state` | Current bridge telemetry (reserves, flags, risk) |
| `GET` | `/api/demo/status` | Demo controller status |
| `GET` | `/api/logs` | Activity log entries |

---

## 📜 Smart Contract: SourceBridge

`contracts/SourceBridge.sol` — Solidity 0.8.20

### State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `sourceReserve` | `uint256` | Token reserves on source chain |
| `destinationReserve` | `uint256` | Token reserves on destination chain |
| `lockedAmount` | `uint256` | Tokens currently locked/bridged |
| `paused` | `bool` | Circuit breaker status |
| `governanceCompromised` | `bool` | Governance hijack flag |
| `failedProof` | `bool` | Proof verification failure flag |

### Key Functions
| Function | Access | Purpose |
|----------|--------|---------|
| `pause()` | Owner | Emergency circuit breaker activation |
| `unpause()` | Owner | Resume bridge operations |
| `bridgeTokens(amount)` | Public | Simulate token bridging |
| `setReserves(src, dest)` | Owner | Set reserve balances (demo) |
| `setLockedAmount(amount)` | Owner | Set locked amount (demo) |
| `triggerGovernanceHijack()` | Owner | Simulate governance compromise |
| `triggerProofFailure()` | Owner | Simulate proof verification failure |
| `resetAttackFlags()` | Owner | Clear all attack flags |

**Initial State:** 1000 ETH source reserve, 500 ETH dest reserve, 200 ETH locked (20% risk ratio)

---

## 🔐 Security Considerations

- **Address validation**: All contract addresses validated before EVM calls
- **Chain ID verification**: `isChainSelectorSupported()` check before every on-chain operation
- **Result pattern**: All EVM operations use `Result<T>` — no unhandled undefined access
- **Async safety**: Every `await` properly handled; no floating promises
- **State integrity**: State mutations only after confirmed successful operations
- **No hardcoded secrets**: API keys loaded from environment variables at runtime
- **AI fallback**: If Groq API fails, heuristic scoring continues independently
- **False positive protection**: AI confidence threshold (0.8) prevents unnecessary pauses

---

## � Development Log

| Date | Change | Details |
|------|--------|---------|
| Mar 9, 2026 | Docs page rewrite | Expanded `/docs` from 3 sections (212 lines) to 8 comprehensive sections (~450 lines): Architecture with ASCII diagram, CRE Workflow deep dive (file map, SDK capabilities, lifecycle, config), Risk Engine scoring (3 dimensions with weights), Attack Vectors with defense strategies, Smart Contract reference, API Reference with example response, Demo Controller with CLI commands, Quick Start guide. Added section nav bar and reusable sub-components. |
| Mar 9, 2026 | SSL fix for Groq API | Created `lib/groq-client.ts` with custom HTTPS agent (keepAlive:false, TLS 1.2 min) and 3-retry exponential backoff. Updated both API routes to use shared client. |
| Mar 9, 2026 | Crisis demo fix | Added reset Phase 0 to `demo-crisis.ts` (unpause + resetAttackFlags + setReserves + setLockedAmount). Added `resetAttackFlags()` to flash-loan, stealth-drain, normal demo scripts. |
| Mar 9, 2026 | Logo rounded | Changed all 4 logo containers from `rounded-2xl`/`rounded-xl`/`rounded-lg` to `rounded-full`. |
| Mar 8, 2026 | Comprehensive README | Wrote full submission README with CRE deep dive, architecture diagram, all features, and security docs. |
| Mar 8, 2026 | Kill switch functional | Rewrote `/api/pause/route.ts` from stub to real contract interaction via Hardhat script. |
| Mar 8, 2026 | Landing page + loading | Rewrote homepage as proper landing page. Added unified Spinner animation to all pages. |
| Mar 8, 2026 | Build fix | Fixed `Parameter 'rule' implicitly has an 'any' type` in next.config.ts. |

---

## �📜 License

This project is licensed under the MIT License — built for the **Chainlink Convergence Hackathon 2026**.
