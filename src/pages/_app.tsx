import "../../built/styles.css"
import * as img from "../../built/images"
import Head from "next/head"
import type { AppProps } from "next/app"
import { contentData, getSiteInfo } from "../utils"
import { getFromTree, getTextContentFromNode } from "@podlite/schema"

function MyApp({ Component, pageProps }: AppProps) {
    const {slug = []} = pageProps
    const checkSlug = (slug) => ({ publishUrl }) => {
        const url = "/" + slug.join("/")
        return publishUrl.match(url)
      }
    const item: any = contentData().find(checkSlug(slug))
    const {title:siteTitle, url  } = getSiteInfo()
    const title = `${item?.title || ''} ${siteTitle}` 
    const [image] = getFromTree(item?.node, {type:"image"})
    const metaImage = image?.src || null
    const description = getTextContentFromNode(item?.description || []) || title
    const resultUrl = url || ''
  return <>
  <Head>
  <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS"
          href="/rss.xml"
        />
        <meta name="description" content={description} />
        <meta property="og:site_name" content={siteTitle} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        { metaImage && img[metaImage] &&
            <>
                <meta property="og:image" content={resultUrl + img[metaImage]} />
                <meta name="twitter:image" content={resultUrl + img[metaImage]} /> 
            </>
        }
        <meta name="twitter:description" content={description} />
        
  </Head>
  <Component {...pageProps} />
  </>
}

export default MyApp
