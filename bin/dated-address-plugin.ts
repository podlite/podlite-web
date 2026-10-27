import { PodliteWebPlugin, addUrl, publishRecord } from '@podlite/publisher'

// Under --preset everything a document with a publication date and no :puburl gets
// the address the pubdate preset gives it: /year/month/day/number/slug, with the
// short address it is also reached at. The pubdate plugin itself is not run here:
// it splits dated paragraphs and headings into pages of their own and drops what
// is dated in the future or not dated at all, which is not what everything does.
// Records are numbered within a day in the order of their dates, as there.
const plugin = (): PodliteWebPlugin => {
  const onProcess = (recs: publishRecord[]) => {
    const dated = recs
      .map((record, at) => ({ record, at }))
      .filter(({ record }) => record.pubdate && !record.publishUrl)
      .sort((a, b) => new Date(a.record.pubdate as any).getTime() - new Date(b.record.pubdate as any).getTime())
    if (!dated.length) return recs
    const addressed = addUrl(dated.map(({ record }) => record))
    const out = [...recs]
    dated.forEach(({ at }, i) => {
      out[at] = addressed[i] as publishRecord
    })
    return out
  }
  return [onProcess, ctx => ({ ...ctx })]
}

export default plugin
