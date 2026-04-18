import { readFile } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// On regression failure, an engineer can dump `actual` to
// tests/fixtures/repl-seed-<seed>.actual.txt (gitignored) and diff
// against the committed baseline for manual inspection.
export async function runSeed(seed, script = 'repl/deterministic.js', executor = 'node') {
  return new Promise((resolve, reject) => {
    const p = spawn(executor, [script, String(seed)], { cwd: root })
    let stdout = ''
    let stderr = ''
    p.stdout.on('data', d => stdout += d)
    p.stderr.on('data', d => stderr += d)
    p.on('error', err => reject(new Error(`spawn failed: ${err.message}`)))
    p.on('close', code => {
      if (code !== 0) return reject(new Error(`exit ${code}: ${stderr}`))
      resolve(stdout)
    })
  })
}

export async function readFixture(seed) {
  return await readFile(join(root, `tests/fixtures/repl-seed-${seed}.txt`), 'utf8')
}
