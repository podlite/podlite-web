import { DataFeedContent } from '../../bin/makeDataSource'
import { PUBLIC_PATH } from '../constants'
import { getSiteInfo } from '../utils'
import * as fs from 'fs'
import { convertPodNodeToHtml as convertPodNodeToHtml } from '../utils'
import { getAllPages } from 'src/serverside'

export function getRssForData(data: DataFeedContent) {
  const conf = data.siteInfo
  const pages = data.all
  return `<?xml version="1.0" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${conf.title}</title>
      <atom:link href="${conf.url}/rss.xml" rel="self" type="application/rss+xml"/>
      <link>${conf.url}</link>
      <description>${conf.title}</description>
      <language>ru</language>
${pages
  .map(
    post => `      <item>
        <title>${post.title || ''}</title>
        <link>${conf.url}${post.publishUrl}</link>
        <guid>${conf.url}${post.publishUrl}</guid>
        <pubDate>${new Date(post.pubdate).toUTCString()}</pubDate>
        <description><![CDATA[
          <p>${convertPodNodeToHtml(post.description || '')}</p>
          </p>
        ]]></description>
      </item>`,
  )
  .join('\n')}
    </channel>
  </rss>
`
}
export function writeRss() {
  const pages = getAllPages()
    .filter(a => a.pubdate)
    .filter(page => page.description)
    .sort((a, b) => {
      //@ts-ignore
      return new Date(a.pubdate) - new Date(b.pubdate)
    })
    .reverse()
    .splice(0, 10)
  //@ts-ignore
  const rss = getRssForData({ all: pages, siteInfo: getSiteInfo() })
  fs.writeFileSync(`${PUBLIC_PATH}/rss.xml`, rss)
}
