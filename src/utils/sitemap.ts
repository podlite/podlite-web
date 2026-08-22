import { BUILT_PATH, PUBLIC_PATH } from '../constants'
import * as fs from 'fs'
import * as path from 'path'
import {  ContentRecord, getSiteInfo } from '../utils'
import { contentData } from 'src/serverside'

// A page may answer at an address and still ask to stay out of the index: the
// permanent twin of the current specification, a version not released yet. The
// page index carries named fields only, so the plugin that knows this writes it
// out; a build without versions leaves an empty list.
function excludedFromIndex(): Set<string> {
  try {
    const raw = fs.readFileSync(path.join(BUILT_PATH, 'versions.json')).toString()
    return new Set<string>(JSON.parse(raw).noindex || [])
  } catch {
    return new Set<string>()
  }
}

export function generateSitemap() {
  const siteUrl = getSiteInfo().url
  const excluded = excludedFromIndex()
  function addPage(page: ContentRecord) {
    const path = page.publishUrl
    const route = path === '/index' ? '' : path
    return `
        <url>
          <loc>${`${siteUrl}${route}`}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>1.0</priority>
        </url>`
  }

  const pages = contentData() as ContentRecord[]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.filter(i => i.publishUrl && !excluded.has(i.publishUrl)).map(addPage).join('\n')}
</urlset>`

  fs.writeFileSync(`${PUBLIC_PATH}/sitemap.xml`, sitemap)
}
