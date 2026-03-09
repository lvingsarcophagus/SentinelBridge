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
      callContract(selectors.getSourceReserves).catch(() => "0x0"),
      callContract(selectors.getDestReserves).catch(() => "0x0"),
      callContract(selectors.getLockedAmount).catch(() => "0x0"),
      callContract(selectors.getRiskRatio).catch(() => "0x0"),
      callContract(selectors.isPaused).catch(() => "0x0"),
    ]);

    // Parse hex values safely
    const sourceReserve = sourceHex ? BigInt(sourceHex).toString() : "0";
    const destReserve = destHex ? BigInt(destHex).toString() : "0";
    const lockedAmount = lockedHex ? BigInt(lockedHex).toString() : "0";
    const riskRatio = riskHex ? Number(BigInt(riskHex)) : 0;
    const isPaused = pausedHex ? BigInt(pausedHex) !== 0n : false;

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
