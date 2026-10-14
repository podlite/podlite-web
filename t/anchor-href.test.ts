import * as schema from '@podlite/schema'
import { buildBindingIndex, indexAnchors } from '@podlite/schema'
import { podlite } from 'podlite'
import { anchorHref, linkAddress } from '../src/anchor-href'

const page = (text: string) => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(text, { podMode: 1 }))
  return { __anchors: indexAnchors(tree), __bindings: buildBindingIndex(tree) }
}

const ctx = page(
  '=begin pod\n=head2 v2.0\n\n=head2 Code blocks\n\n=head2 =formula, C< F<> > - formulas\n\nText.\n=end pod\n',
)

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

// A table of contents entry names its heading by the key the parse gave it, from the
// release of @podlite/schema that gives headings keys. Until the site takes that
// release, the section is skipped.
const keyed = typeof (schema as any).assignHeadingKeys === 'function'
const entriesOf = (text: string) => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(text, { podMode: 1 }))
  const ctx = { __anchors: indexAnchors(tree), __bindings: buildBindingIndex(tree) }
  const links: any[] = []
  const walk = (n: any): void => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (!n || typeof n !== 'object') return
    if (n.type === 'toc') {
      // the entry is kept as the item's node and in its content; one of them is enough
      const inner = (m: any): void => {
        if (Array.isArray(m)) return m.forEach(inner)
        if (!m || typeof m !== 'object') return
        if (m.type === 'fcode' && m.name === 'L') links.push(m)
        else inner(m.content)
      }
      return inner(n.content)
    }
    walk(n.content)
  }
  walk(tree)
  return { links, ctx }
}
;(keyed ? describe : describe.skip)('the address of a table of contents entry', () => {
  it('leads each entry to its own heading when two headings say the same thing', () => {
    const { links, ctx } = entriesOf('=begin pod\n=toc head1\n\n=head1 Intro\n\none\n\n=head1 Intro\n\ntwo\n=end pod\n')
    expect(links).toHaveLength(2)
    expect(links.every(l => typeof l.headingRef === 'string')).toBe(true)
    expect(links.map(l => linkAddress(l, ctx))).toEqual(['#Intro', '#Intro-2'])
  })

  it('gives an entry for a hidden heading the anchor of its heading', () => {
    const { links, ctx } = entriesOf('=begin pod\n=toc head1\n\n=head1 Project G<Aurox>\n\nText.\n=end pod\n')
    expect(links).toHaveLength(1)
    expect(linkAddress(links[0], ctx)).toBe('#masked-1')
  })

  it('gives no address to an entry whose heading the page does not hold', () => {
    const { links, ctx } = entriesOf('=begin pod\n=toc head1\n\n=head1 Intro\n=end pod\n')
    expect(linkAddress({ ...links[0], headingRef: 'h9.00000000000000' }, ctx)).toBeUndefined()
  })

  it('leaves a link the author wrote as it was', () => {
    const { ctx } = entriesOf('=begin pod\n=toc head1\n\n=head1 Intro\n\n=head1 Intro\n=end pod\n')
    expect(linkAddress({ meta: '#Intro' }, ctx)).toBe('#Intro')
  })
})
