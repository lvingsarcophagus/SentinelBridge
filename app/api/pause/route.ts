import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * POST /api/pause
 * Manually trigger bridge pause via on-chain transaction.
 * Calls the pause() function on the deployed SourceBridge contract.
 */
export async function POST() {
  try {
    const bridgeAddressPath = path.join(process.cwd(), "tmp/bridge-address.json");
    if (!fs.existsSync(bridgeAddressPath)) {
      return NextResponse.json(
        { ok: false, error: "Contract not deployed. Deploy first via Demo Controller." },
        { status: 400 }
      );
    }

    const { address: contractAddress } = JSON.parse(fs.readFileSync(bridgeAddressPath, "utf-8"));

    const abiPath = path.join(process.cwd(), "artifacts/contracts/SourceBridge.sol/SourceBridge.json");
    if (!fs.existsSync(abiPath)) {
      return NextResponse.json(
        { ok: false, error: "Contract ABI not found. Compile contracts first." },
        { status: 400 }
      );
    }

    const scriptCode = `
import { ethers } from "ethers";
import fs from "fs";

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    await provider.getNetwork();
    const signer = await provider.getSigner(0);
    const abi = JSON.parse(fs.readFileSync("${abiPath.replace(/\\/g, '/')}"))["abi"];
    const contract = new ethers.Contract("${contractAddress}", abi, signer);

    const isPaused = await contract.isPaused();
    if (isPaused) {
      console.log(JSON.stringify({ ok: false, error: "Bridge is already paused." }));
      return;
    }

    const tx = await contract.pause();
    const receipt = await tx.wait();
    console.log(JSON.stringify({ ok: true, transactionHash: receipt.hash }));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  }
}
main();
    `;

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpScript = path.join(tmpDir, "manual-pause-tmp.js");
    fs.writeFileSync(tmpScript, scriptCode);

    try {
      const { stdout } = await execAsync(`node "${tmpScript}"`);
      const result = JSON.parse(stdout.trim());
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, transactionHash: result.transactionHash });
    } finally {
      if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pause bridge";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
