"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/Spinner";

export default function DocsPage() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("architecture");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <Spinner size="lg" />
        <p className="font-mono text-[#00E5FF] tracking-widest text-sm animate-pulse">
          LOADING DOCUMENTATION...
        </p>
      </div>
    );
  }

  const sections = [
    { id: "architecture", label: "Architecture" },
    { id: "cre-workflow", label: "CRE Workflow" },
    { id: "risk-engine", label: "Risk Engine" },
    { id: "attack-vectors", label: "Attack Vectors" },
    { id: "smart-contract", label: "Smart Contract" },
    { id: "api-reference", label: "API Reference" },
    { id: "demo-controller", label: "Demo Controller" },
    { id: "quick-start", label: "Quick Start" },
  ];

  return (
    <div className="relative z-10 min-h-screen pt-4 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="border-b border-cyan-500/20 pb-8 mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            SentinelBridge Documentation
          </h1>
          <p className="text-xl text-slate-400 font-light">
            AI-Powered Circuit Breaker for Cross-Chain Bridge Security &mdash; Built with Chainlink CRE
          </p>
        </div>

        {/* Section Nav */}
        <div className="flex flex-wrap gap-2 mb-10 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === s.id
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-14">

          {/* ─── Architecture ─── */}
          <section id="architecture" className="space-y-6">
            <SectionHeading color="cyan" title="The Architecture" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-4">
              <p>
                SentinelBridge operates on a <strong className="text-white">Listen → Evaluate → Act</strong> pipeline, powered entirely by the Chainlink Runtime Environment (CRE). Unlike static threshold monitors that pause at fixed TVL drops, SentinelBridge uses <em>behavioral analysis</em> and <em>AI-driven intent classification</em> to detect sophisticated exploits that evade traditional defenses.
              </p>
              <div className="bg-black/60 rounded-xl border border-cyan-900/50 p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                <pre className="text-cyan-300">{`┌─────────────────────────────────────────────────────────┐
│                  CHAINLINK CRE RUNTIME                    │
│                                                           │
│  ┌──────────────┐    ┌────────────────┐    ┌───────────┐ │
│  │CronCapability│───▶│ onCronTrigger  │───▶│ EVMClient │ │
│  │ (every 60s)  │    │ (orchestrator) │    │ 5 reads   │ │
│  └──────────────┘    └───────┬────────┘    │ + pause() │ │
│                              │             └───────────┘ │
│                     ┌────────▼────────┐                   │
│                     │  Risk Engine    │                   │
│                     │ Velocity  35%   │                   │
│                     │ Anomaly   45%   │                   │
│                     │ Oracle    20%   │                   │
│                     └────────┬────────┘                   │
│                              │                            │
│                     ┌────────▼────────┐                   │
│                     │ Groq Analyzer   │                   │
│                     │ (HTTPClient)    │                   │
│                     │ LLaMA-3.1-8b   │                   │
│                     └────────┬────────┘                   │
│                              │                            │
│                     ┌────────▼────────┐                   │
│                     │Decision Engine  │                   │
│                     │MONITOR / PAUSE  │                   │
│                     └─────────────────┘                   │
└─────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
  SourceBridge.sol                   Next.js Dashboard
  (Hardhat / EVM)                   /dashboard`}</pre>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <PhaseCard phase="1" title="LISTEN" color="cyan" description="CRE CronCapability triggers every 60 seconds. EVMClient reads 5 on-chain state variables from the SourceBridge contract." />
                <PhaseCard phase="2" title="EVALUATE" color="purple" description="Heuristic risk engine scores across 3 dimensions. Groq AI classifies the attack pattern and provides a confidence score." />
                <PhaseCard phase="3" title="ACT" color="red" description="If AI confidence ≥ 0.8 and risk is CRITICAL, EVMClient calls bridge.pause() on-chain. Circuit breaker activated." />
              </div>
            </div>
          </section>

          {/* ─── CRE Workflow Deep Dive ─── */}
          <section id="cre-workflow" className="space-y-6">
            <SectionHeading color="blue" title="Chainlink CRE Workflow" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-5">
              <p>
                The entire CRE workflow lives in <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-sm">src/workflows/sentinel-bridge/</code> and uses the following SDK capabilities:
              </p>

              {/* File Map */}
              <h3 className="text-lg font-bold text-white mt-4">Workflow Files</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="py-2 text-cyan-400 font-mono">File</th>
                      <th className="py-2 text-cyan-400">Lines</th>
                      <th className="py-2 text-cyan-400">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">index.ts</td><td>322</td><td>Main orchestrator &mdash; cron trigger, state reads, risk eval, AI call, pause</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">risk-engine.ts</td><td>315</td><td>Multi-dimensional heuristic scoring engine</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">groq-analyzer.ts</td><td>245</td><td>AI threat classification via CRE HTTPClient → Groq API</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">abi.ts</td><td>47</td><td>SourceBridge contract ABI definitions</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">config.json</td><td>23</td><td>Runtime config (schedule, thresholds, bridge address)</td></tr>
                    <tr><td className="py-2 font-mono text-white">workflow.yaml</td><td>9</td><td>Local simulation configuration</td></tr>
                  </tbody>
                </table>
              </div>

              {/* CRE SDK Imports */}
              <h3 className="text-lg font-bold text-white mt-6">CRE SDK Capabilities Used</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CapabilityCard name="EVMClient" desc="On-chain reads (getSourceReserves, getDestReserves, getLockedAmount, getRiskRatio, isPaused) and writes (pause)" tag="callContract()" />
                <CapabilityCard name="CronCapability" desc="Scheduled trigger that fires every 60 seconds, initiating each monitoring cycle" tag="trigger()" />
                <CapabilityCard name="HTTPClient" desc="Off-chain HTTP calls to Groq API for LLaMA AI threat classification" tag="sendRequest()" />
                <CapabilityCard name="Runner" desc="Workflow bootstrap and lifecycle management. Creates runner and executes init" tag="newRunner()" />
                <CapabilityCard name="handler" desc="Maps CronCapability trigger events to the onCronTrigger handler function" tag="handler()" />
                <CapabilityCard name="encodeCallMsg" desc="Builds EVM call messages with ABI-encoded function parameters" tag="encode()" />
              </div>

              {/* Lifecycle */}
              <h3 className="text-lg font-bold text-white mt-6">Workflow Lifecycle</h3>
              <div className="bg-black/60 rounded-xl border border-blue-900/50 p-5 font-mono text-xs leading-loose">
                <div className="text-blue-400 mb-2">// 1. BOOTSTRAP</div>
                <div className="text-slate-400 ml-4">main() → Runner.newRunner(configSchema) → runner.run(initWorkflow)</div>
                <div className="text-blue-400 mt-3 mb-2">// 2. INIT</div>
                <div className="text-slate-400 ml-4">initWorkflow(config) → CronCapability.create() → handler(cron.trigger, onCronTrigger)</div>
                <div className="text-blue-400 mt-3 mb-2">// 3. EXECUTION (every 60s)</div>
                <div className="text-slate-400 ml-4">
                  <div>├── Read 5 on-chain values via EVMClient.callContract()</div>
                  <div>├── evaluateRisk() → weighted heuristic score</div>
                  <div>├── analyzeWithGroq() via HTTPClient → AI classification</div>
                  <div>└── Decision: CRITICAL + confidence ≥ 0.8 → <span className="text-red-400">pause()</span></div>
                </div>
              </div>

              {/* CRE Config */}
              <h3 className="text-lg font-bold text-white mt-6">CRE Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/60 rounded border border-slate-700 p-4">
                  <div className="text-cyan-400 font-mono text-sm mb-2">cre.yaml</div>
                  <pre className="text-xs text-slate-400">{`project:
  name: sentinel-bridge-watchdog
targets:
  default:
    type: cvm
    runtime: javascript
    main: ./workflow-dist/index.js`}</pre>
                </div>
                <div className="bg-black/60 rounded border border-slate-700 p-4">
                  <div className="text-cyan-400 font-mono text-sm mb-2">config.json</div>
                  <pre className="text-xs text-slate-400">{`{
  "schedule": "0 */1 * * * *",
  "bridgeAddress": "0x...",
  "chainSelector": "16015286601757825753",
  "riskThreshold": 75,
  "criticalThreshold": 90,
  "groqApiKey": "gsk_..."
}`}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Risk Engine ─── */}
          <section id="risk-engine" className="space-y-6">
            <SectionHeading color="purple" title="Risk Engine — Heuristic Scoring" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-5">
              <p>
                The risk engine in <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-sm">risk-engine.ts</code> uses a multi-dimensional weighted scoring system to classify bridge health before passing data to the AI layer.
              </p>

              {/* Scoring Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScoreDimension 
                  title="Liquidity Velocity" 
                  weight={35} 
                  color="cyan"
                  description="Measures the rate of change in locked amount over time. Detects rapid reserve depletion from flash loans and mass withdrawals."
                />
                <ScoreDimension 
                  title="Std Deviation Anomaly" 
                  weight={45} 
                  color="purple"
                  description="Compares current metrics against historical baseline using statistical analysis. Catches outliers beyond the normal distribution."
                />
                <ScoreDimension 
                  title="Oracle Drift" 
                  weight={20} 
                  color="blue"
                  description="Monitors price feed discrepancies and stale oracle data. Detects divergence between internal and external valuations."
                />
              </div>

              {/* Thresholds */}
              <h3 className="text-lg font-bold text-white mt-4">Threshold Levels</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ThresholdCard level="CRITICAL" range="≥ 75" color="red" action="Pause eligible" />
                <ThresholdCard level="HIGH" range="≥ 50" color="orange" action="Rate limit / alert" />
                <ThresholdCard level="MEDIUM" range="≥ 25" color="amber" action="Enhanced monitoring" />
                <ThresholdCard level="LOW" range="< 25" color="emerald" action="Normal operations" />
              </div>

              {/* Special Triggers */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4">
                <div className="text-red-400 font-bold text-sm mb-2">⚡ Instant CRITICAL Triggers</div>
                <p className="text-sm text-slate-400">
                  If <code className="text-red-300">governanceCompromised</code> or <code className="text-red-300">failedProof</code> flags are detected on-chain, the risk engine bypasses scoring entirely and returns an immediate <span className="text-red-400 font-bold">CRITICAL</span> classification.
                </p>
              </div>

              {/* AI Layer */}
              <h3 className="text-lg font-bold text-white mt-6">AI Classification (Groq LLaMA 3.1)</h3>
              <p className="text-sm text-slate-400">
                After heuristic scoring, the bridge telemetry is sent to Groq&apos;s LLaMA-3.1-8b-instant model via CRE&apos;s HTTPClient. The AI responds with a structured threat analysis:
              </p>
              <div className="bg-black/60 rounded border border-purple-900/50 p-4 font-mono text-xs mt-2">
                <pre className="text-purple-300">{`{
  "riskLevel": "CRITICAL",
  "confidence": 0.92,
  "attackPattern": "FLASH_LOAN_EXPLOIT",
  "reasoning": "800 ETH locked in single block exceeds 3σ",
  "recommendation": "EMERGENCY_PAUSE"
}`}</pre>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                3-stage JSON extraction handles malformed AI responses with regex fallback and heuristic defaults.
              </p>
            </div>
          </section>

          {/* ─── Attack Vectors ─── */}
          <section id="attack-vectors" className="space-y-6">
            <SectionHeading color="red" title="Covered Attack Vectors" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AttackCard title="Flash Loan Exploits" tag="HIGH VELOCITY" tagColor="red" description="Attackers borrow massive liquidity to manipulate oracle prices or drain reserves in a single block." defense="AI detects impossible velocity spikes (>10,000x baseline) and triggers an immediate pause." />
              <AttackCard title="Stealth Drain" tag="SLOW BLEED" tagColor="amber" description="Sophisticated attackers siphon funds gradually to stay under static TVL drop alarms." defense="AI correlates sequential minor transactions against the historical standard deviation to extrapolate intent." />
              <AttackCard title="Governance Hijack" tag="ACCESS CONTROL" tagColor="orange" description="A compromised private key allows an attacker to upgrade the contract or alter the vault address." defense="CRE monitors on-chain governanceCompromised flag and instantly escalates to CRITICAL regardless of reserves." />
              <AttackCard title="Proof Fraud" tag="FORGED MESSAGE" tagColor="indigo" description="Bypassing validation by exploiting fast-track execution functions to submit spoofed deposits." defense="CRE monitors the failedProof flag on-chain. AI verifies source hash mismatches and kills the bridge." />
              <AttackCard title="Oracle Lag Arbitrage" tag="PRICE DIVERGENCE" tagColor="rose" description="Exploiting the delay between a real-world price crash and the bridge's internal exchange rate." defense="AI monitors OracleDrift scoring dimension. If internal/external diverges >2% in <1min, protective mode activates." />
              <AttackCard title="Mass Withdrawal (Crisis)" tag="RESERVE DRAIN" tagColor="red" description="Coordinated or exploit-driven mass withdrawal that rapidly depletes source reserves." defense="4-phase detection: velocity spike detection → risk escalation → threshold breach → automatic circuit breaker." />
            </div>
            <div className="card p-5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
              <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                <span>Normal Traffic</span>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">BENIGN</span>
              </h3>
              <p className="text-sm text-slate-400">
                AI categorizes everyday bridge traffic as &quot;NORMAL CLEAR&quot; with high confidence, ensuring zero false-positive pauses.
              </p>
            </div>
          </section>

          {/* ─── Smart Contract ─── */}
          <section id="smart-contract" className="space-y-6">
            <SectionHeading color="emerald" title="Smart Contract — SourceBridge.sol" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-5">
              <p>
                <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-sm">contracts/SourceBridge.sol</code> &mdash; Solidity 0.8.20 mock bridge with reserve management, circuit breaker, and attack simulation functions.
              </p>

              <h3 className="text-lg font-bold text-white">State Variables</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-left">
                    <th className="py-2 text-cyan-400 font-mono">Variable</th>
                    <th className="py-2 text-cyan-400">Type</th>
                    <th className="py-2 text-cyan-400">Purpose</th>
                  </tr></thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">sourceReserve</td><td>uint256</td><td>Token reserves on source chain (initial: 1000 ETH)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">destinationReserve</td><td>uint256</td><td>Token reserves on destination chain (initial: 500 ETH)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">lockedAmount</td><td>uint256</td><td>Tokens currently locked/bridged (initial: 200 ETH)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">paused</td><td>bool</td><td>Circuit breaker status</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">governanceCompromised</td><td>bool</td><td>Governance hijack simulation flag</td></tr>
                    <tr><td className="py-2 font-mono text-white">failedProof</td><td>bool</td><td>Proof verification failure flag</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-bold text-white mt-4">Key Functions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-left">
                    <th className="py-2 text-cyan-400 font-mono">Function</th>
                    <th className="py-2 text-cyan-400">Access</th>
                    <th className="py-2 text-cyan-400">Purpose</th>
                  </tr></thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-red-400">pause()</td><td>Owner</td><td>Emergency circuit breaker activation</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-emerald-400">unpause()</td><td>Owner</td><td>Resume bridge operations</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">bridgeTokens(amount)</td><td>Public</td><td>Simulate token bridging</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">setReserves(src, dest)</td><td>Owner</td><td>Set reserve balances (demo)</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">triggerGovernanceHijack()</td><td>Owner</td><td>Simulate governance compromise</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-white">triggerProofFailure()</td><td>Owner</td><td>Simulate proof verification failure</td></tr>
                    <tr><td className="py-2 font-mono text-white">resetAttackFlags()</td><td>Owner</td><td>Clear all attack simulation flags</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="text-cyan-400 font-bold text-sm mb-1">Initial State</div>
                <p className="text-sm text-slate-400">1000 ETH source reserve, 500 ETH destination reserve, 200 ETH locked = <span className="text-white font-bold">20% risk ratio</span> (healthy baseline)</p>
              </div>
            </div>
          </section>

          {/* ─── API Reference ─── */}
          <section id="api-reference" className="space-y-6">
            <SectionHeading color="amber" title="API Reference" />
            <div className="card p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-left">
                    <th className="py-2 text-cyan-400">Method</th>
                    <th className="py-2 text-cyan-400">Endpoint</th>
                    <th className="py-2 text-cyan-400">Purpose</th>
                  </tr></thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">GET</span></td>
                      <td className="font-mono text-white">/api/status</td>
                      <td>Full bridge state + Groq AI risk assessment</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">POST</span></td>
                      <td className="font-mono text-white">/api/pause</td>
                      <td>Execute emergency pause() on SourceBridge</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">POST</span></td>
                      <td className="font-mono text-white">/api/demo/analyze</td>
                      <td>AI threat analysis for current state</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">POST</span></td>
                      <td className="font-mono text-white">/api/demo/execute</td>
                      <td>Run a demo scenario via Hardhat script</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">GET</span></td>
                      <td className="font-mono text-white">/api/demo/bridge-state</td>
                      <td>Current bridge telemetry (reserves, flags, risk)</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="py-2"><span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">GET</span></td>
                      <td className="font-mono text-white">/api/demo/status</td>
                      <td>Demo controller status</td>
                    </tr>
                    <tr>
                      <td className="py-2"><span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">GET</span></td>
                      <td className="font-mono text-white">/api/logs</td>
                      <td>Activity log entries</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-bold text-white mt-4">Example: Status Response</h3>
              <div className="bg-black/60 rounded border border-amber-900/50 p-4 font-mono text-xs">
                <pre className="text-amber-300">{`{
  "ok": true,
  "isPaused": false,
  "riskRatio": 20,
  "sourceReserve": "1000.0",
  "destReserve": "500.0",
  "targetLocked": "200.0",
  "governanceCompromised": false,
  "failedProof": false,
  "ai": {
    "assessment": "NORMAL TRAFFIC",
    "confidence": 95,
    "details": "All metrics within baseline parameters.",
    "recommendation": "MONITOR"
  }
}`}</pre>
              </div>
            </div>
          </section>

          {/* ─── Demo Controller ─── */}
          <section id="demo-controller" className="space-y-6">
            <SectionHeading color="purple" title="Demo Controller" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-5">
              <p>
                Use the Demo Controller at <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-sm">/demo-controller</code> to simulate attacks, or run from the CLI:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-700 text-left">
                    <th className="py-2 text-cyan-400">Command</th>
                    <th className="py-2 text-cyan-400">Scenario</th>
                    <th className="py-2 text-cyan-400">What Happens</th>
                  </tr></thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-emerald-400">pnpm run demo:normal</td><td>Healthy Traffic</td><td>Baseline ~20% risk, all flags clear</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-red-400">pnpm run demo:crisis</td><td>Catastrophic Exploit</td><td>4-phase drain: 50% → 70% → 85% → PAUSE</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-red-400">pnpm run demo:flash</td><td>Flash Loan Attack</td><td>800 ETH locked in single block</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-amber-400">pnpm run demo:stealth</td><td>Stealth Drain</td><td>Incremental drain 350 → 450 → 550 → 650 → 720</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-orange-400">pnpm run demo:governance</td><td>Governance Hijack</td><td>Multi-sig compromise → 700 ETH drain → PAUSE</td></tr>
                    <tr className="border-b border-slate-800"><td className="py-2 font-mono text-indigo-400">pnpm run demo:oracle</td><td>Oracle/Proof Fraud</td><td>Forged Merkle proof → 600 ETH exploit → PAUSE</td></tr>
                    <tr><td className="py-2 font-mono text-slate-400">pnpm run demo:show</td><td>View State</td><td>Prints current on-chain bridge state</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="text-cyan-400 font-bold text-sm mb-1">Re-runnable Demos</div>
                <p className="text-sm text-slate-400">All demo scripts automatically reset the bridge to a healthy baseline at startup (unpause, clear attack flags, restore 1000/500/200 reserves), so they can be run in any order.</p>
              </div>
            </div>
          </section>

          {/* ─── Quick Start ─── */}
          <section id="quick-start" className="space-y-6">
            <SectionHeading color="emerald" title="Quick Start Guide" />
            <div className="card p-6 text-slate-300 leading-relaxed space-y-5">
              <h3 className="text-lg font-bold text-white">Prerequisites</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-sm">
                <li>Node.js v18+</li>
                <li>pnpm v9.0+</li>
                <li>A Groq API key (free tier at <span className="text-cyan-400">console.groq.com</span>)</li>
              </ul>

              <h3 className="text-lg font-bold text-white mt-4">Setup</h3>
              <div className="space-y-3">
                <CodeStep step={1} title="Install" code="pnpm install" />
                <CodeStep step={2} title="Environment" code={`# Create .env.local\nNEXT_PUBLIC_API_URL=http://localhost:3000\nGROQ_API_KEY=your_groq_api_key_here`} />
                <CodeStep step={3} title="Start Hardhat Node" code="npx hardhat node" />
                <CodeStep step={4} title="Deploy & Run" code={`pnpm run node:deploy\npnpm run build\npnpm start`} />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mt-4">
                <div className="text-emerald-400 font-bold text-sm mb-1">Development Mode</div>
                <p className="text-sm text-slate-400">Use <code className="text-cyan-300 bg-black/40 px-1 rounded">pnpm dev</code> instead of build + start for hot-reloading during development.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Sub-Components ─── */

function SectionHeading({ color, title }: { color: string; title: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
    blue: "text-blue-400 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]",
    purple: "text-purple-400 bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]",
    red: "text-red-400 bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
    amber: "text-amber-400 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    emerald: "text-emerald-400 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  };
  const c = colors[color] || colors.cyan;
  const textColor = c.split(" ")[0];
  const dotClasses = c.split(" ").slice(1).join(" ");
  return (
    <h2 className={`text-2xl font-bold ${textColor} flex items-center gap-3`}>
      <span className={`w-2 h-2 rounded-full ${dotClasses} mr-2`}></span>
      {title}
    </h2>
  );
}

function PhaseCard({ phase, title, color, description }: { phase: string; title: string; color: string; description: string }) {
  const borderColors: Record<string, string> = { cyan: "border-cyan-500/30", purple: "border-purple-500/30", red: "border-red-500/30" };
  const textColors: Record<string, string> = { cyan: "text-cyan-400", purple: "text-purple-400", red: "text-red-400" };
  return (
    <div className={`bg-black/40 border ${borderColors[color] || ""} rounded-xl p-4`}>
      <div className={`text-xs font-mono ${textColors[color] || ""} mb-1`}>PHASE {phase}</div>
      <div className="text-white font-bold mb-2">{title}</div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function CapabilityCard({ name, desc, tag }: { name: string; desc: string; tag: string }) {
  return (
    <div className="bg-black/40 border border-blue-500/20 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm text-white font-bold">{name}</span>
        <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{tag}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function ScoreDimension({ title, weight, color, description }: { title: string; weight: number; color: string; description: string }) {
  const barColors: Record<string, string> = { cyan: "bg-cyan-500", purple: "bg-purple-500", blue: "bg-blue-500" };
  const textColors: Record<string, string> = { cyan: "text-cyan-400", purple: "text-purple-400", blue: "text-blue-400" };
  return (
    <div className="bg-black/40 border border-slate-700 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className={`font-bold text-sm ${textColors[color] || ""}`}>{title}</span>
        <span className="text-white font-mono font-bold">{weight}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
        <div className={`h-2 rounded-full ${barColors[color] || ""}`} style={{ width: `${weight}%` }}></div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ThresholdCard({ level, range, color, action }: { level: string; range: string; color: string; action: string }) {
  const bgColors: Record<string, string> = { red: "bg-red-500/15 border-red-500/30 text-red-400", orange: "bg-orange-500/15 border-orange-500/30 text-orange-400", amber: "bg-amber-500/15 border-amber-500/30 text-amber-400", emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" };
  const cls = bgColors[color] || "";
  return (
    <div className={`border rounded-xl p-3 text-center ${cls}`}>
      <div className="font-bold text-sm">{level}</div>
      <div className="font-mono text-lg font-black mt-1">{range}</div>
      <div className="text-[10px] mt-1 opacity-70">{action}</div>
    </div>
  );
}

function AttackCard({ title, tag, tagColor, description, defense }: { title: string; tag: string; tagColor: string; description: string; defense: string }) {
  const tagBg: Record<string, string> = { red: "bg-red-500/20 text-red-400", amber: "bg-amber-500/20 text-amber-400", orange: "bg-orange-500/20 text-orange-400", indigo: "bg-indigo-500/20 text-indigo-400", rose: "bg-rose-500/20 text-rose-400" };
  const borderHover: Record<string, string> = { red: "hover:border-red-500/30", amber: "hover:border-amber-500/30", orange: "hover:border-orange-500/30", indigo: "hover:border-indigo-500/30", rose: "hover:border-rose-500/30" };
  return (
    <div className={`card p-5 ${borderHover[tagColor] || ""} transition-colors`}>
      <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
        <span>{title}</span>
        <span className={`text-xs font-mono px-2 py-1 rounded ${tagBg[tagColor] || ""}`}>{tag}</span>
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-3">{description}</p>
      <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
        <span className="text-slate-500">Defense: </span>{defense}
      </div>
    </div>
  );
}

function CodeStep({ step, title, code }: { step: number; title: string; code: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">{step}</div>
      <div className="flex-grow">
        <div className="text-white font-bold text-sm mb-1">{title}</div>
        <div className="bg-black/60 rounded border border-slate-700 p-3 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre-wrap">{code}</pre>
        </div>
      </div>
    </div>
  );
}
