import { PUBLIC_PATH } from '../constants'
import * as fs from 'fs'
import {  ContentRecord, getSiteInfo } from '../utils'
import { absoluteUrlForXml } from '../absolute-url'
import { contentData } from 'src/serverside'

export function generateSitemap() {
  const siteUrl = getSiteInfo().url
  function addPage(page: ContentRecord) {
    // The route is a raw path and may hold anything a module author called a
    // directory: spaces, asterisks, angle brackets. Encoded first so the address
    // is legal, escaped second so the document stays well-formed.
    return `
        <url>
          <loc>${absoluteUrlForXml(siteUrl, page.publishUrl)}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>1.0</priority>
        </url>`
  }

  const pages = contentData() as ContentRecord[]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.filter(i => i.publishUrl && i.indexing?.robots !== false).map(addPage).join('\n')}
</urlset>`

  fs.writeFileSync(`${PUBLIC_PATH}/sitemap.xml`, sitemap)
}
