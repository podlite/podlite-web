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

import { isExternalUrl } from '../src/image-src'

describe('external url detection for links', () => {
  it('routes archived and absolute urls to a plain anchor', () => {
    expect(isExternalUrl('https://web.archive.org/web/2019/https://design.raku.org/S28.html')).toBe(true)
    expect(isExternalUrl('http://example.com/a')).toBe(true)
    expect(isExternalUrl('mailto:a@b.c')).toBe(true)
  })
  it('keeps internal paths on the router', () => {
    expect(isExternalUrl('/mods/zef/Archive')).toBe(false)
    expect(isExternalUrl('#anchor')).toBe(false)
    expect(isExternalUrl('page-name')).toBe(false)
  })
})
