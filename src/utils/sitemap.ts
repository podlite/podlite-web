import { PUBLIC_PATH } from '../constants'
import * as fs from 'fs'
import {  ContentRecord, getSiteInfo } from '../utils'
import { contentData } from 'src/serverside'

export function generateSitemap() {
  const siteUrl = getSiteInfo().url
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
${pages.filter(i=>i.publishUrl).map(addPage).join('\n')}
</urlset>`

  fs.writeFileSync(`${PUBLIC_PATH}/sitemap.xml`, sitemap)
}
