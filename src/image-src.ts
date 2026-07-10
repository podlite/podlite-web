// External images (badges, remote assets) bypass the prebuilt image map.
export function isExternalImageSrc(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith('data:')
}
