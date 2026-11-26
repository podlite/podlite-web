// The application shell imports styles and modules the site build writes; they play no part here
jest.mock('@podlite/to-jsx/podlite.css', () => ({}), { virtual: true })
jest.mock('@podlite/editor-react/Editor.css', () => ({}), { virtual: true })
jest.mock('@podlite/editor-react/podlite-vars.css', () => ({}), { virtual: true })
jest.mock('../built/styles.css', () => ({}), { virtual: true })
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({ ilogo_png: '/assets/logo.png', iclip_mp4: '/assets/clip.mp4' }))
jest.mock('next/head', () => ({ children }: { children: any }) => <>{children}</>)
jest.mock('next/dist/client/router', () => ({ useRouter: () => ({ events: { on: () => {}, off: () => {} } }) }))
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MyApp from '../src/pages/_app'

const page = (srcs: string[]): string => {
  const item = {
    title: 'Page',
    publishUrl: '/page',
    node: { type: 'block', name: 'root', content: srcs.map(src => ({ type: 'image', src })) },
  }
  const Component = () => <main />
  return renderToStaticMarkup(<MyApp Component={Component} pageProps={{ item }} router={{} as any} />)
}
const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]
const jsonLd = (html: string) =>
  JSON.parse(
    (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '{}').replace(/\\u003c/g, '<'),
  )

describe('the card of a shared page', () => {
  it('gives one picture to og:image, twitter:image and the structured data, and a large card', () => {
    const html = page(['data:Logo', 'iclip_mp4', 'https://cdn.test/a.png', 'ilogo_png'])
    expect(meta(html, 'og:image')).toBe('https://cdn.test/a.png')
    expect(meta(html, 'twitter:image')).toBe('https://cdn.test/a.png')
    expect(jsonLd(html).image).toBe('https://cdn.test/a.png')
    expect(meta(html, 'twitter:card')).toBe('summary_large_image')
  })

  it('has no picture fields and a small card when no picture can be shown', () => {
    const html = page(['data:Logo', 'iclip_mp4', '//cdn.test/a.png'])
    expect(meta(html, 'og:image')).toBeUndefined()
    expect(meta(html, 'twitter:image')).toBeUndefined()
    expect(jsonLd(html).image).toBeUndefined()
    expect(meta(html, 'twitter:card')).toBe('summary')
  })
})
