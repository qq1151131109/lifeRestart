import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

globalThis.localStorage = {
  getItem: key => globalThis.localStorage[key] ?? null,
  setItem: (key, val) => { globalThis.localStorage[key] = val },
}

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

const seed = Number(process.argv[2] ?? 42)
const rng = mulberry32(seed)
Math.random = rng  // Override global before loading App

const { default: App } = await import('./app.js')

const outputs = []
const app = new App()
app.io(
  () => {},  // no input
  (data, isRepl) => outputs.push(String(data)),
  () => {}
)
await app.initial()

const commands = [
  '/remake',
  '/random',       // random talent pick
  '/next',         // move to property step
  '/random',       // random property alloc
  '/next',         // start trajectory
]
for (let i = 0; i < 120; i++) commands.push('/next')  // advance 120 "next"s (handles end-of-life naturally)
commands.push('/next')  // enter summary
commands.push('/random')  // pick random talent extend
commands.push('/next')  // finalize

for (const c of commands) {
  const ret = app.repl(c)
  if (!ret) continue
  if (typeof ret === 'string') outputs.push(ret)
  else if (Array.isArray(ret)) outputs.push(ret.join('\n'))
  else outputs.push(ret.message)
}

// Strip ANSI color codes for stable diff
const clean = outputs.join('\n').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
process.stdout.write(clean)
