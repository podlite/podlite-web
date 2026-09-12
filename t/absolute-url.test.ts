import { absoluteUrl, absoluteUrlForXml, encodePath, escapeXml } from '../src/absolute-url'

const SITE = 'https://raku-knowledge-base.podlite.org'

describe('encoding a raw path', () => {
  it('encodes a space', () => {
    expect(encodePath('/mods/all/Raku doc/x.md')).toBe('/mods/all/Raku%20doc/x.md')
  })

  it('encodes angle brackets, which is what broke the sitemap', () => {
    expect(encodePath('/mods/all/Foo::<b>Foo')).toBe('/mods/all/Foo::%3Cb%3EFoo')
  })

  it('keeps a colon: module names are full of them', () => {
    expect(encodePath('/mods/zef/MCP::Server')).toBe('/mods/zef/MCP::Server')
  })

  it('keeps an asterisk, which a URL allows', () => {
    expect(encodePath('/mods/all/ * Foo:: * /README.md')).toBe('/mods/all/%20*%20Foo::%20*%20/README.md')
  })

  it('encodes a backslash rather than passing it through', () => {
    expect(encodePath('/docs\\index.md')).toBe('/docs%5Cindex.md')
  })

  it('treats a percent sign as data, because the path is raw', () => {
    expect(encodePath('/a%20b')).toBe('/a%2520b')
  })

  it('encodes a question mark and a hash: in a raw path they are not delimiters', () => {
    expect(encodePath('/a?b#c')).toBe('/a%3Fb%23c')
  })

  it('encodes non-ASCII as UTF-8', () => {
    expect(encodePath('/док')).toBe('/%D0%B4%D0%BE%D0%BA')
  })

  it('leaves a plain path alone', () => {
    expect(encodePath('/doc/language/grammars')).toBe('/doc/language/grammars')
  })
})

describe('encoding is applied once, and that is a choice', () => {
  // publishUrl is a raw path: measured 2026-09-25 on the Raku knowledge base,
  // none of 10762 routes held a percent sign. So `%` is data, and encoding
  // cannot be idempotent — `%20` has to become `%2520`. The plan asked for
  // idempotence and for raw-path semantics at the same time; the two do not fit,
  // and raw-path semantics won because that is what the data is.
  //
  // What replaces idempotence: encoding lives in absoluteUrl and nowhere else,
  // so no path can be encoded twice. These cases pin that down.
  it('a second pass is not a no-op, by design', () => {
    expect(encodePath(encodePath('/a b'))).toBe('/a%2520b')
  })

  it('a path with nothing to encode survives any number of passes', () => {
    const plain = '/doc/language/grammars'
    expect(encodePath(encodePath(plain))).toBe(plain)
  })

  it('absoluteUrl encodes, so callers must pass a raw route', () => {
    expect(absoluteUrl(SITE, '/a b')).toBe(SITE + '/a%20b')
    expect(absoluteUrl(SITE, encodePath('/a b'))).toBe(SITE + '/a%2520b')
  })
})

describe('joining a site and a route', () => {
  it('drops a trailing slash on the site url', () => {
    expect(absoluteUrl(SITE + '/', '/mcp')).toBe(SITE + '/mcp')
  })

  it('turns /index into the site root', () => {
    expect(absoluteUrl(SITE, '/index')).toBe(SITE)
  })

  it('survives an empty route', () => {
    expect(absoluteUrl(SITE, '')).toBe(SITE)
    expect(absoluteUrl(SITE, null)).toBe(SITE)
    expect(absoluteUrl(SITE, undefined)).toBe(SITE)
  })
})

describe('escaping for xml', () => {
  it('escapes the five characters xml cares about', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;')
  })

  it('runs after encoding, so nothing is left to escape in a path', () => {
    expect(absoluteUrlForXml(SITE, '/mods/all/Foo::<b>Foo')).toBe(SITE + '/mods/all/Foo::%3Cb%3EFoo')
  })

  it('still escapes an ampersand the encoder keeps', () => {
    expect(absoluteUrlForXml(SITE, '/a&b')).toBe(SITE + '/a&amp;b')
  })
})
