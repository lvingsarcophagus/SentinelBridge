import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

let nodeProcess: any = null;
let demoRunning = false;

async function isNodeRunning(): Promise<boolean> {
  try {
    const response = await axios.post("http://127.0.0.1:8545", {
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: 1,
    }, { timeout: 1000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function executeCommand(
  command: string,
  args: string[]
): Promise<{ output: string; error: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: process.cwd(),
      shell: true,
      env: {
        ...process.env,
        // Inject RPC URL with fallbacks
        TESTNET_RPC: process.env.SEPOLIA_RPC_URL || process.env.SOURCE_RPC || "http://127.0.0.1:8545"
      }
    });

    let output = "";
    let error = "";

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      error += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        output,
        error,
        exitCode: code || 0,
      });
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill();
      resolve({
        output,
        error: error || "Command timeout",
        exitCode: 1,
      });
    }, 60000);
  });
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === "check") {
      const running = await isNodeRunning();
      const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
      const deployed = fs.existsSync(contractPath);
      
      let contractAddress = null;
      if (deployed) {
        const data = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
        contractAddress = data.address;
      }

      return NextResponse.json({
        nodeRunning: running,
        deployed,
        contractAddress,
        demoRunning,
      });
    }

    if (action === "start-node") {
      const running = await isNodeRunning();
      if (running) {
        return NextResponse.json({
          success: true,
          message: "Node already running",
          nodeRunning: true,
        });
      }

      // Start node in background
      nodeProcess = spawn("pnpm", ["run", "node:start"], {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
      });
      nodeProcess.unref();

      // Wait a moment and check if it's running
      await new Promise((r) => setTimeout(r, 3000));
      const isRunning = await isNodeRunning();

      return NextResponse.json({
        success: isRunning,
        message: isRunning ? "Node started" : "Failed to start node",
        nodeRunning: isRunning,
      });
    }

<<<<<<< Updated upstream
    const isProd = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production" || process.env.VERCEL;
    const rpc = process.env.SEPOLIA_RPC_URL || process.env.SOURCE_RPC || "";
    const isTestnet = rpc.includes("http") && !rpc.includes("127.0.0.1") && !rpc.includes("localhost");
    
    // Use sepolia flag if in production OR if explicitly pointing to a non-local RPC
    const networkFlag = (isProd || isTestnet) ? "--network sepolia" : "--network localhost";

    if (action === "deploy-bridge") {
=======
    if (action === "deploy") {
>>>>>>> Stashed changes
      demoRunning = true;
      const result = await executeCommand("pnpm", ["run", "node:deploy"]);
      demoRunning = false;

      const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
      const deployed = fs.existsSync(contractPath);

      let contractAddress = null;
      if (deployed) {
        const data = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
        contractAddress = data.address;
      }

      return NextResponse.json({
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        deployed,
        contractAddress,
      });
    }

    const demoScripts: Record<string, string> = {
      "demo-crisis": "demo:crisis",
      "demo-normal": "demo:normal",
      "demo-stealth": "demo:stealth",
      "demo-flash": "demo:flash",
      "demo-governance": "demo:governance",
      "demo-oracle": "demo:oracle",
      "demo-show": "demo:show",
    };

    if (demoScripts[action]) {
      demoRunning = true;
      const result = await executeCommand("pnpm", ["run", demoScripts[action]]);
      demoRunning = false;

      return NextResponse.json({
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    demoRunning = false;
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
