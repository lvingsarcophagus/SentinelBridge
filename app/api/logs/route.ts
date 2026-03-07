import { NextResponse } from "next/server";

/**
 * GET /api/logs
 * Returns recent workflow logs
 */
export async function GET() {
  try {
    const logs = [
      "🚀 SentinelBridge Watchdog initialized",
      "📡 Received event. Triggering liquidity check",
      "🔍 Reading bridge reserves...",
      "📊 Risk Ratio: 42.50% (Threshold: 80.00%)",
      "✅ Bridge health check passed",
    ];

    return NextResponse.json({
      logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
