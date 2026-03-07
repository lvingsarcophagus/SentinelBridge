"use client";

interface DashboardCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle?: string;
  status?: "success" | "warning" | "danger" | "info";
  className?: string;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  status = "info",
  className = "",
}: DashboardCardProps) {
  const colorMap = {
    success: { text: "text-emerald-400", border: "border-emerald-500/30" },
    warning: { text: "text-amber-400", border: "border-amber-500/30" },
    danger: { text: "text-red-400", border: "border-red-500/30" },
    info: { text: "text-[#00E5FF]", border: "border-[#00E5FF]/30" },
  };

  const c = colorMap[status];

  return (
    <div className={`p-5 rounded-xl border ${c.border} flex flex-col justify-between ${className}`}>
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h3>
        <div className={`text-2xl font-bold mt-2 ${c.text} tracking-tight`}>{value}</div>
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-2 font-mono">{subtitle}</p>}
    </div>
  );
}
