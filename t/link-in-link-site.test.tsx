// The page renderer reads modules the site build writes; they play no part here
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({}))
import { podlite } from 'podlite'
import { convertPodNodeToHtml } from '../src/utils'

const render = (text: string): string => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(`=begin pod\n${text}\n=end pod\n`, { podMode: 1 }))
  return convertPodNodeToHtml(tree as any).replace(/<!-- -->/g, '')
}

// HTML does not allow a link inside a link: the browser rebuilds the tree and the page
// fails to hydrate. A link written inside the text of another gives only its text.
const nested = (html: string) => /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/.test(html)

describe('a link written inside the text of another link on a site page', () => {
  it('gives only its text for a W<> inside the L<> the site draws', () => {
    const html = render('See L<the W<inner|defn:inner> part|/outer>.')
    expect(nested(html)).toBe(false)
    expect(html).toContain('href="/outer"')
    expect(html).toContain('inner')
    expect(html).not.toContain('defn:inner')
  })

  it('gives only its text for an L<> the site draws inside a W<>', () => {
    const html = render('See W<the L<inner|/inner> part|defn:outer>.')
    expect(nested(html)).toBe(false)
    expect(html).not.toContain('href="/inner"')
  })

  it('keeps links side by side as they were', () => {
    const html = render('L<one|/one> and W<two|defn:two>.')
    expect(html).toContain('href="/one"')
    expect(html).toContain('two')
    expect(nested(html)).toBe(false)
  })
})
