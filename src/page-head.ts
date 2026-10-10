import { AstTree, getTextContentFromNode, PodNode } from '@podlite/schema'
import { pageDescription } from './page-description'

type PageHeadInput = {
  pageTitle?: string | null
  siteTitle?: string | null
  hasImage: boolean
  description?: PodNode | AstTree
  node?: unknown
}

export type PageHead = {
  tab: string
  share: string
  card: 'summary' | 'summary_large_image'
  description: string
}

// Titles and descriptions keep the line breaks they were written with, and a break inside
// a tag is shown as it is by whoever reads it.
const clean = (text?: string | null): string => (text || '').replace(/\s+/g, ' ').trim()

const textOf = (nodes?: PodNode | AstTree): string =>
  !nodes ? '' : Array.isArray(nodes) ? nodes.map(getTextContentFromNode).join('') : getTextContentFromNode(nodes)

export function pageHead({ pageTitle, siteTitle, hasImage, description, node }: PageHeadInput): PageHead {
  const site = clean(siteTitle)
  const page = clean(pageTitle)
  const own = page && page !== site ? page : ''
  const share = own || site
  // The site name already travels in og:site_name, so a shared link carries the page alone.
  const tab = own && site ? `${own} — ${site}` : share
  const written = clean(textOf(description))
  return {
    tab,
    share,
    card: hasImage ? 'summary_large_image' : 'summary',
    description: written || clean(pageDescription(node, share)),
  }
}
