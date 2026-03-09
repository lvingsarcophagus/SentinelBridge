"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden">
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Logo */}
        <div className="mb-8 animate-fade-in-up">
          <div className="animate-float inline-block">
            <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_40px_rgba(0,229,255,0.15)]">
              <img
                src="/sentinel_logo_new_1772987283819.png"
                alt="SentinelBridge"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4 animate-fade-in-up delay-100">
          <span className="text-gradient">SentinelBridge</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-slate-200 font-light mb-2 animate-fade-in-up delay-200">
          Automated Circuit Breaker for Cross-Chain Bridges
        </p>
        <p className="text-base text-slate-400 mb-10 max-w-2xl mx-auto animate-fade-in-up delay-300">
          AI-powered liquidity watchdog built on the Chainlink Runtime Environment.
          Detect exploits. Pause bridges. Protect capital — in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-400">
          <Link
            href="/dashboard"
            className="btn-primary btn group"
          >
            <span>Open Dashboard</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/demo-controller"
            className="btn btn-secondary group"
          >
            <span>Try Live Demo</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
        </div>

        {/* Hackathon Badge */}
        <div className="mt-10 animate-fade-in-up delay-500">
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
        <a href="#how-it-works" className="block animate-bounce text-slate-500 hover:text-cyan-400 transition-colors">
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
