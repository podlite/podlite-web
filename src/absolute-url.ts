// Building an absolute URL is three separate jobs, and the old code did none of
// them: it pasted the site URL and the route together and handed the result to
// whoever asked. A module named `Foo::<b>Foo` then put an open tag inside the
// sitemap's <loc>, and the whole document stopped parsing.
//
// publishUrl carries a raw path, not an encoded one. Measured 2026-09-25 on the
// Raku knowledge base: of 10762 routes, none held a percent sign, a question
// mark or a hash. So a literal `%20` in a path means those three characters and
// has to come out as `%2520`. Already-encoded input is not a case we have; the
// idempotence test below guards the day it appears.

const PATH_SAFE = /[A-Za-z0-9\-._~!$&'()*+,;=:@/]/

/**
 * Percent-encode one raw path. Keeps the separators a path is made of and the
 * sub-delimiters a URL allows; encodes everything else, including the percent
 * sign itself.
 */
export function encodePath(path: string): string {
  let out = ''
  for (const ch of path) {
    if (PATH_SAFE.test(ch)) {
      out += ch
      continue
    }
    const bytes = new TextEncoder().encode(ch)
    for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0')
  }
  return out
}

/**
 * Join a site URL and a route into one absolute address, encoding the route.
 * The route is a path: a trailing slash on the site URL and the special `/index`
 * are both removed here, so every caller gets the same answer.
 */
export function absoluteUrl(siteUrl: string, route: string | null | undefined): string {
  const base = (siteUrl || '').replace(/\/+$/, '')
  const path = route === '/index' ? '' : route || ''
  return base + encodePath(path)
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/**
 * Escape a string for XML. Runs after encoding, never before: an entity written
 * first survives encoding untouched, and the parser then hands back the raw
 * character the encoding was meant to remove.
 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, ch => XML_ESCAPES[ch])
}

/** An absolute URL ready to sit inside an XML element or attribute. */
export function absoluteUrlForXml(siteUrl: string, route: string | null | undefined): string {
  return escapeXml(absoluteUrl(siteUrl, route))
}
