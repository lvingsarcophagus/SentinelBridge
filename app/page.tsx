"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HeroSection } from "@/components/HeroSection";
import { Spinner } from "@/components/Spinner";

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <Spinner size="lg" />
        <p className="font-mono text-[#00E5FF] tracking-widest text-sm animate-pulse">
          INITIALIZING SENTINELBRIDGE...
        </p>
      </div>
    );
  }

  return (
    <>
      <HeroSection />

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              How <span className="text-gradient">SentinelBridge</span> Works
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A three-stage pipeline that listens, evaluates, and acts — all within the Chainlink Runtime Environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Listen",
                desc: "CRE monitors every bridge interaction on-chain. Event triggers fire the workflow instantly — no polling lag.",
                accent: "cyan",
              },
              {
                step: "02",
                title: "Evaluate",
                desc: "A multi-dimensional risk engine scores velocity, anomaly patterns, and oracle drift. Groq AI classifies the attack vector.",
                accent: "blue",
              },
              {
                step: "03",
                title: "Act",
                desc: "When risk exceeds threshold, the circuit breaker executes emergencyPause() on-chain. Capital is protected before the next block.",
                accent: "purple",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`card animate-fade-in-up delay-${(i + 1) * 200} group hover:-translate-y-1 transition-all duration-500`}
              >
                <div className={`text-xs font-mono tracking-wider text-${item.accent}-400 mb-3`}>
                  STEP {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                <div className={`mt-4 h-0.5 w-12 rounded-full bg-gradient-to-r from-${item.accent}-500 to-transparent`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Attack Vectors */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Threat Coverage
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              SentinelBridge detects and neutralizes the most common cross-chain exploit patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Flash Loan Exploits",
                desc: "Single-block massive liquidity extraction. AI detects impossible velocity spikes and triggers immediate pause.",
                severity: "CRITICAL",
                color: "red",
              },
              {
                title: "Stealth Drain",
                desc: "Gradual incremental withdrawals below per-tx thresholds. Statistical anomaly scoring catches the cumulative drift.",
                severity: "HIGH",
                color: "amber",
              },
              {
                title: "Governance Hijack",
                desc: "Unauthorized ownership transfer and parameter manipulation. CRE monitors OwnershipTransferred events in real-time.",
                severity: "CRITICAL",
                color: "red",
              },
              {
                title: "Oracle / Proof Fraud",
                desc: "Forged Merkle proofs or stale oracle data used to unlock tokens. Cross-chain hash verification catches mismatches.",
                severity: "CRITICAL",
                color: "red",
              },
              {
                title: "Liquidity Imbalance",
                desc: "Reserves on source and destination chains diverge beyond safe ratios. Threshold monitoring triggers rate limiting.",
                severity: "HIGH",
                color: "amber",
              },
              {
                title: "Multi-Vector Attack",
                desc: "Coordinated exploits combining multiple vectors. Weighted risk aggregation escalates faster when signals converge.",
                severity: "CRITICAL",
                color: "red",
              },
            ].map((threat) => (
              <div
                key={threat.title}
                className="card group hover:-translate-y-1 transition-all duration-500"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">{threat.title}</h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      threat.color === "red"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {threat.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{threat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Built With
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { name: "Chainlink CRE", desc: "Runtime Environment", accent: "border-cyan-500/30" },
              { name: "Groq AI", desc: "LLaMA 3.1 Inference", accent: "border-purple-500/30" },
              { name: "Next.js 15", desc: "React 19 Frontend", accent: "border-blue-500/30" },
              { name: "Solidity", desc: "Smart Contracts", accent: "border-emerald-500/30" },
            ].map((tech) => (
              <div
                key={tech.name}
                className={`card text-center py-6 ${tech.accent} hover:-translate-y-1 transition-all duration-500`}
              >
                <div className="text-lg font-bold text-white mb-1">{tech.name}</div>
                <div className="text-xs text-slate-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="card glow-card p-10" style={{ borderColor: "rgba(0, 229, 255, 0.15)" }}>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
                <img
                  src="/sentinel_logo_new_1772987283819.png"
                  alt="SentinelBridge"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to See It in Action?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Deploy the contract to a local Hardhat node, trigger attack scenarios, and watch the AI-powered circuit breaker respond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo-controller" className="btn btn-primary">
                Launch Demo Controller
              </Link>
              <Link href="/docs" className="btn btn-secondary">
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
