// The page renderer reads modules the site build writes; they play no part here
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({}))
import { podlite } from 'podlite'
import { convertPodNodeToHtml } from '../src/utils'

const render = (text: string, change?: (tree: any) => void): string => {
  const p = podlite({ importPlugins: true })
  const tree = p.toAst(p.parse(text, { podMode: 1 }))
  if (change) change(tree)
  return convertPodNodeToHtml(tree as any)
}

const page = `=begin pod
=toc head1
=head1 Project G<Aurox>

Read L<the G<Quokka> notes|https://example.org/notes>, L<B<bold> G<Secret>|doc:Other> and L<our G<Lynx> part|#Project Aurox>.

=for para :masked
See L<the vault|/vault>.
=end pod`

describe('the text of a link on the site', () => {
  const html = render(page)

  it('keeps a hidden word masked, in a link to another site, to a document and within the page', () => {
    for (const word of ['Quokka', 'Secret', 'Lynx']) expect(html).not.toContain(word)
    expect(html).toContain('<a href="https://example.org/notes">the <span class="masked">██████</span> notes</a>')
    expect(html).toContain('<a href="#masked-1">our <span class="masked">████</span> part</a>')
  })

  it('keeps the formatting the author gave it', () => {
    expect(html).toContain('<a href="doc:Other"><strong>bold</strong> <span class="masked">██████</span></a>')
  })

  it('is masked in a table of contents entry for a hidden heading', () => {
    expect(html).not.toContain('Aurox')
    expect(html).toMatch(/<li class="toc-item"><a href="#masked-1">Project <span class="masked">█████<\/span>/)
  })

  it('is masked whole inside a masked block', () => {
    // the block masks its text itself, so the link holds the mask characters, not a masked span
    expect(html).toContain('<a href="/vault">███ █████</a>')
  })

  it('stays masked in a link the page cannot give an address', () => {
    const lost = render(`=begin pod\n=toc head1\n\n=head1 Project G<Aurox>\n\nText.\n=end pod\n`, tree => {
      const walk = (n: any): void => {
        if (Array.isArray(n)) return n.forEach(walk)
        if (!n || typeof n !== 'object') return
        if (n.type === 'fcode' && n.name === 'L' && typeof n.headingRef === 'string') n.headingRef = 'h9.00000000000000'
        walk(n.content)
      }
      walk(tree)
    })
    expect(lost).toMatch(/<a>Project <span class="masked">█████<\/span>/)
    expect(lost).not.toContain('Aurox')
  })
})
