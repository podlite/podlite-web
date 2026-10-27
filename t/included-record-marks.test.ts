import { getFromTree, makeAttrs, PodNode } from '@podlite/schema'
import { processPlugin, publishRecord } from '@podlite/publisher'
import { processFile } from '@podlite/publisher/node'
import { includePasses } from '@podlite/publisher/lib/include-resolve-plugin'
import specVersionsPlugin, { VersionInfo } from '../bin/spec-versions-plugin'
import indexingPolicyPlugin, { INDEX_FIELD } from '../bin/indexing-policy-plugin'

const version = (prefix: string, state: VersionInfo['state']): VersionInfo => ({
  prefix,
  mount: prefix,
  label: prefix,
  dir: `.mounts/${prefix}`,
  ref: 'main',
  state,
  index: state !== 'upcoming',
  url: `/${prefix}`,
})

const run = (plugin: any, records: publishRecord[]) =>
  processPlugin({ plugin, includePatterns: '.*' }, records, { testing: true })[0]

// the versions plugin, the indexing policy and the first pass of includes, in the
// order the site runs them; the catalogue is the records as the files have them
const build = (versions: VersionInfo[], files: Record<string, string>) => {
  const items = Object.keys(files).map(file => ({
    ...processFile(file, files[file]),
    publishUrl: '/' + file.replace(/^.*\//, '').replace(/\..*$/, ''),
  }))
  const marked = run(indexingPolicyPlugin(), run(specVersionsPlugin({ versions, builtPath: '' }), items))
  return run(includePasses({ catalogue: items, bounds: versions.map(v => v.dir) }).first, marked)
}

const at = (records: publishRecord[], publishUrl: string) => records.find(r => r.publishUrl === publishUrl) as any

// a mark counts when its value is true: a mark turned false is a mark lost
const marks = (attrs: ReturnType<typeof makeAttrs>, names: string[]) =>
  names.filter(name => attrs.getFirstValue(name) === true)

// the id and the two marks of every pod block of a page, the included one second
const pods = (record: publishRecord) =>
  getFromTree(record.node as PodNode, 'pod').map(pod => {
    const attrs = makeAttrs(pod, {})
    return [`id=${attrs.getFirstValue('id')}`, ...marks(attrs, ['noindex', 'nosearch'])]
  })

const checked = (record: publishRecord) =>
  getFromTree(record.node as PodNode, 'para').map(para => {
    const attrs = makeAttrs(para, {})
    return [`id=${attrs.getFirstValue('id')}`, ...marks(attrs, ['checked'])]
  })

const host = '=begin pod :id<host>\n=include file:./part.podlite\n=end pod\n'
const part = '=begin pod :id<part>\n=for para :id<p1> :checked\nPart\n=end pod\n'

describe('a page that includes a record the versions plugin marks', () => {
  it('keeps its own address and marks, and brings the included record as its text has it', () => {
    const out = build([version('v3', 'current')], { '.mounts/v3/host.podlite': host, '.mounts/v3/part.podlite': part })
    expect(pods(at(out, '/v3/part'))).toEqual([['id=part', 'noindex', 'nosearch']])

    const current = at(out, '/host')
    expect(current.pluginsData.version).toMatchObject({ role: 'current', canonical: '/host' })
    expect(current[INDEX_FIELD]).toEqual({ robots: true, search: true })
    expect(pods(current)).toEqual([['id=host'], ['id=part']])
    expect(checked(current)).toEqual([['id=p1', 'checked']])

    const permalink = at(out, '/v3/host')
    expect(permalink.pluginsData.version).toMatchObject({ role: 'permalink', canonical: '/host' })
    expect(permalink[INDEX_FIELD]).toEqual({ robots: false, search: false })
    expect(pods(permalink)).toEqual([['id=host', 'noindex', 'nosearch'], ['id=part']])
    expect(checked(permalink)).toEqual([['id=p1', 'checked']])
  })

  it('brings a record of an upcoming version into a page outside the versions without its marks', () => {
    const out = build([version('v4', 'upcoming')], {
      'pub/host.podlite': host.replace('./part.podlite', '../.mounts/v4/part.podlite'),
      '.mounts/v4/part.podlite': part,
    })
    expect(pods(at(out, '/v4/part'))).toEqual([['id=part', 'noindex', 'nosearch']])
    const page = at(out, '/host')
    expect(page.pluginsData?.version).toBeUndefined()
    expect(page[INDEX_FIELD]).toEqual({ robots: true, search: true })
    expect(pods(page)).toEqual([['id=host'], ['id=part']])
    expect(checked(page)).toEqual([['id=p1', 'checked']])
  })

  it('keeps the noindex and nosearch the author wrote on the included record', () => {
    const own = part.replace(':id<part>', ':id<part> :noindex :nosearch')
    const out = build([version('v3', 'current')], { '.mounts/v3/host.podlite': host, '.mounts/v3/part.podlite': own })
    const current = at(out, '/host')
    expect(current[INDEX_FIELD]).toEqual({ robots: true, search: true })
    expect(pods(current)).toEqual([['id=host'], ['id=part', 'noindex', 'nosearch']])
  })
})
