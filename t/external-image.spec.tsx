import { isExternalImageSrc } from '../src/image-src'

describe('external image source detection', () => {
  it('treats absolute http and https urls as external', () => {
    expect(isExternalImageSrc('https://github.com/x/badge.svg')).toBe(true)
    expect(isExternalImageSrc('http://example.com/a.png')).toBe(true)
  })

  it('treats protocol-relative and data urls as external', () => {
    expect(isExternalImageSrc('//cdn.example.com/a.png')).toBe(true)
    expect(isExternalImageSrc('data:image/png;base64,AAAA')).toBe(true)
  })

  it('keeps local paths on the prebuilt map path', () => {
    expect(isExternalImageSrc('media/logo.png')).toBe(false)
    expect(isExternalImageSrc('logo.png')).toBe(false)
    expect(isExternalImageSrc('/media/logo.png')).toBe(false)
  })
})
