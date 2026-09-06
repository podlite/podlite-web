import { isEntry } from '@podlite/publisher/record'

type Source = {
  title?: string | null
  type?: string
  pubdate?: string
  isPage?: boolean
}

type Params = {
  item?: Source
  title: string
  pageTitle: string
  description: string
  pageUrl: string
  siteTitle: string
  siteUrl: string
  imageUrl?: string
}

export const isArticle = (item?: Source): boolean => (item ? isEntry(item) : false)

export const structuredData = ({
  item,
  title,
  pageTitle,
  description,
  pageUrl,
  siteTitle,
  siteUrl,
  imageUrl,
}: Params): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': isArticle(item) ? 'Article' : 'WebPage',
  name: title,
  ...(isArticle(item) ? { headline: pageTitle || title, datePublished: item?.pubdate } : {}),
  description,
  url: pageUrl,
  ...(imageUrl ? { image: imageUrl } : {}),
  isPartOf: { '@type': 'WebSite', name: siteTitle, url: siteUrl },
})
