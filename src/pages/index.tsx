import Head from "next/head"
import { DataFeedContent } from "../../bin/makeDataSource"
import { getData } from "../utils"
import { writeRss } from "../utils/rss"
import { generateSitemap } from "../utils/sitemap"

const Home = ({url, author}:IndexProps) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Zag.ru</title>
        <meta name="description" content="Personal web home" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to personal site of <a href={url}>{author?.name}</a>!
        </h1>

        <p className={styles.description}>
          New version of this site is coming soon...{" "}
        </p>

        <div className={styles.grid}>
          <a href={author?.contacts.linkedin} className={styles.card}>
            <h2>Contact me &rarr;</h2>
            <p>More information about me</p>
          </a>

          <a href={author?.contacts.github} className={styles.card}>
            <h2>Code&rarr;</h2>
            <p>Check my current projects</p>
          </a>

        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://pod6.in/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "} podlite
          {/* <span className={styles.logo}>
             <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} /> 
          </span> */}
        </a>
      </footer>
    </div>
  )
}
interface SiteProps extends Partial<DataFeedContent['siteInfo']> {}
interface IndexProps  {
    url:string,
    author: SiteProps['author'],
}

export async function getStaticProps():Promise<{ props :IndexProps}> {
    writeRss()
    generateSitemap()
    const { author, url  }:IndexProps = getData().siteInfo
    return {props:{author, url}}
    
}
export default Home
