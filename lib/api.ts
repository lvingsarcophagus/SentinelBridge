const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface WorkflowStatus {
  ok: boolean;
  isPaused: boolean;
  riskRatio: number;
  sourceReserve: string;
  destReserve: string;
  targetLocked: string;
  lastCheck: string;
  lastTransactionHash: string | null;
  ai?: {
    assessment: string;
    confidence: number;
    details: string;
    recommendation: string;
  };
}

export async function getWorkflowStatus(): Promise<WorkflowStatus> {
  const response = await fetch(`${API_BASE_URL}/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch workflow status: ${response.statusText}`
    );
  }

  return response.json();
}

export async function pauseBridge(): Promise<{
  ok: boolean;
  transactionHash?: string;
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to pause bridge: ${response.statusText}`);
  }

  return response.json();
}

export async function getWorkflowLogs(): Promise<{
  logs: string[];
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE_URL}/logs`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }

  return response.json();
}
