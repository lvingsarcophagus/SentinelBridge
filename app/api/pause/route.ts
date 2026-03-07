import { NextResponse } from "next/server";

/**
 * POST /api/pause
 * Manually trigger bridge pause
 */
export async function POST() {
  try {
    // In a real implementation, this would trigger evm.call() on the CRE workflow
    const response = {
      ok: true,
      transactionHash: "0xabc123def456789",
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pause bridge";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
