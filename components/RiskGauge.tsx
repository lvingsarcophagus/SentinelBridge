"use client";

import { useEffect, useRef, useState } from "react";

interface RiskGaugeProps {
  riskRatio: number;
  maxThreshold: number;
}

export function RiskGauge({ riskRatio = 0, maxThreshold = 80 }: RiskGaugeProps) {
  const [animatedRatio, setAnimatedRatio] = useState(0);
  const prevRatio = useRef(0);

  // Animate value on change
  useEffect(() => {
    const start = prevRatio.current;
    const end = riskRatio;
    const duration = 800;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedRatio(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    prevRatio.current = end;
  }, [riskRatio]);

  const percentage = Math.min((animatedRatio / 100) * 100, 100);
  const isWarning = animatedRatio > maxThreshold * 0.7;
  const isDanger = animatedRatio > maxThreshold;

  // SVG semi-circle gauge
  const size = 240;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (percentage / 100) * circumference;

  // Threshold marker position
  const thresholdAngle = (maxThreshold / 100) * 180;
  const thresholdRad = (thresholdAngle * Math.PI) / 180;
  const markerX = size / 2 - radius * Math.cos(thresholdRad);
  const markerY = size / 2 + 8 - radius * Math.sin(thresholdRad);

  const getColor = () => {
    if (isDanger) return { stroke: "#ef4444", glow: "rgba(239,68,68,0.3)", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (isWarning) return { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    return { stroke: "#10b981", glow: "rgba(16,185,129,0.3)", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  };

  const getStatus = () => {
    if (isDanger) return { label: "CRITICAL", icon: "🔴" };
    if (isWarning) return { label: "WARNING", icon: "🟡" };
    return { label: "SAFE", icon: "🟢" };
  };

  const color = getColor();
  const status = getStatus();

  return (
    <div className="space-y-5">
      {/* Gauge */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
          <svg
            width={size}
            height={size / 2 + 20}
            viewBox={`0 0 ${size} ${size / 2 + 20}`}
            className="overflow-visible"
          >
            {/* Background arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + 8}`}
              fill="none"
              stroke="rgba(30, 41, 59, 0.8)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Filled arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2 + 8} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + 8}`}
              fill="none"
              stroke={color.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease",
                filter: `drop-shadow(0 0 6px ${color.glow})`,
              }}
            />

            {/* Threshold marker */}
            <circle
              cx={markerX}
              cy={markerY}
              r={4}
              fill="#94a3b8"
              stroke="#0f172a"
              strokeWidth={2}
            />
            <text
              x={markerX}
              y={markerY - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              fontFamily="Inter, sans-serif"
            >
              {maxThreshold}%
            </text>

            {/* Zone labels */}
            <text x="20" y={size / 2 + 30} fontSize="10" fill="#64748b" fontFamily="Inter, sans-serif">0%</text>
            <text x={size - 32} y={size / 2 + 30} fontSize="10" fill="#64748b" fontFamily="Inter, sans-serif">100%</text>
          </svg>

          {/* Center display */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: size / 2 - 30 }}
          >
            <div className="text-center">
              <div className={`text-4xl font-bold ${color.text} tabular-nums`}>
                {animatedRatio.toFixed(1)}
                <span className="text-lg">%</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">
                Risk Ratio
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${color.bg} border ${color.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.icon}</span>
          <span className={`text-sm font-semibold ${color.text}`}>{status.label}</span>
        </div>
        <span className="text-xs text-slate-400">
          Threshold: {maxThreshold}%
        </span>
      </div>

      {/* Zone indicators */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Safe", range: "0–50%", color: "emerald", active: !isWarning && !isDanger },
          { label: "Warning", range: "50–80%", color: "amber", active: isWarning && !isDanger },
          { label: "Critical", range: "80–100%", color: "red", active: isDanger },
        ].map((zone) => (
          <div
            key={zone.label}
            className={`p-2.5 rounded-lg border text-center transition-all duration-300 ${
              zone.active
                ? `bg-${zone.color}-500/15 border-${zone.color}-500/30`
                : "bg-slate-800/30 border-slate-700/30 opacity-50"
            }`}
          >
            <div className={`text-xs font-semibold ${zone.active ? `text-${zone.color}-400` : "text-slate-500"}`}>
              {zone.label}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{zone.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
