import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

let nodeProcess: any = null;
let demoRunning = false;

async function isNodeRunning(): Promise<boolean> {
  // In production (Netlify), we bypass local node checks and run against Sepolia
  if (process.env.NETLIFY === "true" || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return true; 
  }

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
        // Only inject if the environment variable exists, otherwise rely on hardhat fallbacks
        ...(process.env.SEPOLIA_RPC_URL ? { TESTNET_RPC: process.env.SEPOLIA_RPC_URL } : {})
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
      const isProd = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production" || process.env.VERCEL;
      const running = await isNodeRunning();
      const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
      
      let deployed = false;
      let contractAddress = null;
      
      if (fs.existsSync(contractPath)) {
        deployed = true;
        const data = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
        contractAddress = data.address;
      } else if (isProd && process.env.NEXT_PUBLIC_BRIDGE_ADDRESS) {
         // In production use the bridge address from env vars
         deployed = true;
         contractAddress = process.env.NEXT_PUBLIC_BRIDGE_ADDRESS;
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

    const isProd = process.env.NETLIFY === "true" || process.env.NODE_ENV === "production" || process.env.VERCEL;
    const networkFlag = isProd ? "--network sepolia" : "--network localhost";

    if (action === "deploy-bridge") {
      demoRunning = true;
      
      if (isProd) {
         demoRunning = false;
         if (process.env.NEXT_PUBLIC_BRIDGE_ADDRESS) {
           return NextResponse.json({
             success: true,
             output: `[PROD_MODE] Skipping local deployment. Using existing contract at ${process.env.NEXT_PUBLIC_BRIDGE_ADDRESS} from NEXT_PUBLIC_BRIDGE_ADDRESS.`,
             error: "",
             deployed: true,
             contractAddress: process.env.NEXT_PUBLIC_BRIDGE_ADDRESS,
           });
         } else {
            return NextResponse.json({
              success: false,
              output: "",
              error: "In production, you must supply NEXT_PUBLIC_BRIDGE_ADDRESS in Netlify environment variables.",
              deployed: false,
              contractAddress: null,
            });
         }
      }

      const result = await executeCommand("pnpm", ["run", "node:deploy", networkFlag]);
      demoRunning = false;

      const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
      let deployed = false;
      let contractAddress = null;
      
      if (fs.existsSync(contractPath)) {
        deployed = true;
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

    const demoActions: Record<string, string> = {
      "demo-crisis": "demo:crisis",
      "demo-flash": "demo:flash",
      "demo-normal": "demo:normal",
      "demo-stealth": "demo:stealth",
      "demo-governance": "demo:governance",
      "demo-oracle": "demo:oracle",
      "demo-show": "demo:show",
    };

    if (demoActions[action]) {
      demoRunning = true;
      const result = await executeCommand("pnpm", ["run", demoActions[action], networkFlag]);
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
