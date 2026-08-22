import { PodliteWebPlugin, PodliteWebPluginContext, processFile, publishRecord } from '@podlite/publisher'
import * as fs from 'fs'
import * as path from 'path'

export const CONFIG_NAME = 'spec-versions.json'
export const ARTIFACT_NAME = 'versions.json'

type VersionEntry = {
  prefix: string
  ref: string
  label?: string
  index?: boolean
  state?: 'upcoming' | 'past'
}

type VersionsConfig = {
  repo?: string
  default: string
  versions: VersionEntry[]
}

export type VersionInfo = {
  ref: string
  refName: string
  prefix: string
  label: string
  dir: string
  state: 'current' | 'upcoming' | 'past'
  index: boolean
  url: string
  sourceUrl?: string
  sha?: string
}

// The default version keeps the directory the build has always used, so the
// change guard, which reads the commit of pub/spec, goes on working unchanged.
const DEFAULT_DIR = 'spec'
const dirFor = (prefix: string, isCurrent: boolean) => (isCurrent ? DEFAULT_DIR : `${DEFAULT_DIR}--${prefix}`)

// A ref may be written as a github address, so that it can be pasted from the
// browser. Everything after /tree/ is the ref name: a name may contain slashes
// and a path inside the repository cannot be told from one, so paths are not
// accepted. A release address carries the tag after /releases/tag/.
const parseRef = (ref: string): { refName: string; repo?: string } => {
  const asUrl = ref.match(/^https?:\/\/[^/]+\/([^/]+\/[^/]+?)(?:\.git)?\/(?:tree|releases\/tag)\/(.+)$/)
  if (!asUrl) return { refName: ref }
  const [, owner, name] = asUrl
  return { refName: name.replace(/\/$/, ''), repo: `https://github.com/${owner}` }
}

// A checkout carries its commit in .git; reading it avoids spawning git in the
// build image, where the directory may be a shallow clone.
const shaOf = (dir: string): string | undefined => {
  try {
    const head = fs.readFileSync(path.join(dir, '.git', 'HEAD'), 'utf8').trim()
    if (!head.startsWith('ref:')) return head
    const ref = head.slice(4).trim()
    const direct = path.join(dir, '.git', ref)
    if (fs.existsSync(direct)) return fs.readFileSync(direct, 'utf8').trim()
    const packed = path.join(dir, '.git', 'packed-refs')
    if (!fs.existsSync(packed)) return undefined
    const line = fs
      .readFileSync(packed, 'utf8')
      .split('\n')
      .find(l => l.endsWith(` ${ref}`))
    return line ? line.split(' ')[0] : undefined
  } catch {
    return undefined
  }
}

export const readVersions = (contentDir: string): VersionInfo[] => {
  const configPath = path.join(contentDir, CONFIG_NAME)
  if (!fs.existsSync(configPath)) return []
  const config: VersionsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  // The current version is named by its prefix, which is what the address and
  // the picker are built from; naming it by ref is accepted as well.
  const currentAt = config.versions.findIndex(v => v.prefix === config.default || v.ref === config.default)
  if (currentAt < 0) {
    throw new Error(`${CONFIG_NAME}: default "${config.default}" is not among the declared versions`)
  }
  return config.versions.map((entry, at) => {
    const { refName, repo } = parseRef(entry.ref)
    const prefix = entry.prefix
    if (!prefix) throw new Error(`${CONFIG_NAME}: entry "${entry.ref}" has no prefix`)
    const isCurrent = at === currentAt
    // The list is read the way time runs: oldest first, newest last. So what
    // stands after the current version is not released yet, what stands before
    // it has been superseded.
    const state = isCurrent ? 'current' : entry.state || (at > currentAt ? 'upcoming' : 'past')
    const dir = dirFor(prefix, isCurrent)
    const home = repo || config.repo
    return {
      ref: entry.ref,
      refName,
      prefix,
      label: entry.label || prefix,
      dir,
      state,
      index: entry.index !== undefined ? entry.index : state !== 'upcoming',
      url: `/${prefix}`,
      sourceUrl: home ? `${home}/tree/${refName}` : undefined,
      sha: shaOf(path.join(contentDir, dir)),
    }
  })
}

const versionOf = (file: string, contentDir: string, versions: VersionInfo[]) =>
  versions.find(v => file.startsWith(`${contentDir}/${v.dir}/`) || file.includes(`/${v.dir}/`))

type Params = { contentDir: string; versions: VersionInfo[]; builtPath: string }

const plugin = ({ contentDir, versions, builtPath }: Params): PodliteWebPlugin => {
  const outCtx: PodliteWebPluginContext = {}
  // Addresses that answer with a document asking to stay out of the index. The
  // page index carries named fields only, and what a plugin knows about a record
  // cannot be found there later, so it is written out next to it.
  const noindex: string[] = []

  const mark = (item: publishRecord, version: VersionInfo, extra: object) => ({
    ...item,
    pluginsData: {
      ...(item.pluginsData || {}),
      version: {
        prefix: version.prefix,
        label: version.label,
        state: version.state,
        ref: version.refName,
        sha: version.sha,
        sourceUrl: version.sourceUrl,
        ...extra,
      },
    },
  })

  const onProcess = (recs: publishRecord[]) => {
    if (!versions.length) return recs

    const out: publishRecord[] = []
    for (const item of recs) {
      const version = versionOf(item.file, contentDir, versions)
      if (!version || !item.publishUrl) {
        out.push(item)
        continue
      }
      const versioned = `${version.url}${item.publishUrl}`
      if (version.state === 'current') {
        // The current version answers at the address it declares, and once more
        // at its own permanent one. The second copy points its canonical link at
        // the first, so the two never compete as separate documents.
        out.push(mark(item, version, { role: 'current', canonical: item.publishUrl, index: true }))
        out.push(
          mark({ ...item, publishUrl: versioned }, version, {
            role: 'permalink',
            canonical: item.publishUrl,
            index: false,
          }),
        )
        noindex.push(versioned)
        continue
      }
      out.push(
        mark({ ...item, publishUrl: versioned }, version, {
          role: version.state,
          canonical: versioned,
          index: version.index,
        }),
      )
      if (!version.index) noindex.push(versioned)
    }

    const listed = versions.map(({ refName, prefix, label, state, index, sha, sourceUrl }, at) => ({
      ref: refName,
      prefix,
      label,
      state,
      index,
      sha,
      sourceUrl,
      order: at,
    }))
    outCtx.specVersions = listed

    const doc = `
=begin pod
=for NAME :id<SPEC_VERSIONS>
SPEC VERSIONS
=begin data :id<versions>
${JSON.stringify(listed)}
=end data
=end pod
`
    out.push(processFile('virtual/spec-versions-plugin.podlite', doc) as unknown as publishRecord)
    return out
  }

  // The artifact is written on every build, empty list included: a site that
  // drops its version config would otherwise keep the previous run's answer.
  const onExit = ctx => {
    if (!ctx.testing) {
      const artifact = { versions: outCtx.specVersions || [], noindex }
      fs.writeFileSync(path.join(builtPath, ARTIFACT_NAME), JSON.stringify(artifact))
    }
    return { ...ctx, ...outCtx }
  }
  return [onProcess, onExit]
}

export default plugin
