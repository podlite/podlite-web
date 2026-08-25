import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export const CACHE_DIR = '.mounts'
export const MANIFEST = 'index.json'

export type Mount = {
  name: string
  repo: string
  ref: string
  required?: boolean
}

export type Prepared = Mount & {
  dir: string | null
  sha: string | null
  from: 'clone' | 'cache' | 'skipped'
}

const configPath = (contentDir: string) => path.resolve(process.cwd(), `${contentDir}/podlite-web.config.js`)

export const readSiteConfig = (contentDir: string): { mounts?: Mount[]; versions?: any } => {
  const file = configPath(contentDir)
  if (!fs.existsSync(file)) return {}
  return require(file)
}

const shaOf = (dir: string): string | null => {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const shaOfRef = (repo: string, ref: string): string | null => {
  try {
    const out = execFileSync('git', ['ls-remote', repo, ref], { encoding: 'utf8' })
    return out.split('\t')[0] || null
  } catch {
    return null
  }
}

const clone = (m: Mount, dir: string): Prepared => {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(dir), { recursive: true })
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', m.ref, '--single-branch', m.repo, dir])
  return { ...m, dir, sha: shaOf(dir), from: 'clone' }
}

// A build container starts empty, so the first branch is the usual one and the
// network is asked nothing beyond the clone itself. A checkout is only there
// when the same tree is built twice, which happens on the author's machine.
const prepareOne = (m: Mount, dir: string, offline: boolean): Prepared => {
  const have = fs.existsSync(path.join(dir, '.git'))
  if (offline) {
    if (!have) throw new Error('no checkout to build from, and the network is not to be used')
    return { ...m, dir, sha: shaOf(dir), from: 'cache' }
  }
  if (!have) return clone(m, dir)
  const remote = shaOfRef(m.repo, m.ref)
  if (remote && remote !== shaOf(dir)) return clone(m, dir)
  return { ...m, dir, sha: shaOf(dir), from: 'cache' }
}

const report = (prepared: Prepared[]) => {
  for (const m of prepared) {
    const where = m.from === 'skipped' ? 'not available' : `${m.sha?.slice(0, 7)} from ${m.from}`
    console.log(`mount ${m.name}: ${m.ref}, ${where}`)
  }
}

export const prepareMounts = (contentDir: string, offline = false): Prepared[] => {
  const { mounts = [] } = readSiteConfig(contentDir)
  if (!mounts.length) return []

  const prepared = mounts.map(m => {
    const dir = path.join(CACHE_DIR, m.name)
    try {
      return prepareOne(m, dir, offline)
    } catch (e) {
      // A source the site cannot do without stops the build; an optional one is
      // skipped, but never silently: the line below and the manifest both say so.
      if (m.required !== false) {
        throw new Error(`mount "${m.name}" (${m.ref} of ${m.repo}) could not be prepared: ${(e as Error).message}`)
      }
      return { ...m, dir: null, sha: null, from: 'skipped' as const }
    }
  })

  report(prepared)
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, MANIFEST), JSON.stringify(prepared, null, 2))
  return prepared
}
