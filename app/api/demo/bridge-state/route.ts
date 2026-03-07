import { NextResponse } from "next/server";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

/**
 * GET /api/demo/bridge-state
 * Reads current bridge state directly from the Hardhat node via JSON-RPC
 */
export async function GET() {
  try {
    // Check if contract address exists
    const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
    if (!fs.existsSync(contractPath)) {
      return NextResponse.json({ ok: false, error: "Contract not deployed" });
    }

    const { address } = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

    // Function selectors (first 4 bytes of keccak256 of function signature)
    const selectors = {
      getSourceReserves: "0x3defc027",   // getSourceReserves()
      getDestReserves: "0x2e2e2a0b",     // getDestReserves()
      getLockedAmount: "0x252bc886",     // getLockedAmount()
      getRiskRatio: "0x41ce8132",        // getRiskRatio()
      isPaused: "0xb187bd26",            // isPaused()
    };

    // Read all values via eth_call, compute selectors correctly
    const rpc = "http://127.0.0.1:8545";
    
    const callContract = async (selector: string) => {
      const resp = await axios.post(rpc, {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: address, data: selector }, "latest"],
        id: 1,
      }, { timeout: 3000 });
      return resp.data.result;
    };

    const [sourceHex, destHex, lockedHex, riskHex, pausedHex] = await Promise.all([
      callContract(selectors.getSourceReserves),
      callContract(selectors.getDestReserves),
      callContract(selectors.getLockedAmount),
      callContract(selectors.getRiskRatio),
      callContract(selectors.isPaused),
    ]);

    // Parse hex values
    const sourceReserve = BigInt(sourceHex).toString();
    const destReserve = BigInt(destHex).toString();
    const lockedAmount = BigInt(lockedHex).toString();
    const riskRatio = Number(BigInt(riskHex));
    const isPaused = BigInt(pausedHex) !== 0n;

    return NextResponse.json({
      ok: true,
      address,
      sourceReserve,
      destReserve,
      lockedAmount,
      riskRatio,
      isPaused,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to read bridge state",
    });
  }
}
