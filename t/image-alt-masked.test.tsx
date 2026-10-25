// The page renderer reads modules the site build writes; they play no part here
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({}))
import { podlite } from 'podlite'
import { convertPodNodeToHtml } from '../src/utils'

const render = (text: string): string => {
  const p = podlite({ importPlugins: true })
  return convertPodNodeToHtml(p.toAst(p.parse(text, { podMode: 1 })) as any)
}

describe('the text of a picture for readers who cannot see it', () => {
  it('is masked for a picture in a masked block', () => {
    const html = render(
      '=begin pod\n=for para :masked\nSee P<A secret vault plan|https://example.org/plan.png> here.\n=end pod\n',
    )
    expect(html).not.toContain('secret')
    expect(html).toContain('<img src="https://example.org/plan.png" alt="█ ██████ █████ ████"/>')
  })

  it('is masked where a missing picture is replaced by its text', () => {
    const html = render('=begin pod\n=for para :masked\nSee P<A secret vault plan|plan.png> here.\n=end pod\n')
    expect(html).not.toContain('secret')
    expect(html).toContain('<span class="image-missing">█ ██████ █████ ████</span>')
  })

  it('is left as written for a picture that is not hidden', () => {
    const html = render('=begin pod\nOpen P<An open picture|https://example.org/open.png>.\n=end pod\n')
    expect(html).toContain('alt="An open picture"')
  })
})
