import { PodliteWebPlugin, publishRecord } from '@podlite/publisher'
import { Prepared } from './mounts'

// A mounted source may be given a section of the site. The address itself is
// settled earlier by the pubdate plugin, which reads it from the document again,
// so the section is applied here rather than before the chain.
const plugin = (mounts: Prepared[]): PodliteWebPlugin => {
  const under = (file: string) => mounts.find(m => m.prefix && m.dir && file.startsWith(`${m.dir}/`))
  const onProcess = (recs: publishRecord[]) =>
    recs.map(r => {
      const m = under(r.file)
      return m && r.publishUrl ? { ...r, publishUrl: `${m.prefix}${r.publishUrl}` } : r
    })
  return [onProcess, ctx => ({ ...ctx })]
}

export default plugin
