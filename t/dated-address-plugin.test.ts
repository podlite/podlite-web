import { processPlugin, publishRecord } from '@podlite/publisher'
import { processFile } from '@podlite/publisher/node'
import datedAddressPlugin from '../bin/dated-address-plugin'
import mountPrefixPlugin from '../bin/mount-prefix-plugin'
import { Prepared } from '../bin/mounts'

const doc = (file: string, attrs: string, title: string) =>
  processFile(file, `=begin pod ${attrs}\n=TITLE ${title}\n=para Text\n=end pod\n`) as publishRecord

// the plugin must give new records, not change the ones it is handed
const frozen = (value: any): any => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(frozen)
  }
  return value
}

const run = (plugin: any, records: publishRecord[]) =>
  processPlugin({ plugin, includePatterns: '.*' }, records, { testing: true })[0]
const address = (records: publishRecord[]) => run(datedAddressPlugin(), frozen(records))
const at = (records: publishRecord[], file: string) => records.find(r => r.file === file) as any

describe('a dated document with no address of its own, under --preset everything', () => {
  it('gets the address and the short address pubdate gives it', () => {
    const before = doc('site/blog-post.podlite', ":pubdate('2022-08-06 23:00:00')", 'Blog post')
    const [post]: any[] = address([before])
    expect(post.publishUrl).toBe('/2022/8/6/1/blog-post')
    expect(post.shortUrl).toBe('/a5LA1')
    expect(post.sources).toEqual(['/a5LA1'])
    expect(post.file).toBe(before.file)
    expect(post.pubdate).toBe(before.pubdate)
    expect(post.isPage).toBe(before.isPage)
    expect(post.node).toBe(before.node)
  })

  it('leaves a document with its own address and a document with no date as they are', () => {
    const own = doc('site/about.podlite', ":pubdate('2022-08-05 23:00:00') :puburl</about>", 'About')
    const undated = doc('site/notes.podlite', '', 'Notes')
    const out = address([own, undated])
    expect(out[0]).toBe(own)
    expect(out[1]).toBe(undated)
    expect(out[1].publishUrl).toBeFalsy()
  })

  it('addresses a document dated in the future too', () => {
    const [later] = address([doc('site/later.podlite', ":pubdate('2999-08-06 12:00:00')", 'Later')])
    expect(later.publishUrl).toBe('/2999/8/6/1/later')
  })

  it('numbers the documents of a day in the order of their dates, and a day of its own from one', () => {
    const out = address([
      doc('site/evening.podlite', ":pubdate('2022-08-06 21:00:00')", 'Evening'),
      doc('site/next-day.podlite', ":pubdate('2022-08-07 10:00:00')", 'Next day'),
      doc('site/about.podlite', ":pubdate('2022-08-06 08:00:00') :puburl</about>", 'About'),
      doc('site/morning.podlite', ":pubdate('2022-08-06 09:00:00')", 'Morning'),
    ])
    expect(out.map(r => [r.file, r.publishUrl])).toEqual([
      ['site/evening.podlite', '/2022/8/6/2/evening'],
      ['site/next-day.podlite', '/2022/8/7/1/next-day'],
      ['site/about.podlite', '/about'],
      ['site/morning.podlite', '/2022/8/6/1/morning'],
    ])
  })

  it('gets the address before the section of a mounted source is added to it', () => {
    const mount = {
      name: 'docs',
      repo: 'r',
      ref: 'main',
      dir: '.mounts/docs',
      prefix: '/docs',
      sha: null,
      from: 'cache',
    } as Prepared
    const records = address([doc('.mounts/docs/mounted.podlite', ":pubdate('2022-08-07 10:00:00')", 'Mounted')])
    expect(run(mountPrefixPlugin([mount]), records)[0].publishUrl).toBe('/docs/2022/8/7/1/mounted')
  })
})
