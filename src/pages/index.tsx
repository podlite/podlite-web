import { PodNode } from "@podlite/schema"
import Head from "next/head"
import { generateRedirects } from "src/utils/redirects"
import { DataFeedContent } from "../../bin/makeDataSource"
import { getData, getPostComponent } from "../utils"
import { writeRss } from "../utils/rss"
import { generateSitemap } from "../utils/sitemap"

const Home = ({title, node}:IndexProps) => {
    const faviconFile = getData().siteInfo.favicon
    return (
        <div>
        <Head>
          <title>{title}</title>
          <meta name="description" content={title} />
          <link rel="shortcut icon" href={`/${faviconFile}`} />
        </Head>
        <main id="body"> 
          {getPostComponent(node)}
        </main>
      </div>
    )
  }
interface SiteProps extends Partial<DataFeedContent['siteInfo']> {}
interface IndexProps  {
    url?:string,
    title:string,
    node:PodNode,
}

export async function getStaticProps():Promise<{ props :IndexProps}> {
    writeRss()
    generateSitemap()
    generateRedirects()
    const { title ,  node }:IndexProps = getData().siteInfo
    return {props:{ title, node }}
    
}
export default Home
