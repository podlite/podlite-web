import { cardImageOf } from '../src/card-image'

const built = { ilogo_png: '/assets/logo.png', iclip_mp4: '/assets/clip.mp4' }
const card = (...srcs: string[]) =>
  cardImageOf(
    srcs.map(src => ({ src })),
    built,
  )

describe('the picture a page is shared with', () => {
  it.each([
    ['https://cdn.test/a.png', 'https://cdn.test/a.png'],
    ['https://cdn.test/poster.png?theme=webm', 'https://cdn.test/poster.png?theme=webm'],
    ['ilogo_png', '/assets/logo.png'],
  ])('takes %s', (src, expected) => {
    expect(card(src)).toBe(expected)
  })

  it.each([
    'https:cover.png',
    'https:/cover.png',
    'https:///cover.png',
    '//cdn.test/a.png',
    'data:Logo',
    'https://cdn.test/Clip.MP4?token=1#t=4',
    'iclip_mp4',
    'missing.png',
  ])('passes over %s for the next picture', src => {
    expect(card(src)).toBeNull()
    expect(card(src, 'ilogo_png')).toBe('/assets/logo.png')
  })

  it('takes the first picture a card can show', () => {
    expect(card('data:Logo', 'iclip_mp4', 'ilogo_png', 'https://cdn.test/a.png')).toBe('/assets/logo.png')
    expect(card()).toBeNull()
  })
})
