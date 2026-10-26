// The page renderer reads modules the site build writes; they play no part here
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({}))
import { podlite } from 'podlite'
import { convertPodNodeToHtml } from '../src/utils'
import { anchorHref } from '../src/anchor-href'
import { buildBindingIndex, indexAnchors } from '@podlite/schema'

const render = (text: string): string => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(`=begin pod\n${text}\n=end pod\n`, { podMode: 1 }))
  return convertPodNodeToHtml(tree as any).replace(/<!-- -->/g, '')
}

// A link written without an address after a bar goes to its own text. When that
// text is hidden, in whole or in part, the address would show what the text hides.
describe('a link that takes its address from hidden text', () => {
  it('goes nowhere when the whole address is hidden', () => {
    const html = render('See L<G<https://example.org/private>>.')
    expect(html).not.toContain('private')
    expect(html).toMatch(/<a><span class="masked">█+<\/span><\/a>/)
  })

  it('goes nowhere inside a masked block', () => {
    const html = render('=for para :masked\nSee L<https://example.org/private>.')
    expect(html).not.toContain('example.org')
    expect(html).not.toContain('href')
  })

  it('goes nowhere when a part of the address is hidden', () => {
    const html = render('See L<https://example.org/G<private>/page>.')
    expect(html).not.toContain('private')
    expect(html).toContain('<a>https://example.org/<span class="masked">███████</span>/page</a>')
  })

  it('goes to the anchor of a heading in the page, which holds nothing hidden', () => {
    const html = render('=head1 Project G<Aurox>\n\nSee L<#Project G<Aurox>>.')
    expect(html).not.toContain('Aurox')
    expect(html).toContain('<a href="#masked-1">#Project <span class="masked">█████</span></a>')
  })

  // the name of an open heading or its :id is on the page already; the link takes nothing more
  it('goes to the anchor of an open heading it names, in any case or by its id', () => {
    expect(render('=head1 Project Aurox\n\nSee L<#project G<aurox>>.')).toContain('href="#Project-Aurox"')
    expect(render('=for head1 :id<Aurox>\nPublic\n\nSee L<#G<Aurox>>.')).toContain('href="#Aurox"')
  })

  it('is given no address made up from its text without the bindings of the page', () => {
    expect(anchorHref('#Missing Secret', {}, undefined, true)).toBeUndefined()
    expect(anchorHref('#', {}, undefined, true)).toBeUndefined()
    expect(anchorHref('', {}, undefined, true)).toBeUndefined()
  })

  it('takes the anchor the page gave the heading, not one made up from the text, whatever indexes it is given', () => {
    const p = podlite({ importPlugins: true })
    const tree = (text: string) => p.toAst(p.parse(`=begin pod\n${text}\n=end pod\n`, { podMode: 1 }))
    const page = tree('=head1 Project G<Secret>\n\nText.')
    const other = tree('=head1 Other\n\nText.')
    const bindings = buildBindingIndex(page)
    expect(anchorHref('#Project Secret', { __bindings: bindings }, undefined, true)).toBeUndefined()
    expect(
      anchorHref('#Project Secret', { __bindings: bindings, __anchors: indexAnchors(other) }, undefined, true),
    ).toBeUndefined()
    expect(
      anchorHref('#Project Secret', { __bindings: bindings, __anchors: indexAnchors(page) }, undefined, true),
    ).toBe('#masked-1')
  })

  it('goes to a block by the :id the page writes on it', () => {
    expect(render('=for para :id<intro>\nOpen.\n\nSee L<#G<intro>>.')).toContain('<a href="#intro">')
  })

  it('goes nowhere when the page has no such heading', () => {
    const html = render('=head1 Open\n\nSee L<#Missing G<Kiwi>>.')
    expect(html).not.toContain('Kiwi')
    expect(html).toContain('<a>#Missing <span class="masked">████</span></a>')
  })
})

describe('a link with nothing hidden in its address', () => {
  it('keeps its address', () => {
    expect(render('See L<https://example.org/open>.')).toContain(
      '<a href="https://example.org/open">https://example.org/open</a>',
    )
    expect(render('=head1 Open\n\nSee L<#Missing part>.')).toContain('<a href="#Missing-part">#Missing part</a>')
  })

  it('keeps the address written after a bar when only its text is hidden', () => {
    expect(render('See L<G<label>|https://example.org/x>.')).toContain(
      '<a href="https://example.org/x"><span class="masked">█████</span></a>',
    )
  })
})
