import { PodliteWebPlugin, publishRecord } from '@podlite/publisher'
import { getFromTree, makeAttrs } from '@podlite/schema'

export const INDEX_FIELD = 'indexing'

export type Indexing = {
  robots: boolean
  search: boolean
}

// Both keys are always there, so whoever reads the field never has to tell a
// missing answer from a negative one.
const declared = (item: publishRecord): Indexing => {
  const [pod] = getFromTree(item.node, 'pod')
  if (!pod) return { robots: true, search: true }
  const attrs = makeAttrs(pod, {})
  return {
    robots: !attrs.getFirstValue('noindex'),
    search: !attrs.getFirstValue('nosearch'),
  }
}

const plugin = (): PodliteWebPlugin => {
  const onProcess = (recs: publishRecord[]) => recs.map(item => ({ ...item, [INDEX_FIELD]: declared(item) }))
  return [onProcess, ctx => ({ ...ctx })]
}

export default plugin
