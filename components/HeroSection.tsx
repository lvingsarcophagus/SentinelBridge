"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden">
      {/* Content Overlay */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Shield Icon */}
        <div className="mb-6 animate-fade-in-up">
          <div className="text-6xl animate-float inline-block">🛡️</div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4 animate-fade-in-up delay-100">
          <span className="text-gradient">SentinelBridge</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-slate-200 font-light mb-2 animate-fade-in-up delay-200">
          Automated Circuit Breaker
        </p>
        <p className="text-lg text-slate-400 mb-10 animate-fade-in-up delay-300">
          Protect Your Cross-Chain Liquidity in Real-Time
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-400">
          <a
            href="#dashboard"
            className="btn-primary btn group"
          >
            <span>View Dashboard</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
          <Link
            href="/simulation"
            className="btn btn-secondary group"
          >
            <span>Run Simulation</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            {
              icon: "📡",
              title: "Real-Time Monitoring",
              desc: "Live risk ratio tracking across chains",
              color: "cyan",
              delay: "delay-500",
            },
            {
              icon: "🤖",
              title: "Automated Protection",
              desc: "Smart circuit breaker stops liquidity drain",
              color: "blue",
              delay: "delay-600",
            },
            {
              icon: "⚡",
              title: "Chainlink CRE",
              desc: "Event-driven workflow reliability",
              color: "purple",
              delay: "delay-700",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`animate-fade-in-up ${feature.delay} group relative p-5 rounded-xl border border-slate-700/40 bg-slate-950/40 backdrop-blur-sm hover:border-${feature.color}-500/40 transition-all duration-500 hover:-translate-y-1`}
            >
              <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Hackathon Badge */}
        <div className="mt-12 animate-fade-in-up delay-800">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-600/30 bg-cyan-600/10 backdrop-blur-sm text-cyan-300 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            Chainlink Convergence Hackathon 2026
          </span>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <a href="#dashboard" className="block animate-bounce text-slate-500 hover:text-cyan-400 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
