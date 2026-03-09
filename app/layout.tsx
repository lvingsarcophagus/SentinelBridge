import type { Metadata } from "next";
import "./globals.css";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SentinelBridge — Liquidity Watchdog",
  description:
    "Automated circuit breaker for cross-chain bridge liquidity monitoring. Built with Chainlink CRE for the Convergence Hackathon 2026.",
  icons: {
    icon: "/sentinel-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden bg-black text-white antialiased">
        {/* Fixed Background Canvas */}
        <BackgroundCanvas />

        {/* Content Layer */}
        <div className="relative z-10">
          {/* Floating Navbar */}
          <Navbar />

          {/* Main Content — offset for fixed navbar */}
          <main className="pt-20">{children}</main>

          {/* Footer */}
          <footer className="relative border-t border-slate-800/50 bg-black/60 backdrop-blur-sm mt-16">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid gap-8 sm:grid-cols-3">
                {/* Brand */}
                <div>
                  <div className="flex items-center gap-3 mb-4 group">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700/50 overflow-hidden">
                      <img 
                        src="/sentinel_logo_new_1772987283819.png" 
                        alt="SB Logo" 
                        className="w-full h-full object-cover scale-110 grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">
                      Sentinel<span className="text-gradient">Bridge</span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Automated circuit breaker for cross-chain bridge liquidity
                    monitoring. Powered by Chainlink CRE.
                  </p>
                </div>

                {/* Links */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Navigation
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li>
                      <a
                        href="/dashboard"
                        className="hover:text-cyan-400 transition-colors"
                      >
                        Dashboard
                      </a>
                    </li>
                    <li>
                      <a
                        href="/demo-controller"
                        className="hover:text-cyan-400 transition-colors"
                      >
                        Demo Controller
                      </a>
                    </li>
                    <li>
                      <a
                        href="/docs"
                        className="hover:text-cyan-400 transition-colors"
                      >
                        Documentation
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Hackathon */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Built For
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                    <span className="text-sm text-cyan-400 font-medium">
                      Chainlink Convergence 2026
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Next.js 15 • React 19 • Solidity • CRE
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
                <p className="text-xs text-slate-600">
                  © 2026 SentinelBridge — Automated Circuit Breaker for Bridge
                  Liquidity Protection
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
