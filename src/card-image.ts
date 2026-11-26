import { assetUrl } from './image-src'

const VIDEO = /\.(mp4|mov|webm)$/i

// a remote picture is shared by an address of its own with a host, written out:
// `https:cover.png` would be read against the page and point somewhere else
const remoteAddress = (src: string): URL | null => {
  if (!/^https?:\/\/[^/?#]+/i.test(src)) return null
  try {
    const url = new URL(src)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host ? url : null
  } catch {
    return null
  }
}

/**
 * The picture a page is shared with: the first one in the document that a card
 * can show, a picture from the site build or one at an absolute http(s)
 * address. A data: picture, an address without a scheme and a video are passed
 * over for the next one. The answer is the address of the asset, or the remote
 * address as written; null when the page has none.
 */
export function cardImageOf(images: Array<{ src?: unknown }>, built: Record<string, unknown>): string | null {
  for (const image of images) {
    const src = typeof image?.src === 'string' ? image.src : ''
    if (!src) continue
    const asset = built[src] ? assetUrl(built[src]) : ''
    if (asset) {
      if (!VIDEO.test(asset.split(/[?#]/)[0])) return asset
      continue
    }
    const remote = remoteAddress(src)
    if (remote && !VIDEO.test(remote.pathname)) return src
  }
  return null
}
