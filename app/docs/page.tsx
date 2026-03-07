"use client";

import { HeroSection } from "@/components/HeroSection";

export default function DocsPage() {
  return (
    <>
      <div className="min-h-screen bg-[#050B14] pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="border-b border-cyan-500/20 pb-8">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
              SentinelBridge Documentation
            </h1>
            <p className="text-xl text-slate-400 font-light">
              Active AI Defense via the Chainlink Runtime Environment (CRE)
            </p>
          </div>

          {/* Architecture Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-3">
              <span className="bg-cyan-500/10 p-2 rounded-lg">🏗️</span>
              The Architecture
            </h2>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-slate-300 leading-relaxed space-y-4">
              <p>
                SentinelBridge represents a new paradigm in cross-chain security. Most bridges rely on static thresholds (e.g., "Pause if TVL drops 50%"). Sophisticated attackers bypass these using slow-drains or flash-loan timing. We built a Watchdog that relies on <strong>AI-driven intent analysis</strong> to detect <em>anomalous state changes</em> rather than just volume drops.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-4 text-slate-400">
                <li><strong className="text-cyan-300">Chainlink CRE:</strong> The backbone of the watchdog. It triggers a workflow on every interaction with the SourceBridge contract.</li>
                <li><strong className="text-purple-400">Groq AI Engine:</strong> Uses Groq's <code>llama-3.1-8b-instant</code> model via CRE's HTTPClient capability. It calculates the velocity of withdrawals and performs intent analysis in milliseconds, classifying attack patterns before the next block is mined.</li>
                <li><strong className="text-emerald-400">State Change (Execution):</strong> If an exploit is identified, the workflow automatically triggers <code>emergencyPause()</code> on the smart contract.</li>
              </ul>
            </div>
          </section>

          {/* Attack Vectors Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-red-400 flex items-center gap-3">
              <span className="bg-red-500/10 p-2 rounded-lg">🚨</span>
              Covered Attack Vectors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Flash Loan */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-red-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Flash Loan Exploits</span>
                  <span className="text-xs font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">HIGH VELOCITY</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Attackers borrow massive liquidity to manipulate oracle prices or drain reserves in a single block. 
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  AI detects impossible velocity spikes ({'>'}10,000x baseline) and triggers an immediate pause.
                </div>
              </div>

              {/* Stealth Drain */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Stealth Drain</span>
                  <span className="text-xs font-mono bg-amber-500/20 text-amber-400 px-2 py-1 rounded">SLOW BLEED</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Sophisticated attackers siphon funds gradually to stay just under static TVL drop alarms.
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  AI correlates sequential minor transactions against the historical standard deviation to extrapolate intent.
                </div>
              </div>

              {/* Reentrancy */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Reentrancy</span>
                  <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-1 rounded">STATE SPOOFING</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Repeatedly calling a bridging function before the internal balance state updates globally.
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  CRE execution tracks cross-chain inconsistencies before finality.
                </div>
              </div>

              {/* Governance/Admin Hijack */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Governance Hijack</span>
                  <span className="text-xs font-mono bg-orange-500/20 text-orange-400 px-2 py-1 rounded">ACCESS CONTROL</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  A compromised private key allows an attacker to upgrade the contract or alter the vault address (e.g., $4.4M ioTube breach).
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  CRE monitors ownership events and AI cross-checks against a Security Schedule, vetoing unauthorized changes.
                </div>
              </div>

              {/* Forged Message / Proof Fraud */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-indigo-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Proof Fraud</span>
                  <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">FORGED MESSAGE</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Bypassing validation by exploiting fast-track execution functions to submit spoofed deposits that never occurred. 
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  CRE acts as an independent Verification Layer. AI verifies the source hash directly on the origin chain, killing mismatched proofs.
                </div>
              </div>

              {/* Oracle Lag / Price Divergence */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-rose-500/30 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Oracle Lag Arbitrage</span>
                  <span className="text-xs font-mono bg-rose-500/20 text-rose-400 px-2 py-1 rounded">PRICE DIVERGENCE</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Exploiting the delay between a real-world price crash and the bridge's internal exchange rate to withdraw healthy assets.
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  AI monitors external Chainlink Data Feeds. If internal/external price diverges &gt;2% in &lt;1min, it enters Protective Mode.
                </div>
              </div>

              {/* Normal Operations */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-2 flex justify-between">
                  <span>Normal Traffic</span>
                  <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">BENIGN</span>
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Everyday bridge users transferring standard amounts back and forth continuously.
                </p>
                <div className="bg-black/50 p-3 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                  <span className="text-slate-500">Defense: </span>
                  AI categorizes normal metrics as "NORMAL CLEAR" ensuring no false-positive pauses occur.
                </div>
              </div>
              
            </div>
          </section>

          {/* Watchdog Controller Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-3">
              <span className="bg-purple-500/10 p-2 rounded-lg">💻</span>
              The Demo Controller
            </h2>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-slate-300 leading-relaxed space-y-4">
              <p>
                The Demo Controller acts as a command center to simulate on-chain state changes while streaming the AI's inferences in real-time. 
              </p>
              <div className="bg-black/80 rounded border border-purple-500/30 p-4 font-mono text-sm">
                <div className="text-purple-300/80 mb-2"># Try the simulations in the Demo Controller:</div>
                <div className="flex items-center gap-2 mb-1"><span className="text-emerald-400 font-bold">&gt;</span> <span>exec_normal_traffic</span> <span className="text-slate-500 ml-2">// AI confidently allows traffic</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-amber-400 font-bold">&gt;</span> <span>exec_stealth_drain</span> <span className="text-slate-500 ml-2">// AI detects anomaly progression</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-red-400 font-bold">&gt;</span> <span>exec_flash_loan</span> <span className="text-slate-500 ml-2">// AI instantly circuit-breaks</span></div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
