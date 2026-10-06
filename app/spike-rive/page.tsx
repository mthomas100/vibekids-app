'use client'
/**
 * SPIKE: Rive state-machine avatar in Next 16 App Router / React 19 / Turbopack
 *
 * .riv source:  https://cdn.rive.app/animations/vehicles.riv  (Rive's own public CDN)
 * Artboard:     (default — the first artboard)
 * State machine: "bumpy"
 * Input:        "bump" (trigger — call .fire() to bump the animation)
 *
 * Next 16 / React 19 / WASM notes (see lazy-loading.md + use-client.md):
 *  - @rive-app/react-canvas uses window/document/ResizeObserver at module init time;
 *    it CANNOT run on the server.  Placing 'use client' at the TOP of this file marks
 *    the entire file (and its imports) as client-side only — Next.js will never send
 *    this module to the SSR runtime.  That is the correct, documented pattern for
 *    third-party browser-only libraries in the App Router (see use-client.md).
 *  - We do NOT need next/dynamic({ ssr: false }) here because this file IS the
 *    client boundary — the page itself is 'use client'.  dynamic({ ssr: false }) is
 *    only needed when a Server Component needs to import a client-only component.
 *  - Rive loads its WASM bundle lazily from the CDN at runtime (no webpack/turbopack
 *    config needed).  The canvas runtime (@rive-app/canvas) ships the WASM inline and
 *    fetches it via fetch() — fully browser-side, no build-time WASM config required.
 */

import { useState, useEffect } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

const RIVE_SRC = 'https://cdn.rive.app/animations/vehicles.riv'
const STATE_MACHINE = 'bumpy'
const INPUT_BUMP = 'bump' // trigger input

export default function SpikeRivePage() {
  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
  })

  // useStateMachineInput(riveInstance, stateMachineName, inputName, initialValue?)
  // Returns StateMachineInput | null
  // For a trigger input, call .fire(); for boolean/number, set .value
  const bumpInput = useStateMachineInput(rive, STATE_MACHINE, INPUT_BUMP)

  // Demonstrate React → Rive binding: auto-fire every 2 s so the human can see it
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!bumpInput) return
    const id = setInterval(() => {
      bumpInput.fire()
      setCount((c) => c + 1)
    }, 2000)
    return () => clearInterval(id)
  }, [bumpInput])

  function handleManualBump() {
    bumpInput?.fire()
    setCount((c) => c + 1)
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Rive State-Machine Spike</h1>
      <p>
        File: <code>{RIVE_SRC}</code>
        <br />
        State machine: <code>{STATE_MACHINE}</code>
        <br />
        Input: <code>{INPUT_BUMP}</code> (trigger) — fires every 2 s automatically
      </p>

      {/* RiveComponent renders a canvas inside a 100% w/h div wrapper */}
      <div style={{ width: 600, height: 400, border: '1px solid #ccc', borderRadius: 8 }}>
        <RiveComponent />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={handleManualBump}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: 6,
            border: '1px solid #333',
          }}
        >
          Manual bump
        </button>
        <p style={{ marginTop: '0.5rem' }}>
          Bumps fired: <strong>{count}</strong>
          {' — '}
          Input ref live: <strong>{bumpInput ? 'yes' : 'no (loading…)'}</strong>
        </p>
      </div>

      <details style={{ marginTop: '2rem' }}>
        <summary>Spike notes (for real build)</summary>
        <ul>
          <li>
            <code>&apos;use client&apos;</code> at top of file = correct SSR boundary for
            browser-only libs in Next.js 16 App Router.
          </li>
          <li>
            No <code>dynamic(&#123; ssr: false &#125;)</code> needed — the{' '}
            <code>&apos;use client&apos;</code> directive already excludes SSR.
          </li>
          <li>
            No Turbopack/webpack WASM config needed — Rive fetches WASM at runtime via{' '}
            <code>fetch()</code>.
          </li>
          <li>
            React → Rive binding API:{' '}
            <code>useStateMachineInput(rive, machineName, inputName)</code>
            {' → '}<code>.fire()</code> for triggers, <code>.value = n</code> for number/boolean.
          </li>
          <li>
            Map <code>buildStatus.phase → mood</code> by calling{' '}
            <code>moodInput.value = phaseNumber</code> on each phase change (use a number input
            in the Rive file keyed to phases: idle=0, building=1, done=2, error=3).
          </li>
        </ul>
      </details>
    </main>
  )
}
