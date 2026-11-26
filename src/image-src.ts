// External images (badges, remote assets, data: addresses) bypass the prebuilt
// image map: an address with a scheme of two characters or more other than
// file:, or one that starts with //. The publisher reads addresses the same way.
export function isExternalImageSrc(src: string): boolean {
  return (/^[A-Za-z][A-Za-z0-9+.-]+:/.test(src) && !/^file:/i.test(src)) || src.startsWith('//')
}

// A static image import resolves to an object; fonts and video still resolve to a plain url.
export function assetUrl(asset: unknown): string {
  if (typeof asset === 'string') return asset
  if (asset && typeof asset === 'object' && 'src' in asset) return String((asset as { src: unknown }).src)
  return ''
}

// External links render as plain anchors: next/link rejects hrefs with a
// second scheme in the path (archived urls like web.archive.org/web/<ts>/https://...)
export function isExternalUrl(url: string): boolean {
  return /^(https?:)?\/\//i.test(url) || /^(mailto|tel|ftp):/i.test(url)
}
