"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";

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
}

export default function DemoController() {
  const [status, setStatus] = useState<Status>({
    nodeRunning: false,
    deployed: false,
    contractAddress: null,
    demoRunning: false,
  });

  const [demoOutputs, setDemoOutputs] = useState<Record<string, DemoOutput>>({
    crisis: { title: "CRISIS_DEMO", output: "AWAITING_EXECUTION", success: false, loading: false },
    stealth: { title: "STEALTH_DRAIN_DEMO", output: "AWAITING_EXECUTION", success: false, loading: false },
    flash: { title: "FLASH_LOAN_ATTACK", output: "AWAITING_EXECUTION", success: false, loading: false },
    governance: { title: "GOVERNANCE_HIJACK", output: "AWAITING_EXECUTION", success: false, loading: false },
    oracle: { title: "ORACLE_LAG_PROOFS", output: "AWAITING_EXECUTION", success: false, loading: false },
    normal: { title: "NORMAL_OP_DEMO", output: "AWAITING_EXECUTION", success: false, loading: false },
    deploy: { title: "CONTRACT_DEPLOY", output: "AWAITING_EXECUTION", success: false, loading: false },
  });

  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Terminal initialized. Awaiting commands..."]);
  
  // New States for AI Integration
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiPolling, setAiPolling] = useState(false);
  const aiLogRef = useRef<HTMLDivElement>(null);
  const [aiLogs, setAiLogs] = useState<{timestamp: string, log: string}[]>([]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.post("/api/demo/execute", {
          action: "check",
        });
        setStatus(response.data);
      } catch (error) {
        console.error("Status check failed:", error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll AI Analytics when a demo is running or explicitly enabled
  useEffect(() => {
    if (!aiPolling || !status.deployed) return;

    const pollAI = async () => {
      try {
        const res = await axios.post("/api/demo/analyze", { action: "analyze" });
        if (res.data.state) {
          setBridgeState(res.data.state);
        }
        if (res.data.ai) {
          setAiAnalysis(res.data.ai);
          setAiLogs(prev => [...prev.slice(-20), {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            log: `[${res.data.ai.assessment}] Conf: ${res.data.ai.confidence}%. Action: ${res.data.ai.recommendation}`
          }]);
        }
      } catch (e) {
        console.error("AI polling failed", e);
      }
    };

    pollAI();
    const interval = setInterval(pollAI, 3000); // Poll every 3 seconds for dynamic effect
    return () => clearInterval(interval);
  }, [aiPolling, status.deployed]);

  // Auto-scroll AI logs
  useEffect(() => {
    if (aiLogRef.current) {
      aiLogRef.current.scrollTop = aiLogRef.current.scrollHeight;
    }
  }, [aiLogs]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev.slice(-99),
      `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${message}`,
    ]);
  };

  const startNode = async () => {
    addLog("[EXEC] Initializing Hardhat local node...");
    try {
      const response = await axios.post("/api/demo/execute", {
        action: "start-node",
      });
      addLog(response.data.success ? "[OK] Local node running" : `[FAIL] ${response.data.error}`);
    } catch (err: any) {
      addLog(`[ERROR] Failed to start node: ${err.message}`);
    }
  };

  const deployContracts = async () => {
    addLog("[EXEC] Deploying SentinelBridge contracts...");
    setDemoOutputs((prev) => ({
      ...prev,
      deploy: { ...prev.deploy, loading: true, output: "Deploying payload..." },
    }));

    try {
      const response = await axios.post("/api/demo/execute", {
        action: "deploy-bridge",
      });

      setDemoOutputs((prev) => ({
        ...prev,
        deploy: {
          ...prev.deploy,
          loading: false,
          success: response.data.success,
          output: response.data.output,
        },
      }));

      addLog(response.data.success ? "[OK] Contracts deployed successfully" : `[FAIL] Deployment error`);
    } catch (err: any) {
      addLog(`[ERROR] Deployment failed: ${err.message}`);
      setDemoOutputs((prev) => ({
        ...prev,
        deploy: { ...prev.deploy, loading: false, success: false, output: err.message },
      }));
    }
  };

  const executeDemo = async (type: "normal" | "crisis" | "stealth" | "flash" | "governance" | "oracle") => {
    addLog(`[EXEC] Running simulation vector: ${type.toUpperCase()}`);
    setAiPolling(true); // Start AI analysis when demo starts
    
    setDemoOutputs((prev) => ({
      ...prev,
      [type]: { ...prev[type], loading: true, output: "Executing script vector..." },
    }));

    try {
      const response = await axios.post("/api/demo/execute", {
        action: `demo-${type}`,
      });

      setDemoOutputs((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loading: false,
          success: response.data.success,
          output: response.data.output,
        },
      }));
      
      addLog(response.data.success ? `[OK] Vector ${type.toUpperCase()} completed` : `[FAIL] Vector ${type.toUpperCase()} failed`);
    } catch (err: any) {
      addLog(`[ERROR] Execution failed: ${err.message}`);
      setDemoOutputs((prev) => ({
        ...prev,
        [type]: { ...prev[type], loading: false, success: false, output: err.message },
      }));
    } finally {
      // Keep polling active for 5 seconds after demo ends to see final state
      setTimeout(() => setAiPolling(false), 5000);
    }
  };

  return (
    <>
      <BackgroundCanvas />
      <div className="relative z-10 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-[#00E5FF]/20 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#00E5FF] tracking-widest uppercase">
              // Sentinel Command Interface
            </h1>
            <p className="text-sm text-slate-500 mt-2 tracking-widest uppercase">
              Simulation Control Node &gt;_
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3 bg-black/40 border border-[#00E5FF]/20 px-4 py-2 rounded">
              <div className={`w-2 h-2 rounded-sm ${status.nodeRunning ? "bg-emerald-500" : "bg-red-500"}`}></div>
              <span className="text-xs text-slate-300">NETWORK: {status.nodeRunning ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <div className="flex items-center gap-3 bg-black/40 border border-[#00E5FF]/20 px-4 py-2 rounded mt-2">
              <div className={`w-2 h-2 rounded-sm ${aiPolling ? "bg-purple-500 animate-pulse" : "bg-slate-600"}`}></div>
              <span className="text-xs text-slate-300">AI_STREAM: {aiPolling ? "ACTIVE" : "STANDBY"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Controls (Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Status Panel */}
            <div className="bg-black/80 border border-[#00E5FF]/10 p-5 rounded">
              <h2 className="text-[#00E5FF] text-sm tracking-widest font-bold mb-4 border-b border-[#00E5FF]/10 pb-2">
                SYSTEM_STATE
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Network Connection:</span>
                  <span className={status.nodeRunning ? "text-emerald-400" : "text-red-400"}>
                    {status.nodeRunning ? "CONNECTED" : "DISCONNECTED"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Contract State:</span>
                  <span className={status.deployed ? "text-emerald-400" : "text-amber-400"}>
                    {status.deployed ? "DEPLOYED" : "AWAITING..."}
                  </span>
                </div>
                {status.deployed && status.contractAddress && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#00E5FF]/10">
                    <span className="text-slate-500">Target Address:</span>
                    <span className="text-[#00E5FF] font-mono select-all">
                      {status.contractAddress.substring(0, 6)}...{status.contractAddress.substring(38)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Core Actions */}
            <div className="bg-black/80 border border-[#00E5FF]/10 p-5 rounded">
              <h2 className="text-[#00E5FF] text-sm tracking-widest font-bold mb-4 border-b border-[#00E5FF]/10 pb-2">
                INITIALIZATION_VECTORS
              </h2>
              <div className="space-y-3">
                <button
                  onClick={startNode}
                  disabled={status.nodeRunning}
                  className="w-full text-left px-3 py-2 bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; connect_network</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>
                </button>
                <button
                  onClick={deployContracts}
                  disabled={!status.nodeRunning || demoOutputs.deploy.loading}
                  className="w-full text-left px-3 py-2 bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; deploy_bridge</span>
                  {demoOutputs.deploy.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
              </div>
            </div>

            {/* Attack Vectors */}
            <div className="bg-black/80 border border-[#ef4444]/20 p-5 rounded relative overflow-hidden">
               <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent to-red-500/50"></div>
              <h2 className="text-[#ef4444] text-sm tracking-widest font-bold mb-4 border-b border-[#ef4444]/20 pb-2">
                ATTACK_SIMULATIONS
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => executeDemo("normal")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#10b981]/5 hover:bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_normal_traffic</span>
                  {demoOutputs.normal.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
                <button
                  onClick={() => executeDemo("stealth")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_stealth_drain</span>
                  {demoOutputs.stealth.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
                <button
                  onClick={() => executeDemo("flash")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#8b5cf6]/5 hover:bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_flash_loan</span>
                  {demoOutputs.flash?.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
                <button
                  onClick={() => executeDemo("governance")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#f43f5e]/5 hover:bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_gov_hijack</span>
                  {demoOutputs.governance?.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
                <button
                  onClick={() => executeDemo("oracle")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#0ea5e9]/5 hover:bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 text-[#0ea5e9] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_oracle_lag</span>
                  {demoOutputs.oracle?.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
                <button
                  onClick={() => executeDemo("crisis")}
                  disabled={!status.deployed || status.demoRunning}
                  className="w-full text-left px-3 py-2 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex justify-between items-center"
                >
                  <span>&gt; exec_massive_exploit</span>
                  {demoOutputs.crisis.loading ? <span className="animate-spin opacity-50">/</span> : <span className="opacity-0 group-hover:opacity-100 transition-opacity">↵</span>}
                </button>
              </div>
            </div>
            
          </div>

          {/* Middle Column - Terminals (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Command Log */}
            <div className="bg-black/80 border border-[#00E5FF]/20 rounded flex flex-col h-[280px]">
              <div className="bg-[#00E5FF]/5 border-b border-[#00E5FF]/20 px-4 py-2 flex items-center gap-4 text-xs text-[#00E5FF]">
                <span>~/sentinel/system_logs.sh</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-1 text-xs text-slate-300">
                {logs.map((log, i) => (
                  <div key={i} className={`${log.includes('[ERROR]') || log.includes('[FAIL]') ? 'text-red-400' : log.includes('EXEC') ? 'text-cyan-400' : ''}`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Output Display */}
            <div className="bg-black/80 border border-[#00E5FF]/20 rounded flex flex-col h-auto min-h-[350px]">
              <div className="bg-[#00E5FF]/5 border-b border-[#00E5FF]/20 px-4 py-2 flex justify-between items-center text-xs text-[#00E5FF]">
                <span>~/sentinel/execution_stdout.txt</span>
                {status.demoRunning && <span className="animate-pulse">_</span>}
              </div>
              <div className="p-4 flex-1 overflow-y-auto text-xs whitespace-pre-wrap text-slate-300 leading-relaxed custom-scrollbar">
                {(() => {
                  const active = Object.values(demoOutputs).find(d => d.loading) || 
                                Object.values(demoOutputs).filter(d => d.output !== "AWAITING_EXECUTION").pop() ||
                                demoOutputs.normal;
                  
                  return (
                    <div className="space-y-4">
                      <div className="text-[#00E5FF] opacity-50 border-b border-white/5 pb-2">
                        &gt; cat {active.title.toLowerCase()}.log
                      </div>
                      <div className={`${active.success ? 'text-emerald-400' : active.output.includes('Error') ? 'text-red-400' : 'text-slate-300'}`}>
                        {active.output}
                      </div>
                      {active.loading && <div className="text-cyan-400 animate-pulse mt-4">Executing block sequence...</div>}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* Right Column - LIVE AI INTELLIGENCE (Span 4) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col">
            
            {/* AI Assessment Panel */}
             <div className="bg-[#0f0a20]/90 border border-[#a855f7]/30 rounded flex flex-col flex-1 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#a855f7]/10 blur-3xl rounded-full"></div>
              <div className="bg-[#a855f7]/10 border-b border-[#a855f7]/30 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-widest text-[#d8b4fe] uppercase text-shadow-sm shadow-[#a855f7]">LIVE THREAT INTELLIGENCE (LLM)</span>
                </div>
                {aiPolling && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                
                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-black/50 border border-purple-500/20 rounded p-3 text-center">
                    <div className="text-[10px] text-purple-300/60 uppercase tracking-widest mb-1">Intent Assessment</div>
                    <div className={`text-sm font-bold ${!aiAnalysis ? 'text-slate-500' : aiAnalysis.assessment.includes('NORMAL') ? 'text-emerald-400' : aiAnalysis.assessment.includes('STEALTH') ? 'text-amber-400' : 'text-red-400'}`}>
                       {aiAnalysis?.assessment || "AWAITING DATA"}
                    </div>
                  </div>
                  <div className="bg-black/50 border border-purple-500/20 rounded p-3 text-center">
                    <div className="text-[10px] text-purple-300/60 uppercase tracking-widest mb-1">AI Confidence</div>
                    <div className="text-sm font-bold text-purple-300">
                      {aiAnalysis ? `${aiAnalysis.confidence}%` : "--"}
                    </div>
                  </div>
                </div>

                {/* AI Detail Box */}
                <div className="bg-black/50 border border-purple-500/20 rounded p-4 mb-6 flex-1">
                   <div className="text-[10px] text-purple-300/60 uppercase tracking-widest mb-2">Cognitive Evaluation</div>
                   <p className="text-xs text-purple-100 leading-relaxed font-sans">
                     {aiAnalysis?.details || "The AI Thread Analyzer is currently standing by. Initialize a simulation vector to begin real-time heuristic polling and intent translation."}
                   </p>
                </div>
                
                 {/* AI Terminal Log output */}
                 <div className="bg-black/80 border border-purple-500/30 rounded h-32 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 block"></div>
                    <div ref={aiLogRef} className="p-3 flex-1 overflow-y-auto space-y-1 text-[10px] text-purple-300/70 custom-scrollbar">
                      {aiLogs.length === 0 ? (
                        <div className="opacity-50">[AWAITING AI STREAM...]</div>
                      ) : (
                        aiLogs.map((item, idx) => (
                           <div key={idx} className="flex gap-2 font-mono">
                             <span className="opacity-50 shrink-0">[{item.timestamp}]</span>
                             <span className={item.log.includes('NORMAL') ? 'text-emerald-400/80' : item.log.includes('PAUSE') ? 'text-red-400/80' : 'text-amber-400/80'}>
                               {item.log}
                             </span>
                           </div>
                        ))
                      )}
                    </div>
                 </div>

              </div>
            </div>

            {/* Live Telemetry Panel */}
            <div className="bg-black/80 border border-[#00E5FF]/20 rounded p-5 h-48">
              <h2 className="text-[#00E5FF] text-[10px] tracking-widest font-bold mb-3 border-b border-[#00E5FF]/10 pb-2">
                ACTIVE_BRIDGE_TELEMETRY
              </h2>
              {bridgeState ? (
                <div className="space-y-3 font-mono text-xs">
                   <div className="flex justify-between items-center bg-[#00E5FF]/5 px-2 py-1.5 rounded">
                    <span className="text-slate-400">Risk Ratio:</span>
                    <span className={`font-bold ${bridgeState.riskRatio > 70 ? 'text-red-400' : 'text-emerald-400'}`}>{bridgeState.riskRatio}%</span>
                  </div>
                   <div className="flex justify-between items-center bg-[#00E5FF]/5 px-2 py-1.5 rounded">
                    <span className="text-slate-400">Locked Amount:</span>
                    <span className="text-[#00E5FF]">{Number(bridgeState.lockedAmount).toFixed(2)} ETH</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00E5FF]/5 px-2 py-1.5 rounded">
                    <span className="text-slate-400">Circuit Breaker:</span>
                    <span className={bridgeState.isPaused ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{bridgeState.isPaused ? "ACTIVATED" : "INACTIVE"}</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-600">
                  [TELEMETRY_STANDBY]
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
      </div>
    </>
  );
}
