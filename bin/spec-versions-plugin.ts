import { PodliteWebPlugin, PodliteWebPluginContext, processFile, publishRecord } from '@podlite/publisher'
import * as fs from 'fs'
import * as path from 'path'
import { Prepared, readSiteConfig } from './mounts'

export const ARTIFACT_NAME = 'versions.json'

type VersionEntry = {
  prefix: string
  mount: string
  label?: string
  index?: boolean
  state?: 'upcoming' | 'past'
}

export type VersionInfo = {
  prefix: string
  mount: string
  label: string
  dir: string
  ref: string
  state: 'current' | 'upcoming' | 'past'
  index: boolean
  url: string
  sourceUrl?: string
  sha?: string
}

// A version names the mount it is built from; where that mount sits on disk is
// the business of the step that prepared it.
export const readVersions = (contentDir: string, mounts: Prepared[]): VersionInfo[] => {
  const { versions } = readSiteConfig(contentDir)
  if (!versions || !versions.entries?.length) return []
  const entries: VersionEntry[] = versions.entries
  const currentAt = entries.findIndex(v => v.prefix === versions.default)
  if (currentAt < 0) {
    throw new Error(`podlite-web.config.js: default "${versions.default}" is not among the declared versions`)
  }
  return entries
    .map((entry, at) => {
      const mount = mounts.find(m => m.name === entry.mount)
      if (!mount) {
        throw new Error(`podlite-web.config.js: version "${entry.prefix}" names mount "${entry.mount}", which is not declared`)
      }
      // A version whose optional mount was skipped is left out of the list: a
      // picker that offers it would link to an address that answers with nothing.
      if (!mount.dir) {
        console.warn(`version ${entry.prefix} is left out: its mount "${entry.mount}" is not available`)
        return null
      }
      const isCurrent = at === currentAt
      // The list is read the way time runs: oldest first, newest last. So what
      // stands after the current version is not released yet, what stands before
      // it has been superseded.
      const state = isCurrent ? 'current' : entry.state || (at > currentAt ? 'upcoming' : 'past')
      return {
        prefix: entry.prefix,
        mount: entry.mount,
        label: entry.label || entry.prefix,
        dir: mount.dir,
        ref: mount.ref,
        state,
        index: entry.index !== undefined ? entry.index : state !== 'upcoming',
        url: `/${entry.prefix}`,
        sourceUrl: `${mount.repo.replace(/\.git$/, '')}/tree/${mount.ref}`,
        sha: mount.sha || undefined,
      } as VersionInfo
    })
    .filter(Boolean) as VersionInfo[]
}

// The attribute goes into the record's tree, not into the file. The copy is
// structural down to the pod block: the twin of a page shares the same tree, and
// pushing into it would mark the original too.
const withAttrs = (item: publishRecord, names: string[]): publishRecord => {
  if (!names.length) return item
  const content = [...(item.node.content || [])]
  const at = content.findIndex((n: any) => n && n.name === 'pod')
  if (at < 0) return item
  const pod: any = content[at]
  content[at] = { ...pod, config: [...(pod.config || []), ...names.map(name => ({ name, value: true, type: 'boolean' }))] }
  return { ...item, node: { ...item.node, content } }
}

const versionOf = (file: string, versions: VersionInfo[]) => versions.find(v => file.startsWith(`${v.dir}/`))

type Params = { versions: VersionInfo[]; builtPath: string }

const plugin = ({ versions, builtPath }: Params): PodliteWebPlugin => {
  const outCtx: PodliteWebPluginContext = {}
  const mark = (item: publishRecord, version: VersionInfo, extra: object) => ({
    ...item,
    pluginsData: {
      ...(item.pluginsData || {}),
      version: {
        prefix: version.prefix,
        label: version.label,
        state: version.state,
        ref: version.ref,
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
      const version = versionOf(item.file, versions)
      if (!version || !item.publishUrl) {
        out.push(item)
        continue
      }
      const versioned = `${version.url}${item.publishUrl}`
      if (version.state === 'current') {
        // The current version answers at the address it declares, and once more
        // at its own permanent one. The second copy points its canonical link at
        // the first, so the two never compete as separate documents.
        out.push(mark(item, version, { role: 'current', canonical: item.publishUrl }))
        out.push(
          mark(withAttrs({ ...item, publishUrl: versioned }, ['noindex', 'nosearch']), version, {
            role: 'permalink',
            canonical: item.publishUrl,
          }),
        )
        continue
      }
      // a superseded version stays findable by a search engine and out of the
      // search on the site, where it would answer next to the current one
      const closed = version.state === 'upcoming' ? ['noindex', 'nosearch'] : version.index ? ['nosearch'] : ['noindex', 'nosearch']
      out.push(
        mark(withAttrs({ ...item, publishUrl: versioned }, closed), version, {
          role: version.state,
          canonical: versioned,
        }),
      )
    }

    // A declared version that produced no page would still be listed by the
    // picker, and its link would answer with nothing. That happens when the
    // source of a version does not parse the way the current toolchain reads it,
    // and it happens without a word, so the build says it here instead.
    const empty = versions.filter(v => !out.some(r => r.pluginsData?.version?.prefix === v.prefix))
    if (empty.length) {
      throw new Error(
        `${empty.map(v => `"${v.prefix}" (${v.dir})`).join(', ')} produced no page. ` +
          `The checkout is there, so the source is read differently than the current toolchain expects.`,
      )
    }

    const listed = versions.map(({ ref, prefix, label, state, index, sha, sourceUrl }, at) => ({
      ref,
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
      const artifact = { versions: outCtx.specVersions || [] }
      fs.writeFileSync(path.join(builtPath, ARTIFACT_NAME), JSON.stringify(artifact))
    }
    return { ...ctx, ...outCtx }
  }
  return [onProcess, onExit]
}

export default plugin
