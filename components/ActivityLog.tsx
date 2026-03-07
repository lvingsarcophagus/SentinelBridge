"use client";

import { useEffect, useState, useRef } from "react";
import { getWorkflowLogs } from "@/lib/api";

interface LogEntry {
  message: string;
  type: "info" | "warn" | "error" | "success";
  timestamp: string;
}

function classifyLog(msg: string): LogEntry["type"] {
  const upperMsg = msg.toUpperCase();
  if (upperMsg.includes("[CRITICAL]") || upperMsg.includes("[ERROR]") || upperMsg.includes("[EMERGENCY]")) return "error";
  if (upperMsg.includes("[WARN]") || upperMsg.includes("[WARNING]")) return "warn";
  if (upperMsg.includes("[OK]") || upperMsg.includes("[SUCCESS]") || upperMsg.includes("HEALTHY")) return "success";
  return "info";
}

const typeStyles = {
  info: { dot: "bg-cyan-400", text: "text-slate-300", border: "border-cyan-500/20" },
  warn: { dot: "bg-amber-400", text: "text-amber-300", border: "border-amber-500/20" },
  error: { dot: "bg-red-400", text: "text-red-300", border: "border-red-500/20" },
  success: { dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-500/20" },
};

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getWorkflowLogs();
        const entries: LogEntry[] = data.logs.map((msg) => ({
          message: msg,
          type: classifyLog(msg),
          timestamp: data.timestamp,
        }));
        setLogs(entries);
      } catch {
        setLogs([
          {
            message: "[WARN] Unable to fetch logs — API may be offline",
            type: "warn",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header pb-4 border-b border-white/5 mb-4">
        <div>
          <h3 className="card-title text-sm tracking-widest text-[#00E5FF] font-semibold">ACTIVITY LOG</h3>
          <p className="card-subtitle text-xs text-slate-400 mt-1">Real-time workflow execution trace</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="text-xs tracking-wider text-slate-500 uppercase font-semibold">Live Trace</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar"
        style={{ minHeight: '300px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 h-full">
            <div className="text-sm font-mono text-slate-500 tracking-wider animate-pulse">[LOADING DATA STREAM...]</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 h-full">
            <div className="text-sm border border-dashed border-white/10 px-4 py-2 rounded text-slate-500 font-mono tracking-wider">[NO TRACE DATA]</div>
          </div>
        ) : (
          logs.map((log, i) => {
            const style = typeStyles[log.type];
            return (
              <div
                key={i}
                className="animate-slide-in-left flex items-start gap-3 py-2 px-3 rounded bg-white/[0.02] border border-transparent hover:border-white/5 transition-colors"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className={`mt-[6px] w-[5px] h-[5px] rounded-sm ${style.dot} flex-shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.4)]`} />
                <p className={`text-xs font-mono tracking-tight ${style.text} leading-relaxed break-all`}>
                  {log.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
