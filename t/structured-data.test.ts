import { isArticle, structuredData } from '../src/structured-data'

const base = {
  title: 'Inner page Site',
  pageTitle: 'Inner page',
  description: 'What the page is about.',
  pageUrl: 'https://example.org/inner',
  siteTitle: 'Site',
  siteUrl: 'https://example.org',
}

describe('what the page says it is', () => {
  it('a dated entry is an article', () => {
    expect(isArticle({ pubdate: '2026-05-01 08:00:00' })).toBe(true)
  })

  it('a page with a date is still a page', () => {
    expect(isArticle({ pubdate: '2020-07-26 10:00:00', type: 'page' })).toBe(false)
  })

  it('an entry without a date is a page', () => {
    expect(isArticle({})).toBe(false)
  })

  it('an article carries its headline and date', () => {
    const d = structuredData({ ...base, item: { pubdate: '2026-05-01 08:00:00', title: 'Inner page' } })
    expect(d['@type']).toBe('Article')
    expect(d.headline).toBe('Inner page')
    expect(d.datePublished).toBe('2026-05-01 08:00:00')
  })

  it('a page carries neither', () => {
    const d = structuredData({ ...base, item: { type: 'page', title: 'Inner page' } })
    expect(d['@type']).toBe('WebPage')
    expect(d.headline).toBeUndefined()
    expect(d.datePublished).toBeUndefined()
  })

  it('the image is left out when there is none', () => {
    expect(structuredData({ ...base }).image).toBeUndefined()
    expect(structuredData({ ...base, imageUrl: 'https://example.org/a.png' }).image).toBe('https://example.org/a.png')
  })

  it('the site it belongs to is named by address', () => {
    expect(structuredData({ ...base }).isPartOf).toEqual({
      '@type': 'WebSite',
      name: 'Site',
      url: 'https://example.org',
    })
  })
})
