<!-- SentinelBridge - Copilot Instructions -->
<!-- Project-specific guidelines for AI-assisted development -->

# SentinelBridge - Copilot Instructions

## Project Overview

**Product Name**: SentinelBridge  
**Purpose**: Automated circuit breaker for cross-chain bridge liquidity monitoring using Chainlink Runtime Environment (CRE).

**Stack**:
- **Frontend**: Next.js 15 with React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Workflow**: Chainlink CRE (TypeScript)
- **Package Manager**: pnpm 9.0+
- **Type Safety**: TypeScript (strict mode)

**Use Case**: Protect bridge protocols from liquidity depletion in Chainlink Convergence Hackathon.

**Architecture**: Listen (bridge events) → Evaluate (risk ratios) → Act (pause bridge)

## Coding Standards & Guidelines

### TypeScript & Type Safety
- ✅ Use **strict mode** enabled in tsconfig.json
- ✅ Define types for all function parameters and return values
- ✅ Use `Result<T>` pattern for error handling (not try-catch unless async exceptions)
- ✅ Convert BigInt properly: `BigInt(rpcValue)` for reserve balances
- ✅ Mark async functions explicitly with `async` keyword
- ✅ Use **"use client"** directive for client-side React components
- ✅ Use path aliases: `@/app`, `@/lib`, `@/components`, `@/workflow`

```typescript
// DO THIS - Server component:
export default function Dashboard() {
  // Server-only code here
}

// DO THIS - Client component:
"use client";
import { useState } from "react";
export default function RiskGauge() {
  const [ratio, setRatio] = useState(0);
}

// DO THIS - API route:
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ ok: true });
}

// NOT THIS:
function readReserves(evm, state) // Missing types
```

### Next.js App Router Structure
- ✅ Place pages in `app/` directory with `page.tsx`
- ✅ API routes in `app/api/[route]/route.ts` 
- ✅ Shared layout in `app/layout.tsx`
- ✅ Components in `components/` directory
- ✅ Utilities in `lib/` directory
- ✅ Use `"use client"` for interactive components

### React Best Practices for SentinelBridge
- ✅ Use functional components with hooks
- ✅ State management: React hooks (`useState`, `useEffect`) or Zustand for complex state
- ✅ API calls: Use `/lib/api.ts` helper functions, not inline fetch
- ✅ Styling: Tailwind CSS classes from `globals.css`
- ✅ Components: Keep < 300 lines, extract logic to custom hooks

```typescript
// Correct component structure:
"use client";

import { useEffect, useState } from "react";
import { getWorkflowStatus } from "@/lib/api";

export function Dashboard() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    const fetch = async () => {
      const data = await getWorkflowStatus();
      setStatus(data);
    };
    fetch();
  }, []);
  
  return (
    <div className="card">
      {/* Render status */}
    </div>
  );
}
```

### pnpm Package Manager
- ✅ Use `pnpm install` instead of `npm install`
- ✅ All scripts run with `pnpm run <script>`
- ✅ Lock file is `pnpm-lock.yaml` (not package-lock.json)
- ✅ Faster, more efficient dependency resolution than npm

### EVM Client Integration (CRE SDK)

**Critical Remember**: All EVM calls are async and must be awaited.

```typescript
// ✅ CORRECT - Await evm.read()
const sourceReserveResult = await evm.read({
  chainId: state.sourceChainId,
  contractAddress: state.bridgeAddress,
  functionName: "getSourceReserves",
  abi: BRIDGE_ABI,
  args: [],
});

if (!sourceReserveResult.ok) {
  Log.error(`Failed: ${sourceReserveResult.error}`);
  return sourceReserveResult; // Return error
}

const sourceReserve = BigInt(sourceReserveResult.value as string);

// ❌ WRONG - Forgot to await
const result = evm.read({ ... }); // This is a Promise!
const value = BigInt(result.value); // Crashes: result.value is undefined
```

### Error Handling Pattern

Use the `Result<T>` pattern, not raw try-catch for EVM operations:

```typescript
// ✅ Correct pattern in main workflow:
if (!reservesResult.ok) {
  Log.error(`Failed to read reserves: ${reservesResult.error}`);
  return; // Exit gracefully
}

// ✅ Try-catch only for truly unexpected exceptions:
try {
  // Operations that can throw
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  Log.error(`Unexpected: ${msg}`);
}
```

### State Management

- State is mutable and shared across lifecycle methods
- Always update state synchronously after operations
- Log state changes for observability

```typescript
// Update state only after successful operation:
const pauseResult = await executePause(evm, state);
if (pauseResult.ok) {
  state.isPaused = true; // Update state here
  state.lastCheckTimestamp = Date.now();
}
```

### Logging Style

Use structured logging with context and emoji indicators:

```typescript
// Level 1: Initialization
Log.info("🚀 Workflow initialized");

// Level 2: Normal operation
Log.info("📡 Event received. Triggering check...");

// Level 3: Health check output
Log.info(`📊 Risk Ratio: ${ratio.toFixed(2)}% (Threshold: ${max.toFixed(2)}%)`);

// Level 4: Warning
Log.warn("⚠️ Risk threshold exceeded");

// Level 5: Emergency action
Log.warn("🚨 EMERGENCY ALERT: Executing pause");

// Level 6: Success
Log.info("✅ Bridge paused successfully");

// Level 7: Error
Log.error(`❌ Failed to pause: ${error}`);

// Level 8: Critical
Log.error("💥 Critical failure - manual intervention needed");
```

## CRE SDK Type Requirements

### ABI Format
Use ethers.js style ABI definitions (not Solidity JSON-RPC format):

```typescript
const BRIDGE_ABI = [
  {
    type: "function",
    name: "getSourceReserves",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "TokensBridged",
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "amount", type: "uint256" },
    ],
  },
] as const;
```

### EVM Read vs Call
- **evm.read()**: View/pure functions (no state change, no gas)
- **evm.call()**: State-changing functions (transactions, requires gas)

```typescript
// Read reserves (view function)
await evm.read({
  chainId: state.sourceChainId,
  contractAddress: state.bridgeAddress,
  functionName: "getSourceReserves",
  abi: BRIDGE_ABI,
  args: [],
});

// Execute pause (state-changing)
await evm.call({
  chainId: state.sourceChainId,
  contractAddress: state.bridgeAddress,
  functionName: "pause",
  abi: BRIDGE_ABI,
  args: [],
});
```

### Result Pattern
All EVM operations return `Result<T>`:

```typescript
interface Result<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

// Always check ok flag first
if (!result.ok) {
  return { ok: false, error: result.error };
}
const value = result.value; // Now safe to access
```

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Forgetting `await` on evm.read() | Promise not awaited, value is undefined | Add `await` before evm calls |
| Accessing `result.value` without checking `ok` | May be undefined if operation failed | Check `if (!result.ok)` first |
| Using string arithmetic for BigInt | Loss of precision, crashes | Convert: `BigInt(stringValue)` and use BigInt operators |
| Not awaiting async functions | Workflow continues before operation completes | Add `await` in front of async calls |
| Mixing EVM read/call | View functions can't modify state | Use `evm.read()` for view, `evm.call()` for mutations |
| Bare try-catch around EVM calls | Error details lost | Use Result<T> pattern instead |
| Not updating state after success | Workflow state inconsistent | Update state synchronously after operations |

## Modification Guidelines

### When Adding New Features

1. **Ask before implementing**: "Why should this feature exist? What risk does it mitigate?"
2. **Verify against CRE docs**: Check [Chainlink CRE Documentation](https://docs.chain.link/cre) for API changes
3. **Keep risk logic isolated**: New risk calculations go in evaluated, separate function
4. **Add logging**: New features must have Log.info/warn/error statements
5. **Update tests**: Add corresponding test case in tests/workflow.test.ts
6. **Update README**: Document new features and risks

### When Modifying Risk Threshold Logic

1. Explain the mathematical change
2. Test with both healthy and risk states
3. Update the threshold documentation in README.md
4. Consider false-positive impact (unwanted pauses)

### When Adding EVM Calls

1. Verify ABI function signature matches contract
2. Add proper error handling with Result<T>
3. Log the operation and result
4. Consider gas costs if state-changing (evm.call)
5. Add timeout handling for RPC delays

## Testing Standards

- Use Jest for unit tests
- Mock EVM client with successful and failure scenarios
- Test both success and error paths
- Simulate using `cre workflow simulate ./dist/workflow.js`
- Verify logs contain expected emoji indicators

## Security Checklist for New Code

- [ ] Address validation (not zero address)
- [ ] Chain ID matches expected value
- [ ] ABI function names match actual contract
- [ ] Error messages don't expose sensitive data
- [ ] All async operations properly awaited
- [ ] State mutations only after successful operations
- [ ] No hardcoded private keys or secrets

## Documentation Standards

- Every function must have JSDoc comments
- Explain "why", not just "what"
- Include examples of usage
- Document error cases
- Link to relevant CRE SDK documentation

```typescript
/**
 * Read reserve balances from both chains
 * 
 * Risk ratio = (targetLocked / sourceReserve) * 100
 * 
 * @param evm - EVM client instance from CRE context
 * @param state - Workflow state containing chain IDs and bridge address
 * @returns Promise<Result<BridgeReserves>> - Reserves data or error
 * 
 * @example
 * const result = await readBridgeReserves(evm, state);
 * if (!result.ok) {
 *   Log.error(`Failed: ${result.error}`);
 *   return;
 * }
 * const { riskRatio } = result.value;
 */
```

## File Organization

```
src/
├── workflow.ts       # Main orchestrator (keep < 400 lines)
├── types.ts          # Shared type definitions
├── config.ts         # Configuration loading
└── utils.ts          # Helper functions
dist/                 # Compiled output (auto-generated)
tests/
└── workflow.test.ts  # Jest test suite
```

## Performance Considerations

- Cache ABI definitions to avoid repeated parsing
- Batch related EVM reads if possible
- Use early exits (check isPaused before reading reserves)
- Consider polling interval (don't check too frequently)
- Monitor RPC endpoint latency

## Hackathon-Specific Notes

✅ **What judges expect:**
- Type-safe code respecting CRE SDK signatures
- Proper error handling with meaningful messages
- Clear separation of concerns (read / evaluate / act)
- Production-grade logging with structured output
- Working test suite with mock scenarios

❌ **What will hurt your score:**
- Unhandled async/await issues
- Bare try-catch without context
- Accessing null/undefined values
- State mutations without error checks
- Unexplained logical decisions

🎯 **Pro tip**: When judges ask "Why did you do X?", you should be able to reference:
1. Chainlink CRE documentation
2. Security consideration
3. Error resilience
4. Production readiness

## Quick Reference

**Run commands with pnpm:**
```bash
pnpm install           # Install dependencies
pnpm run dev          # Start Next.js dev server
pnpm run build        # Build Next.js + compile workflow
pnpm run start        # Start production server
pnpm run workflow:build  # Compile CRE workflow only
pnpm run workflow:watch  # Watch CRE workflow changes
pnpm run simulate     # Test workflow with CRE
pnpm test             # Run Jest tests
```

**File paths to remember:**
- Main dashboard: `app/page.tsx`
- API routes: `app/api/[route]/route.ts`
- Components: `components/*.tsx`
- CRE Workflow: `workflow/index.ts`
- API utilities: `lib/api.ts`
- Styles: `app/globals.css`
- Types: `lib/` or inline in components
- Tests: `tests/workflow.test.ts`
- Config: `.env.example` (copy to `.env.local`)

---

**Last Updated**: March 6, 2026
**Maintained by**: Chainlink CRE Hackathon Participant
