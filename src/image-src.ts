// External images (badges, remote assets) bypass the prebuilt image map.
export function isExternalImageSrc(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith('data:')
}

// External links render as plain anchors: next/link rejects hrefs with a
// second scheme in the path (archived urls like web.archive.org/web/<ts>/https://...)
export function isExternalUrl(url: string): boolean {
  return /^(https?:)?\/\//i.test(url) || /^(mailto|tel|ftp):/i.test(url)
}
