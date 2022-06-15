import "../styles/pod6.css"
import "../../built/styles.css"
import Head from "next/head"
import type { AppProps } from "next/app"
import { contentData, getSiteInfo } from "../utils"

function MyApp({ Component, pageProps }: AppProps) {
    const {slug = []} = pageProps
    const checkSlug = (slug) => ({ publishUrl }) => {
        const url = "/" + slug.join("/")
        return publishUrl.match(url)
      }
    const item: any = contentData().find(checkSlug(slug))
    const {title:siteTitle } = getSiteInfo()
    const title = `${item?.title} ${siteTitle}` 
  return <>
  <Head>
  <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS"
          href="/rss.xml"
        />
        <meta name="description" content={title} />
        <meta property="og:site_name" content={siteTitle} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        {/* 
        TODO:
        <meta property="og:image" content={metaImageUrl} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={metaImageUrl} /> */}
  </Head>
  <Component {...pageProps} />
  </>
}

export default MyApp
