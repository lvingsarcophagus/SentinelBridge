import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

let nodeProcess: any = null;
let lastOutput: string[] = [];

export async function GET() {
  try {
    // Check if contract is deployed
    const contractPath = path.join(process.cwd(), "tmp/bridge-address.json");
    const deployed = fs.existsSync(contractPath);
    
    let contractAddress = null;
    if (deployed) {
      const data = JSON.parse(fs.readFileSync(contractPath, "utf-8"));
      contractAddress = data.address;
    }

    return NextResponse.json({
      nodeRunning: nodeProcess !== null,
      deployed,
      contractAddress,
      output: lastOutput.slice(-50), // Last 50 lines
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
