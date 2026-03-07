"use client";

import { useEffect, useState, useRef } from "react";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import { DashboardCard } from "@/components/DashboardCard";
import { RiskGauge } from "@/components/RiskGauge";
import { ActivityLog } from "@/components/ActivityLog";
import { getWorkflowStatus, pauseBridge } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from "recharts";

interface WorkflowStatus {
  ok: boolean;
  isPaused: boolean;
  riskRatio: number;
  sourceReserve: string;
  destReserve: string;
  targetLocked: string;
  lastCheck: string;
  lastTransactionHash: string | null;
  ai?: {
    assessment: string;
    confidence: number;
    details: string;
    recommendation: string;
  };
}

// Generate some history data for the chart
const generateHistoryData = (currentRisk: number) => {
  const data = [];
  let risk = Math.max(15, currentRisk - 30);
  for (let i = 20; i >= 0; i--) {
    if (i === 0) {
      data.push({ 
        time: "Now", 
        riskRatio: currentRisk,
        anomaly: currentRisk > 60 ? currentRisk : null 
      });
    } else {
      risk = Math.max(10, Math.min(100, risk + (Math.random() * 10 - 4)));
      // Randomly inject some "anomalies" for the heatmap visualization
      const isAnomaly = Math.random() > 0.8 && risk > 40;
      data.push({ 
        time: `-${i}m`, 
        riskRatio: Math.round(risk),
        anomaly: isAnomaly ? Math.round(risk + 5) : null
      });
    }
  }
  return data;
};

export default function Dashboard() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getWorkflowStatus();
        setStatus(data);
        setError(null);
        
        // Update history data
        setHistoryData(generateHistoryData(data.riskRatio));

        // Update AI reasoning items
        if (data.ai) {
          setAiLogs(prev => {
            const entry = `[${new Date().toLocaleTimeString()}] [AI_SENTINEL]: ${data.ai!.assessment} - ${data.ai!.details}`;
            if (prev[0] === entry) return prev;
            return [entry, ...prev].slice(0, 50);
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualPause = async () => {
    if (confirm("Are you sure you want to trigger a MANUAL EMERGENCY PAUSE? This will halt all bridge operations.")) {
      try {
        await pauseBridge();
        alert("Emergency manual pause triggered successfully.");
      } catch (err) {
        alert("Failed to trigger manual pause.");
      }
    }
  };

  const getHealthStatus = () => {
    if (!status) return { label: "CONNECTING", color: "info" as const };
    if (status.isPaused) return { label: "TRIGGERED [HALTED]", color: "danger" as const };
    if (status.riskRatio > 80) return { label: "CRITICAL RISK", color: "warning" as const };
    return { label: "ARMED & PROTECTED", color: "success" as const };
  };

  const health = getHealthStatus();

  return (
    <>
      <BackgroundCanvas />

      <div className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header & Kill Switch Area */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            <div className="flex-1 bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-3 w-3 rounded-full animate-pulse ${status?.isPaused ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                  <h1 className="text-2xl font-black text-white tracking-tight">SentinelBridge Command Center</h1>
                </div>
                <p className="text-slate-400 text-sm font-light">Institutional node: <span className="text-cyan-400 font-mono">wf_sb_live_0x9a8b</span></p>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-black/40 border border-slate-800/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-sm font-bold ${health.color === 'success' ? 'text-emerald-400' : health.color === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                    {health.label}
                  </p>
                </div>
                <div className="bg-black/40 border border-slate-800/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Sync Latency</p>
                  <p className="text-sm font-bold text-cyan-400 font-mono">1.2ms</p>
                </div>
                <div className="bg-black/40 border border-slate-800/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">CRE Polling</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
                    <p className="text-sm font-bold text-white uppercase">Active</p>
                  </div>
                </div>
                <div className="bg-black/40 border border-slate-800/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Secrets Mgr</p>
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    ENCRYPTED
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleManualPause}
              disabled={status?.isPaused}
              className={`group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-500 border-2 ${status?.isPaused ? 'bg-slate-900 border-slate-800 cursor-not-allowed' : 'bg-red-600/10 border-red-500/50 hover:bg-red-600/20 active:scale-95'}`}
            >
              <div className={`p-4 rounded-full mb-3 transition-colors ${status?.isPaused ? 'bg-slate-800 text-slate-600' : 'bg-red-500 text-white shadow-[0_0_20px_#ef444466] group-hover:scale-110'}`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className={`font-black text-lg tracking-tighter uppercase ${status?.isPaused ? 'text-slate-600' : 'text-white'}`}>Manual Override</span>
              <span className="text-[10px] text-red-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest mt-1">Kill Switch</span>
              {!status?.isPaused && <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent pointer-events-none" />}
            </button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Metrics & AI */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <DashboardCard title="Source Reserve" value={`${status?.sourceReserve || "0"} ETH`} subtitle="Vault liquidity" status="info" />
                <DashboardCard title="Dest. Reserve" value={`${status?.destReserve || "0"} ETH`} subtitle="Remote liquidity" status="info" />
                <DashboardCard title="Bridge Risk" value={`${status?.riskRatio?.toFixed(1) || "0"}%`} subtitle="Real-time exposure" status={status?.riskRatio && status.riskRatio > 80 ? "danger" : status?.riskRatio && status.riskRatio > 60 ? "warning" : "success"} />
              </div>

              {/* Volume & Anomaly Heatmap */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="text-cyan-400">📈</span> Volume & Anomaly Heatmap
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-cyan-500" />
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Volume</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" />
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Anomaly Detected</span>
                    </div>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={historyData}>
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#00E5FF', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="riskRatio" stroke="#00E5FF" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
                      <Scatter dataKey="anomaly" fill="#ef4444" shape="circle" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Column: AI Intel Feed & Gauge */}
            <div className="space-y-6">
              
              {/* Risk Gauge Panel */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-white font-bold mb-4 w-full">Current Risk Index</h3>
                <RiskGauge riskRatio={status?.riskRatio || 0} maxThreshold={80} />
                <div className="mt-4 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Threat Level</p>
                  <p className={`text-xl font-black ${health.color === 'success' ? 'text-emerald-400' : health.color === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                    {health.label.split(' ')[0]}
                  </p>
                </div>
              </div>

              {/* AI Threat Intel Feed */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-[468px]">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <h3 className="text-white text-sm font-bold flex items-center gap-2">
                    <span className="text-purple-400">🧠</span> AI Threat Intelligence
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">CONF: {status?.ai?.confidence || 0}%</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                <div className="p-4 bg-black/40 border-b border-white/5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['VELOCITY', 'ORACLE_LAG', 'ADMIN_HIJACK', 'STATE_SPOOF'].map(tag => {
                      const isActive = status?.ai?.assessment.includes(tag.replace('_', ' ')) || status?.ai?.details.includes(tag.replace('_', ' '));
                      return (
                        <span key={tag} className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${isActive ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_8px_#ef444433]' : 'bg-slate-800/20 border-slate-800 text-slate-600'}`}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                  <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">Active Deduction:</p>
                    <p className="text-xs text-white leading-relaxed">{status?.ai?.details || "Waiting for next block analysis..."}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 custom-scrollbar bg-black/20">
                  {aiLogs.length > 0 ? (
                    aiLogs.map((log, i) => (
                      <div key={i} className={`pb-2 border-b border-white/5 last:border-0 ${i === 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 animate-pulse">Initializing reasoning console...</div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>

          </div>

          <ActivityLog />
        </div>
      </div>
    </>
  );
}
