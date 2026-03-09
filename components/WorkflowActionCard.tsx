"use client";

import { RiskAction } from "@/src/workflows/sentinel-bridge/risk-engine";

interface WorkflowActionCardProps {
  action: string | undefined;
  isPaused: boolean;
  className?: string;
}

export function WorkflowActionCard({
  action,
  isPaused,
  className = "",
}: WorkflowActionCardProps) {
  const getActionDetails = () => {
    if (isPaused) {
      return {
        label: "CIRCUIT BREAKER: PAUSED",
        description: "Emergency shutdown executed. All bridge transfers halted.",
        status: "danger",
        icon: "🚨",
      };
    }

    switch (action) {
      case "EMERGENCY_PAUSE":
        return {
          label: "ACTION: ESCALATING TO PAUSE",
          description: "Critical risk detected. Circuit breaker triggering...",
          status: "danger",
          icon: "🔒",
        };
      case "RATE_LIMIT":
        return {
          label: "ACTION: RATE LIMITING",
          description: "Suspicious velocity detected. Restricting withdrawal volume.",
          status: "warning",
          icon: "⏳",
        };
      case "MONITOR":
      case "NORMAL":
        return {
          label: "ACTION: MONITORING",
          description: "System healthy. Behavioral engines active.",
          status: "success",
          icon: "🛡️",
        };
      default:
        return {
          label: "AWAITING TELEMETRY",
          description: "Initializing CRE watchdog link...",
          status: "info",
          icon: "📡",
        };
    }
  };

  const details = getActionDetails();
  
  const statusStyles = {
    success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    danger: "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
    info: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-500 ${statusStyles[details.status as keyof typeof statusStyles]} ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{details.icon}</span>
        <h3 className="text-xs font-black uppercase tracking-widest">{details.label}</h3>
      </div>
      <p className="text-[11px] font-medium opacity-80 leading-relaxed font-mono">
        {details.description}
      </p>
    </div>
  );
}
