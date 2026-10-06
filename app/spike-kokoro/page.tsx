'use client'
/**
 * SPIKE (throwaway): does Kokoro.js on-device TTS run in Next 16 / React 19 / Turbopack
 * client, and is WARM synth latency for a short "ack" low enough that read-aloud still
 * feels instant (the #18 win = ~90ms ack)?  Keystone for issue #24.
 *
 * What this proves-or-kills:
 *  1. Integration: kokoro-js (-> @huggingface/transformers -> onnxruntime-web) loads &
 *     runs in the Turbopack CLIENT bundle at all (the seam where types lie to you).
 *  2. Latency: COLD model-load time, and WARM `tts.generate()` latency for a SHORT ack
 *     vs a LONGER narration beat — at two operating points:
 *        - WASM + q8   (~92 MB, the issue's intended small/universal path)
 *        - WebGPU + fp32 (~326 MB, the "near real-time" fast path)
 *  3. Warmth: plays the audio so a human can hear it isn't robotic.
 *
 * Next 16 notes (mirrors app/spike-rive/page.tsx):
 *  - 'use client' at top = correct SSR boundary; this never runs on the server.
 *  - kokoro-js is imported DYNAMICALLY inside the handler so it stays out of the initial
 *    bundle and only resolves client-side. onnxruntime-web fetches its .wasm at runtime
 *    (like Rive) — no build-time wasm config expected.
 *
 * All timings are console.log'd tagged [KOKORO-SPIKE] for grep + shown on-page.
 */

import { useState } from 'react'

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const VOICE = 'af_heart' // a warm default; voice selection is out of scope this session
const SHORT_ACK = 'Ooh, fun idea! Let me build that for you!' // ~8 words — the instant ack
const LONG_BEAT =
  'I added a big green start button and made the score count up every time you tap the ball. Want me to add a wiggly cheer when you win?' // ~30 words

type Row = { label: string; ms: number }

export default function SpikeKokoroPage() {
  const [log, setLog] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voices, setVoices] = useState<string>('')

  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator

  function say(line: string) {
    // eslint-disable-next-line no-console
    console.log('[KOKORO-SPIKE]', line)
    setRows((r) => [...r]) // no-op to keep React happy if called in tight loop
    setLog((l) => [...l, line])
  }

  async function bench(device: 'wasm' | 'webgpu', dtype: string) {
    setBusy(true)
    setRows([])
    setAudioUrl(null)
    const tag = `${device}/${dtype}`
    try {
      say(`loading model ${tag} (${MODEL_ID}) — first load downloads the weights…`)
      const t0 = performance.now()
      const { KokoroTTS } = await import('kokoro-js')
      const imported = performance.now() - t0
      say(`import("kokoro-js") resolved in ${Math.round(imported)}ms`)

      const tLoad = performance.now()
      // @ts-expect-error device/dtype are runtime-validated strings
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device })
      const loadMs = performance.now() - tLoad
      say(`✅ from_pretrained(${tag}) COLD load = ${Math.round(loadMs)}ms`)
      setRows((r) => [...r, { label: `cold load ${tag}`, ms: loadMs }])

      try {
        const v = (tts as { list_voices?: () => unknown }).list_voices?.()
        const names = v ? Object.keys(v as Record<string, unknown>) : []
        setVoices(names.join(', '))
        say(`voices (${names.length}): ${names.slice(0, 12).join(', ')}…`)
      } catch {
        /* voices list is best-effort */
      }

      // Pre-warm: one throwaway synth so the first measured run isn't paying init cost.
      const tWarm = performance.now()
      await tts.generate('Warming up.', { voice: VOICE })
      say(`pre-warm synth = ${Math.round(performance.now() - tWarm)}ms`)

      // Measure WARM latency: 3 runs each, report min (steady-state best case).
      for (const [name, text] of [
        ['SHORT ack', SHORT_ACK],
        ['LONG beat', LONG_BEAT],
      ] as const) {
        const samples: number[] = []
        let lastAudio: { toBlob: () => Blob } | null = null
        for (let i = 0; i < 3; i++) {
          const s = performance.now()
          const audio = await tts.generate(text, { voice: VOICE })
          samples.push(performance.now() - s)
          lastAudio = audio as unknown as { toBlob: () => Blob }
        }
        const min = Math.min(...samples)
        const median = [...samples].sort((a, b) => a - b)[1]
        say(
          `WARM ${name} (${tag}): min=${Math.round(min)}ms median=${Math.round(
            median,
          )}ms  [${samples.map((x) => Math.round(x)).join(', ')}]`,
        )
        setRows((r) => [...r, { label: `warm ${name} ${tag}`, ms: min }])
        if (name === 'SHORT ack' && lastAudio) {
          const url = URL.createObjectURL(lastAudio.toBlob())
          setAudioUrl(url)
        }
      }
      say(`DONE ${tag}. ▶ press play to hear the SHORT ack (warmth check).`)
    } catch (e) {
      say(`❌ FAIL ${tag}: ${(e as Error)?.message ?? String(e)}`)
      // eslint-disable-next-line no-console
      console.error('[KOKORO-SPIKE] error', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 820 }}>
      <h1>Kokoro.js keystone spike (#24)</h1>
      <p>
        WebGPU available: <strong>{webgpu ? 'yes' : 'no'}</strong>. Pass line: warm SHORT-ack
        synth ≤ ~250ms ⇒ all-Kokoro; 250ms–1s ⇒ hybrid (Web-Speech ack + Kokoro narration);
        multi-second ⇒ rethink.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '1rem 0' }}>
        <button onClick={() => bench('wasm', 'q8')} disabled={busy} style={btn}>
          Load + bench WASM / q8 (~92 MB)
        </button>
        <button
          onClick={() => bench('webgpu', 'fp32')}
          disabled={busy || !webgpu}
          style={btn}
          title={webgpu ? '' : 'no WebGPU in this browser'}
        >
          Load + bench WebGPU / fp32 (~326 MB)
        </button>
      </div>

      {audioUrl && (
        <div style={{ margin: '1rem 0' }}>
          <audio src={audioUrl} controls autoPlay />
          <div style={{ fontSize: 13, color: '#555' }}>↑ the SHORT ack — does it sound warm?</div>
        </div>
      )}

      {rows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', margin: '1rem 0' }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: '2px 12px 2px 0' }}>{r.label}</td>
                <td style={{ padding: '2px 0', fontWeight: 700 }}>{Math.round(r.ms)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {voices && (
        <p style={{ fontSize: 12, color: '#666' }}>
          voices: <code>{voices}</code>
        </p>
      )}

      <pre
        style={{
          background: '#0b0b0b',
          color: '#7CFC00',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          minHeight: 80,
        }}
      >
        {log.join('\n') || '(press a button — watch the console too, tagged [KOKORO-SPIKE])'}
      </pre>
    </main>
  )
}

const btn: React.CSSProperties = {
  padding: '0.6rem 1.1rem',
  fontSize: '1rem',
  cursor: 'pointer',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#fafafa',
}
