import { buildBindingIndex, indexAnchors } from '@podlite/schema'
import { podlite } from 'podlite'
import { anchorHref } from '../src/anchor-href'

const page = (text: string) => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(text, { podMode: 1 }))
  return { __anchors: indexAnchors(tree), __bindings: buildBindingIndex(tree) }
}

const ctx = page('=begin pod\n=head2 v2.0\n\n=head2 Code blocks\n\n=head2 =formula, C< F<> > - formulas\n\nText.\n=end pod\n')

describe('the address of a link in a page', () => {
  it('goes to the id the page gave a heading with a dot in its text', () => {
    expect(anchorHref('#v2.0', ctx)).toBe('#v20')
  })

  it('reaches a heading whose name the link wraps over a line', () => {
    expect(anchorHref('#Code\nblocks', ctx)).toBe('#Code-blocks')
  })

  it('reaches a heading with a run of spaces in its text', () => {
    expect(anchorHref('#=formula, F<> - formulas', ctx)).toBe('#formula-F-formulas')
  })

  it('keeps the written form of an anchor the page does not have', () => {
    expect(anchorHref('#no where', ctx)).toBe('#no-where')
  })

  it('keeps the written form of a link out of the page', () => {
    expect(anchorHref('/about page', ctx)).toBe('/about-page')
    expect(anchorHref(null, ctx)).toBe('#')
  })
})
