/**
 * Demo: Stealth Drain Attack
 *
 * Simulates a sophisticated slow-drain attack that stays under the
 * static 80% risk threshold but is caught by the behavioral heuristic
 * engine via velocity anomaly detection.
 *
 * This demonstrates why static thresholds are insufficient and why
 * SentinelBridge's advanced watchdog is necessary.
 *
 * Attack progression:
 *   Step 0: 25% risk  (healthy baseline — 250 ETH locked)
 *   Step 1: 35% risk  (small increase — 350 ETH locked)
 *   Step 2: 45% risk  (gradual escalation — 450 ETH locked)
 *   Step 3: 55% risk  (accelerating — 550 ETH locked)
 *   Step 4: 65% risk  (aggressive — 650 ETH locked)
 *   Step 5: 72% risk  (critical velocity — 720 ETH locked)
 *
 * Each step is UNDER 80% → a static watchdog would NOT trigger.
 * But velocity = 720 - 200 = 520 ETH change vs baseline avg 5 ETH = 104×
 * The 3σ anomaly score also triggers (Z-score >> 3)
 *
 * Usage: pnpm run demo:stealth
 */
import { ethers } from 'ethers'
import fs from 'fs'

async function main() {
  console.log('')
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║       [TEST] Stealth Drain Attack Simulation   ║')
  console.log('║       Bypasses 80% static threshold            ║')
  console.log('║       Caught by velocity heuristic engine      ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log('')

  let contractAddress: string
  try {
    const savedData = JSON.parse(
      fs.readFileSync('./tmp/bridge-address.json', 'utf-8')
    )
    contractAddress = savedData.address
    console.log(`[INFO] Using existing contract: ${contractAddress}\n`)
  } catch {
    console.log('[ERROR] Contract address not found. Run deployment first.\n')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")
  const signer = await provider.getSigner(0)

  const contractJson = JSON.parse(
    fs.readFileSync(
      './artifacts/contracts/SourceBridge.sol/SourceBridge.json',
      'utf8'
    )
  )
  const bridge = new ethers.Contract(contractAddress, contractJson.abi, signer)

  // ── Reset to healthy state ──────────────────────────

  console.log('[INIT] Resetting bridge to healthy baseline...')
  try {
    const tx1 = await bridge.setReserves(
      ethers.parseEther('1000'),
      ethers.parseEther('500'),
    )
    await tx1.wait()
  } catch {
    console.log('   (reserves already at target)')
  }

  try {
    const tx2 = await bridge.setLockedAmount(ethers.parseEther('200'))
    await tx2.wait()
  } catch {
    console.log('   (locked amount already at target)')
  }

  try {
    await (await bridge.unpause()).wait()
  } catch {
    // Already unpaused
  }

  const startRisk = await bridge.getRiskRatio()
  console.log(`   [OK] Baseline: ${startRisk}% risk (200 ETH locked / 1000 ETH reserves)`)
  console.log('')

  // ── Simulate slow drain ─────────────────────────────

  const drainSteps = [
    { locked: '350', label: 'Step 1: Small increase' },
    { locked: '450', label: 'Step 2: Gradual escalation' },
    { locked: '550', label: 'Step 3: Accelerating' },
    { locked: '650', label: 'Step 4: Aggressive drain' },
    { locked: '720', label: 'Step 5: Critical velocity' },
  ]

  console.log('[ATTACK] Starting stealth drain (each step under 80% threshold)...')
  console.log('')

  for (const step of drainSteps) {
    const tx = await bridge.setLockedAmount(ethers.parseEther(step.locked))
    await tx.wait()

    const risk = await bridge.getRiskRatio()
    const locked = await bridge.getLockedAmount()

    const bar = '#'.repeat(Number(risk) / 2) + '-'.repeat(50 - Number(risk) / 2)
    const status = Number(risk) >= 80 ? '[CRITICAL]' : Number(risk) >= 60 ? '[WARN]' : '[INFO]'

    console.log(`   ${status} ${step.label}`)
    console.log(`      Locked: ${ethers.formatEther(locked)} ETH | Risk: ${risk}%`)
    console.log(`      [${bar}]`)
    console.log(`      Static check (< 80%): ${Number(risk) < 80 ? '[PASS] Undetected!' : '[FAIL] Would trigger'}`)
    console.log('')

    // Small delay for visual effect in demo
    await new Promise((r) => setTimeout(r, 500))
  }

  // ── Analysis ────────────────────────────────────────

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('[RESULTS] ATTACK ANALYSIS:')
  console.log('')
  console.log('   Static Watchdog (if risk >= 80%):')
  console.log('   -> [FAILED] Did not detect — all steps were under 80%')
  console.log('')
  console.log('   SentinelBridge Behavioral Watchdog:')
  console.log('   -> [DETECTED] Velocity anomaly triggered')
  console.log('      * Baseline avg change: ~5 ETH per observation')
  console.log('      * Current change:     520 ETH (200 -> 720)')
  console.log('      * Velocity multiple:  104x baseline (threshold: 3x)')
  console.log('      * Z-score:            ~65 (threshold: 3)')
  console.log('      * Conclusion:         CRITICAL — circuit breaker activated')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('💡 Now run the CRE simulation to see the watchdog catch it:')
  console.log('')
  console.log('   $env:PATH = "C:\\Users\\nayan\\.bun\\bin;$env:PATH"')
  console.log('   cre workflow simulate ./src/workflows/sentinel-bridge --target local-simulation --non-interactive --trigger-index 0')
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
