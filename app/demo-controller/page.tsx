"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Spinner } from "@/components/Spinner";

interface Status {
  nodeRunning: boolean;
  deployed: boolean;
  contractAddress: string | null;
  demoRunning: boolean;
}

interface DemoOutput {
  title: string;
  output: string;
  success: boolean;
  loading: boolean;
}

interface AIAnalysis {
  assessment: string;
  confidence: number;
  details: string;
  recommendation: string;
}

interface BridgeState {
  riskRatio: number;
  sourceReserve: string;
  destReserve: string;
  lockedAmount: string;
  isPaused: boolean;
  governanceCompromised?: boolean;
  failedProof?: boolean;
}

const SCENARIOS = [
  { key: "normal", label: "Normal Traffic", variant: "success", desc: "Baseline traffic with healthy reserves. AI should report no anomalies." },
  { key: "stealth", label: "Stealth Drain", variant: "warning", desc: "Gradual incremental drain staying below detection threshold per-tx." },
  { key: "flash", label: "Flash Loan", variant: "danger", desc: "Single-block massive liquidity extraction via flash loan exploit." },
  { key: "governance", label: "Governance Hijack", variant: "accent", desc: "Unauthorized ownership change followed by parameter manipulation." },
  { key: "oracle", label: "Oracle Attack", variant: "info", desc: "Forged Merkle proof injection exploiting cross-chain message relay." },
  { key: "crisis", label: "Full Crisis", variant: "danger", desc: "Multi-phase escalation: normal → crisis → emergency pause." },
] as const;

type ScenarioKey = (typeof SCENARIOS)[number]["key"];

const VARIANT_STYLES: Record<string, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/50",
  danger: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400/50",
  accent: "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400/50",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400/50",
};

function getRecommendationBadge(rec: string) {
  if (rec === "EMERGENCY_PAUSE") return "badge-danger";
  if (rec === "RATE_LIMIT") return "badge-warning";
  return "badge-success";
}

function getConfidenceColor(c: number) {
  if (c >= 80) return "from-emerald-500 to-cyan-500";
  if (c >= 50) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-orange-500";
}

export default function DemoController() {
  const [status, setStatus] = useState<Status>({
    nodeRunning: false,
    deployed: false,
    contractAddress: null,
    demoRunning: false,
  });

  const [demoOutputs, setDemoOutputs] = useState<Record<string, DemoOutput>>({
    crisis: { title: "Crisis", output: "", success: false, loading: false },
    stealth: { title: "Stealth Drain", output: "", success: false, loading: false },
    flash: { title: "Flash Loan", output: "", success: false, loading: false },
    governance: { title: "Governance Hijack", output: "", success: false, loading: false },
    oracle: { title: "Oracle Attack", output: "", success: false, loading: false },
    normal: { title: "Normal Traffic", output: "", success: false, loading: false },
    deploy: { title: "Deploy", output: "", success: false, loading: false },
  });

  const [logs, setLogs] = useState<string[]>(["System initialized. Awaiting commands..."]);
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiPolling, setAiPolling] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const aiLogRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [aiLogs, setAiLogs] = useState<{ timestamp: string; log: string }[]>([]);

  // Status polling
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.post("/api/demo/execute", { action: "check" });
        setStatus(response.data);
      } catch {
        // silent
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // AI polling — hits the correct endpoint
  useEffect(() => {
    if (!aiPolling || !status.deployed) return;

    const pollAI = async () => {
      try {
        const response = await axios.post("/api/demo/analyze", { action: "analyze" });
        const data = response.data;

        // API returns { state, ai } — extract both
        if (data.state) setBridgeState(data.state);
        const analysis: AIAnalysis = data.ai ?? data;
        setAiAnalysis(analysis);

        const ts = new Date().toLocaleTimeString();
        setAiLogs((prev) => [
          ...prev.slice(-29),
          { timestamp: ts, log: `${analysis.assessment} — confidence ${analysis.confidence}%` },
        ]);
      } catch (err) {
        const ts = new Date().toLocaleTimeString();
        const msg = axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Connection to AI service failed";
        setAiLogs((prev) => [
          ...prev.slice(-29),
          { timestamp: ts, log: msg },
        ]);
      }
    };

    pollAI();
    const interval = setInterval(pollAI, 4000);
    return () => clearInterval(interval);
  }, [aiPolling, status.deployed]);

  // Auto-scroll logs within their containers (not the page)
  useEffect(() => {
    const container = logEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [logs]);

  useEffect(() => {
    const container = aiLogRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [aiLogs]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startNode = async () => {
    addLog("Starting Hardhat node...");
    try {
      const response = await axios.post("/api/demo/execute", { action: "start-node" });
      if (response.data.success) {
        addLog("Hardhat node started on port 8545");
        setStatus((prev) => ({ ...prev, nodeRunning: true }));
      } else {
        addLog("Failed to start Hardhat node");
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const deployContract = async () => {
    if (!status.nodeRunning) {
      addLog("Node must be running first");
      return;
    }
    addLog("Deploying contract...");
    setDemoOutputs((prev) => ({
      ...prev,
      deploy: { ...prev.deploy, loading: true, output: "" },
    }));
    try {
      const response = await axios.post("/api/demo/execute", { action: "deploy" });
      setDemoOutputs((prev) => ({
        ...prev,
        deploy: { ...prev.deploy, loading: false, success: response.data.success, output: response.data.output },
      }));
      if (response.data.success) {
        addLog(`Contract deployed at ${response.data.contractAddress}`);
        setStatus((prev) => ({ ...prev, deployed: true, contractAddress: response.data.contractAddress }));
      } else {
        addLog(`Deployment failed: ${response.data.error}`);
      }
    } catch (error) {
      addLog(`Error: ${error}`);
      setDemoOutputs((prev) => ({ ...prev, deploy: { ...prev.deploy, loading: false } }));
    }
  };

  const runDemo = async (demoType: ScenarioKey) => {
    if (!status.deployed) {
      addLog("Contract must be deployed first");
      return;
    }
    setActiveScenario(demoType);
    setAiPolling(true);
    addLog(`Triggering ${demoType.toUpperCase()} scenario...`);
    setDemoOutputs((prev) => ({
      ...prev,
      [demoType]: { ...prev[demoType], loading: true, output: "" },
    }));
    try {
      const response = await axios.post("/api/demo/execute", { action: `demo-${demoType}` });
      setDemoOutputs((prev) => ({
        ...prev,
        [demoType]: { ...prev[demoType], loading: false, success: response.data.success, output: response.data.output },
      }));
      if (response.data.success) {
        addLog(`${demoType.toUpperCase()} completed — AI analysis active`);
      } else {
        addLog(`${demoType.toUpperCase()} failed`);
      }
    } catch (error) {
      addLog(`Error: ${error}`);
      setDemoOutputs((prev) => ({ ...prev, [demoType]: { ...prev[demoType], loading: false } }));
    }
  };

  const hasOutput = Object.values(demoOutputs).some((o) => o.output && o.output.length > 0);

  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (pageLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <Spinner size="lg" />
        <p className="font-mono text-[#00E5FF] tracking-widest text-sm animate-pulse">
          LOADING DEMO CONTROLLER...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Demo <span className="text-gradient">Controller</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Simulate attack scenarios and observe AI-powered threat detection in real-time
          </p>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 animate-fade-in-up delay-100">
          <StatusIndicator
            label="Hardhat Node"
            active={status.nodeRunning}
            activeText="Online"
            inactiveText="Offline"
          />
          <StatusIndicator
            label="Contract"
            active={status.deployed}
            activeText={status.contractAddress ? `${status.contractAddress.slice(0, 8)}...` : "Deployed"}
            inactiveText="Not Deployed"
          />
          <StatusIndicator
            label="AI Engine"
            active={aiPolling}
            activeText="Analyzing"
            inactiveText="Idle"
            pulse={aiPolling}
          />
          <StatusIndicator
            label="Risk Level"
            active={!!bridgeState}
            activeText={bridgeState ? `${bridgeState.riskRatio.toFixed(1)}%` : "—"}
            inactiveText="No Data"
            danger={bridgeState ? bridgeState.riskRatio > 75 : false}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Setup + Scenarios */}
          <div className="space-y-6 lg:col-span-3 animate-fade-in-up delay-200">
            {/* Setup */}
            <div className="card">
              <div className="card-header">
                <span className="card-title text-sm">Infrastructure</span>
              </div>
              <div className="space-y-3">
                <button
                  onClick={startNode}
                  disabled={status.nodeRunning}
                  className={`btn w-full text-sm ${status.nodeRunning ? "btn-secondary opacity-60 cursor-not-allowed" : "btn-primary"}`}
                >
                  {status.nodeRunning ? "Node Running" : "Start Node"}
                </button>
                <button
                  onClick={deployContract}
                  disabled={!status.nodeRunning || demoOutputs.deploy.loading}
                  className={`btn w-full text-sm ${status.deployed ? "btn-secondary opacity-60" : !status.nodeRunning ? "btn-secondary opacity-40 cursor-not-allowed" : "btn-primary"}`}
                >
                  {demoOutputs.deploy.loading ? (
                    <Spinner size="sm" />
                  ) : status.deployed ? "Contract Deployed" : "Deploy Contract"}
                </button>
              </div>
            </div>

            {/* Attack Scenarios */}
            <div className="card">
              <div className="card-header">
                <span className="card-title text-sm">Attack Scenarios</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => runDemo(s.key)}
                    disabled={!status.deployed || demoOutputs[s.key]?.loading}
                    title={s.desc}
                    className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all ${
                      !status.deployed
                        ? "cursor-not-allowed border-slate-700/50 bg-slate-800/30 text-slate-600"
                        : activeScenario === s.key
                          ? VARIANT_STYLES[s.variant] + " ring-1 ring-white/10"
                          : VARIANT_STYLES[s.variant]
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold">{s.label}</span>
                      {demoOutputs[s.key]?.loading && <Spinner size="sm" />}
                    </div>
                    <span className="mt-1 text-[10px] leading-tight opacity-60">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: AI Analysis */}
          <div className="lg:col-span-5 animate-fade-in-up delay-300">
            <div className="card glow-card h-full" style={{ borderColor: "rgba(139, 92, 246, 0.2)" }}>
              <div className="card-header">
                <span className="card-title text-sm text-purple-300">AI Threat Intelligence</span>
                {aiPolling && (
                  <span className="badge badge-info text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                    Live
                  </span>
                )}
              </div>

              {aiAnalysis ? (
                <div className="space-y-5">
                  {/* Assessment */}
                  <div>
                    <div className="stat-label text-xs mb-1">Assessment</div>
                    <div className="stat-value text-2xl">{aiAnalysis.assessment}</div>
                  </div>

                  {/* Confidence Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="stat-label text-xs">Confidence</span>
                      <span className="text-sm font-semibold text-white">{aiAnalysis.confidence}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getConfidenceColor(aiAnalysis.confidence)} transition-all duration-700`}
                        style={{ width: `${aiAnalysis.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <div className="stat-label text-xs mb-2">Analysis Details</div>
                    <p className="text-sm text-slate-300 leading-relaxed rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
                      {aiAnalysis.details}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <div className="stat-label text-xs mb-2">Recommendation</div>
                    <span className={`badge ${getRecommendationBadge(aiAnalysis.recommendation)}`}>
                      {aiAnalysis.recommendation}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <div className="mb-3 h-10 w-10 rounded-full border border-slate-700 flex items-center justify-center">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <p className="text-sm">Run a scenario to activate</p>
                  <p className="text-xs text-slate-600 mt-1">AI analysis will appear here</p>
                </div>
              )}

              {/* Analysis Stream */}
              <div className="mt-6 border-t border-slate-700/50 pt-4">
                <div className="stat-label text-xs mb-2">Analysis Stream</div>
                <div className="rounded-lg bg-black/40 p-3 max-h-36 overflow-y-auto font-mono text-xs space-y-1 border border-slate-800">
                  {aiLogs.length > 0 ? (
                    aiLogs.map((item, i) => (
                      <div key={i} className="text-slate-400">
                        <span className="text-slate-600">[{item.timestamp}]</span>{" "}
                        <span className="text-slate-300">{item.log}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-700">Awaiting analysis data...</div>
                  )}
                  <div ref={aiLogRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Telemetry + Output + Logs */}
          <div className="space-y-6 lg:col-span-4 animate-fade-in-up delay-400">
            {/* Telemetry */}
            <div className="card">
              <div className="card-header">
                <span className="card-title text-sm">Bridge Telemetry</span>
                {bridgeState && (
                  <span className={`badge ${bridgeState.isPaused ? "badge-danger" : "badge-success"}`}>
                    {bridgeState.isPaused ? "Paused" : "Active"}
                  </span>
                )}
              </div>
              {bridgeState ? (
                <div className="space-y-3">
                  <TelemetryRow label="Risk Ratio" value={`${bridgeState.riskRatio.toFixed(2)}%`} danger={bridgeState.riskRatio > 75} />
                  <TelemetryRow label="Source Reserve" value={`${bridgeState.sourceReserve} ETH`} />
                  <TelemetryRow label="Dest Reserve" value={`${bridgeState.destReserve} ETH`} />
                  <TelemetryRow label="Locked Amount" value={`${bridgeState.lockedAmount} ETH`} />

                  {/* Attack Flags */}
                  {(bridgeState.governanceCompromised !== undefined || bridgeState.failedProof !== undefined) && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Security Flags</div>
                      {bridgeState.governanceCompromised !== undefined && (
                        <TelemetryRow
                          label="Governance"
                          value={bridgeState.governanceCompromised ? "COMPROMISED" : "Secure"}
                          danger={bridgeState.governanceCompromised}
                        />
                      )}
                      {bridgeState.failedProof !== undefined && (
                        <TelemetryRow
                          label="Proof Integrity"
                          value={bridgeState.failedProof ? "FORGED" : "Valid"}
                          danger={bridgeState.failedProof}
                        />
                      )}
                    </div>
                  )}

                  {/* Risk bar */}
                  <div className="mt-2">
                    <div className="progress-bar">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          bridgeState.riskRatio > 75 ? "progress-fill-danger" : bridgeState.riskRatio > 50 ? "progress-fill-warning" : "progress-fill"
                        }`}
                        style={{ width: `${Math.min(bridgeState.riskRatio, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                      <span>0%</span>
                      <span>Safe &lt; 50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Active scenario indicator */}
                  {activeScenario && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Active Scenario</span>
                        <span className="text-xs font-semibold text-cyan-400 capitalize">{activeScenario}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-6">Deploy contract to view telemetry</p>
              )}
            </div>

            {/* Output Console */}
            <div className="card">
              <div className="card-header">
                <span className="card-title text-sm">Execution Output</span>
              </div>
              <div className="rounded-lg bg-black/40 p-3 font-mono text-xs overflow-y-auto max-h-52 border border-slate-800">
                {hasOutput ? (
                  Object.entries(demoOutputs).map(([key, output]) =>
                    output.output ? (
                      <div key={key} className="mb-3 last:mb-0">
                        <div className={`font-semibold mb-1 ${output.success ? "text-emerald-400" : "text-red-400"}`}>
                          {output.title}
                        </div>
                        <pre className="text-slate-400 whitespace-pre-wrap break-all">{output.output}</pre>
                      </div>
                    ) : null
                  )
                ) : (
                  <div className="text-slate-700 text-center py-4">No output yet</div>
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="card">
              <div className="card-header">
                <span className="card-title text-sm">Activity Log</span>
                <span className="text-xs text-slate-500">{logs.length} entries</span>
              </div>
              <div className="rounded-lg bg-black/40 p-3 font-mono text-xs overflow-y-auto max-h-40 border border-slate-800 space-y-0.5">
                {logs.map((log, i) => (
                  <div key={i} className="text-slate-400">{log}</div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 card animate-fade-in-up delay-500">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">1. Setup</h4>
              <p className="text-xs text-slate-400">Start the Hardhat node and deploy the SourceBridge contract to initialize the local simulation environment.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">2. Simulate</h4>
              <p className="text-xs text-slate-400">Select an attack scenario. Each simulates different liquidity drain patterns against the bridge protocol.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">3. Observe</h4>
              <p className="text-xs text-slate-400">Watch Groq AI analyze the threat in real-time. The circuit breaker auto-pauses when risk exceeds threshold.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────── Sub-components ────── */

function StatusIndicator({
  label,
  active,
  activeText,
  inactiveText,
  pulse,
  danger,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
  pulse?: boolean;
  danger?: boolean;
}) {
  const dotColor = danger
    ? "bg-red-500"
    : active
      ? "bg-emerald-500"
      : "bg-slate-600";

  return (
    <div className="card flex items-center gap-3 py-3 px-4">
      <span className="relative flex h-2.5 w-2.5">
        {(pulse || (active && !danger)) && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`text-sm font-semibold truncate ${danger ? "text-red-400" : active ? "text-white" : "text-slate-500"}`}>
          {active ? activeText : inactiveText}
        </div>
      </div>
    </div>
  );
}

function TelemetryRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{value}</span>
    </div>
  );
}
