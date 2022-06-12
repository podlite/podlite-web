import { DataFeedContent } from "../../bin/makeDataSource"
import { DATA_PATH, PUBLIC_PATH } from "../constants"
import * as fs from "fs"
import { convertPodNodeToHtml as convertPodNodeToHtml, getData } from "../utils"

export function getRssForData(data: DataFeedContent) {
  const conf = data.siteInfo
  const pages = data.all
  return `<?xml version="1.0" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${conf.title}</title>
      <atom:link href="${
        conf.url
      }/rss.xml" rel="self" type="application/rss+xml"/>
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
          <p>${convertPodNodeToHtml(post.description)}</p>
          </p>
        ]]></description>
      </item>`
  )
  .join("\n")}
    </channel>
  </rss>
`
}
export function writeRss() {
//   const dataFeed: DataFeedContent = JSON.parse(
//     fs.readFileSync(DATA_PATH).toString()
//   )
  const dataFeed = getData()
  const pages = dataFeed.all
    .filter(a => a.pubdate)
    .filter( page => page.description)
    .sort((a, b) => {
      //@ts-ignore
      return new Date(a.pubdate) - new Date(b.pubdate)
    })
    .reverse()
    .splice(0, 10)
  const rss = getRssForData({ ...dataFeed, all: pages })
  fs.writeFileSync(`${PUBLIC_PATH}/rss.xml`, rss);
}
