import { AstTree, getMaskedTextContent, PodNode } from '@podlite/schema'
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

// A line break kept from the source is shown as it is inside a meta tag.
const clean = (text?: string | null): string => (text || '').replace(/\s+/g, ' ').trim()

// A hidden word is written masked: these lines go out past the renderer.
const textOf = (nodes?: PodNode | AstTree): string =>
  !nodes ? '' : Array.isArray(nodes) ? nodes.map(getMaskedTextContent).join('') : getMaskedTextContent(nodes)

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
