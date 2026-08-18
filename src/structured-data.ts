type Source = {
  title?: string | null
  type?: string
  pubdate?: string
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

// A blog entry carries a date, a page does not; that is the only distinction the
// record supports, so it is the only one drawn here.
export const isArticle = (item?: Source): boolean => Boolean(item?.pubdate) && item?.type !== 'page'

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
