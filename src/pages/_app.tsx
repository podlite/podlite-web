import '@podlite/to-jsx/podlite.css'
import '@podlite/editor-react/Editor.css'
import '@podlite/editor-react/podlite-vars.css'
import '../../built/styles.css'
import * as img from '../../built/images'
import { assetUrl } from '../image-src'
import { pageDescription } from '../page-description'
import Head from 'next/head'
import type { AppProps } from 'next/app'
import { getSiteInfo } from '../utils'
import { getFromTree, getTextContentFromNode, Image } from '@podlite/schema'
import { useEffect } from 'react'
import { useRouter } from 'next/dist/client/router'

function MyApp({ Component, pageProps }: AppProps) {
  const { slug = [], item } = pageProps
  const { title: rawSiteTitle, url } = getSiteInfo()
  const siteTitle = (rawSiteTitle || '').replace(/\s+/g, ' ').trim()
  // Titles come out of the source with the line break they were written with,
  // and a break inside a meta tag is shown as it is by whoever reads it.
  const pageTitle = (item?.title || '').replace(/\s+/g, ' ').trim()
  const title = pageTitle && pageTitle !== siteTitle ? `${pageTitle} ${siteTitle}` : siteTitle
  const [image] = getFromTree(item?.node, { type: 'image' }) as Array<Image>
  const metaImage = image?.src || null
  const description = (getTextContentFromNode(item?.description || []) || pageDescription(item?.node, title))
    .replace(/\s+/g, ' ')
    .trim()
  // The base for anything that leaves the page is the site address. Taking it
  // from publishUrl gave a path where an address was needed, so a shared link
  // carried an image nobody could fetch.
  const siteUrl = (url || '').replace(/\/$/, '')
  const pageUrl = siteUrl + (item?.publishUrl || '')
  const resultUrl = siteUrl
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
        <link href="/pagefind/pagefind-ui.css" rel="stylesheet" />
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml" />
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:site_name" content={siteTitle} />
        <meta property="og:title" content={title.trim()} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        {metaImage && img[metaImage] && (
          <>
            <meta property="og:image" content={resultUrl + assetUrl(img[metaImage])} />
            <meta name="twitter:image" content={resultUrl + assetUrl(img[metaImage])} />
          </>
        )}
        <meta name="twitter:description" content={description} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
