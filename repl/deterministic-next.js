// Deterministic seeded REPL runner for regression fixtures (TS core / src-next).
// Runs one full life (talents → properties → trajectory → summary → inherit)
// with a mulberry32 PRNG keyed on seed; outputs cleaned (ANSI-stripped) text.
// Temporary harness for Task 15 regression — deleted in Task 24.

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

globalThis.localStorage = {
  getItem: key => globalThis.localStorage[key] ?? null,
  setItem: (key, val) => { globalThis.localStorage[key] = val },
}

// app-next.js calls this bare during remake() when talent inherit is set.
// In-memory run → no-op write is the right stub.
globalThis.dumpLocalStorage = () => {}

// Seeded PRNG: mulberry32
function mulberry32(a) {
  return function() {
    a |= 0
    a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const seedArg = process.argv[2] ?? '42'
const seed = Number(seedArg)
if (Number.isNaN(seed)) {
  console.error(`Invalid seed: ${seedArg}`)
  process.exit(1)
}
Math.random = mulberry32(seed)  // Override BEFORE loading App so core modules inherit it

const { default: App } = await import('./app-next.js')

const outputs = []
const app = new App()
app.io(
  () => {},
  (data) => outputs.push(String(data)),
  () => {}
)
await app.initial()

function run(cmd) {
  const ret = app.repl(cmd)
  if (!ret) return
  if (typeof ret === 'string') outputs.push(ret)
  else if (Array.isArray(ret)) outputs.push(ret.join('\n'))
  else if (ret.message) outputs.push(ret.message)
}

// Fixed prologue: pick talents + allocate properties
run('/remake')
run('/random')   // pick 3 random talents
run('/next')     // → PROPERTY step
run('/random')   // random property allocation
run('/next')     // → TRAJECTORY step (begin life)

// Drive trajectory until summary is reached.
// Life spans are bounded (max human age ~120, plus seeded early death),
// so 500 is a generous upper bound.
const MAX_TICKS = 500
let reachedSummary = false
for (let i = 0; i < MAX_TICKS; i++) {
  const before = outputs.length
  run('/next')
  // summary() returns a multi-line string starting with "🎉 总评"
  const delta = outputs.slice(before).join('\n')
  if (delta.includes('总评')) {
    reachedSummary = true
    break
  }
}
if (!reachedSummary) {
  console.error(`Summary not reached within ${MAX_TICKS} trajectory ticks`)
  process.exit(1)
}

// Summary epilogue: inherit a random talent + finalize
run('/random')  // pick random inherit target
run('/next')    // finalize → back to TALENT for a fresh game (remake)

// Strip CSI sequences for stable cross-platform diff.
// (OSC/charset sequences not emitted by current repl, so not stripped.)
const clean = outputs.join('\n').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
process.stdout.write(clean)
