import { absoluteUrl, absoluteUrlForXml } from '../src/absolute-url'
import { structuredData } from '../src/structured-data'

// WB-55: nine places used to paste the site URL and the route together by hand.
// They now all go through one function, and these cases pin down which of them
// are required to agree with which. Nine splices do not mean nine equal values:
// the page address, the image address and the feed's own address are three
// different things.

const SITE = 'https://raku-knowledge-base.podlite.org'
const ROUTE = '/mods/all/Raku doc/README.md'
const ENCODED = '/mods/all/Raku%20doc/README.md'

describe('the page address, everywhere it appears', () => {
  const pageUrl = absoluteUrl(SITE, ROUTE)

  it('is encoded once', () => {
    expect(pageUrl).toBe(SITE + ENCODED)
  })

  it('reaches structured data unchanged', () => {
    const jsonLd = structuredData({
      item: {},
      title: 'Site',
      pageTitle: 'Page',
      description: 'about',
      pageUrl,
      siteTitle: 'Site',
      siteUrl: SITE,
    } as Parameters<typeof structuredData>[0])
    expect(jsonLd.url).toBe(SITE + ENCODED)
  })

  it('matches what the sitemap writes, once the escaping is undone', () => {
    const forXml = absoluteUrlForXml(SITE, ROUTE)
    expect(forXml).toBe(pageUrl)
  })
})

describe('an address that breaks the document', () => {
  const route = '/mods/all/Foo::<b>Foo'

  it('carries no angle bracket into the markup', () => {
    const written = absoluteUrlForXml(SITE, route)
    expect(written).not.toMatch(/[<>]/)
    expect(written).toBe(SITE + '/mods/all/Foo::%3Cb%3EFoo')
  })

  // No XML parser is a dependency here, and adding one for a single assertion is
  // not worth it. What the parser would catch is a tag opening inside <loc>;
  // that is what this looks for. The whole built document is parsed for real in
  // the acceptance run, by python.
  it('leaves no tag opening inside the element', () => {
    const fragment = `<urlset><url><loc>${absoluteUrlForXml(SITE, route)}</loc></url></urlset>`
    expect(fragment).not.toMatch(/<loc>[^<]*<[a-zA-Z]/)
    expect(fragment.match(/</g)?.length).toBe(fragment.match(/>/g)?.length)
  })
})

describe('the feed keeps its own address apart from the entries', () => {
  const entry = absoluteUrlForXml(SITE, ROUTE)
  const self = absoluteUrlForXml(SITE, '/rss.xml')
  const channel = absoluteUrlForXml(SITE, '')

  it('an entry link and its guid are the same address', () => {
    expect(entry).toBe(absoluteUrlForXml(SITE, ROUTE))
  })

  it('the self link is not the entry address', () => {
    expect(self).not.toBe(entry)
    expect(self).toBe(SITE + '/rss.xml')
  })

  it('the channel link is the site root', () => {
    expect(channel).toBe(SITE)
  })
})

describe('an asset address is its own group', () => {
  it('is built by the same joiner, so it is encoded too', () => {
    expect(absoluteUrl(SITE, '/assets/a picture.png')).toBe(SITE + '/assets/a%20picture.png')
  })
})
