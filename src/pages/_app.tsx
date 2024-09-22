import '../../built/styles.css'
import * as img from '../../built/images'
import Head from 'next/head'
import type { AppProps } from 'next/app'
import { getSiteInfo } from '../utils'
import { getFromTree, getTextContentFromNode, Image } from '@podlite/schema'
import { useEffect } from 'react'
import { useRouter } from 'next/dist/client/router'

function MyApp({ Component, pageProps }: AppProps) {
  const { slug = [], item } = pageProps
  const { title: siteTitle, url } = getSiteInfo()
  const title = `${item?.title || ''} ${siteTitle}`
  const [image] = getFromTree(item?.node, { type: 'image' }) as Array<Image>
  const metaImage = image?.src || null
  const description = getTextContentFromNode(item?.description || []) || title
  const resultUrl = item?.publishUrl || url || ''
  const router = useRouter()
  const pageview = url => {
    ;(window as any)?.gtag?.('event', 'page_view', {
      page_location: url,
    })
  }

  useEffect(() => {
    const handleRouteChange = url => {
      pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])
  return (
    <>
      <Head>
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml" />
        <meta name="description" content={description} />
        <meta property="og:site_name" content={siteTitle} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        {metaImage && img[metaImage] && (
          <>
            <meta property="og:image" content={resultUrl + img[metaImage]} />
            <meta name="twitter:image" content={resultUrl + img[metaImage]} />
          </>
        )}
        <meta name="twitter:description" content={description} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
