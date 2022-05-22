import { PodNode } from "@podlite/schema"
import Head from "next/head"
import { DataFeedContent } from "../../bin/makeDataSource"
import styles from "../styles/Home.module.css"
import { getData, getPostComponent } from "../utils"
import { writeRss } from "../utils/rss"
import { generateSitemap } from "../utils/sitemap"

const Home = ({url, author, title, subtitle, node}:IndexProps) => {
    return (
        <div>
        <Head>
          <title>{title}</title>
          <meta name="description" content={subtitle} />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main id="body"> 
          {getPostComponent(node)}
        </main>
      </div>
    )
  }
interface SiteProps extends Partial<DataFeedContent['siteInfo']> {}
interface IndexProps  {
    url:string,
    title:string,
    subtitle:string,
    node:PodNode,
    author: SiteProps['author'],
}

export async function getStaticProps():Promise<{ props :IndexProps}> {
    writeRss()
    generateSitemap()
    const { author, url, title , subtitle , node }:IndexProps = getData().siteInfo
    return {props:{author, url, title, subtitle, node }}
    
}
export default Home
