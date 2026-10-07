import { PodliteWebPlugin, publishRecord } from '@podlite/publisher'
import { Prepared } from './mounts'

// The tests of a specification live in its t/ and come onto a page only by an
// include. They leave the records at the start of the main chain, before its
// plugins link to them, list them or put them in the site data; a site's own
// plugin runs earlier and still sees them. An include finds them among the files
// the site read.
const plugin = (mounts: Prepared[]): PodliteWebPlugin => {
  const dirs = mounts.map(m => m.dir).filter((dir): dir is string => Boolean(dir)).map(dir => `${dir}/t/`)
  const onProcess = (recs: publishRecord[]) => recs.filter(r => !dirs.some(dir => r.file.startsWith(dir)))
  return [onProcess, ctx => ({ ...ctx })]
}

export default plugin
