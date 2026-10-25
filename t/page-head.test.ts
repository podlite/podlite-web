import { getFromTree, PodNode } from '@podlite/schema'
import { podlite } from 'podlite'
import { pageHead } from '../src/page-head'

const para = (text: string): PodNode => ({ type: 'para', content: [{ type: 'text', value: text }] })
const LONG = 'A paragraph long enough to describe the page on its own, well past forty characters.'

describe('the titles of a page', () => {
  it('the tab names the page and then the site', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false }).tab).toBe('Page — Site')
  })

  it('a shared link carries the page title alone', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false }).share).toBe('Page')
  })

  it('a page titled like the site is named once', () => {
    const head = pageHead({ pageTitle: 'Site', siteTitle: 'Site', hasImage: false })
    expect(head.tab).toBe('Site')
    expect(head.share).toBe('Site')
  })

  it('a page without a title is named by the site', () => {
    for (const pageTitle of ['', null, undefined, '  \n ']) {
      const head = pageHead({ pageTitle, siteTitle: 'Site', hasImage: false })
      expect(head.tab).toBe('Site')
      expect(head.share).toBe('Site')
    }
  })

  it('line breaks and repeated spaces collapse', () => {
    const head = pageHead({ pageTitle: 'Six years\n  later\n', siteTitle: 'My\nsite\n', hasImage: false })
    expect(head.tab).toBe('Six years later — My site')
    expect(head.share).toBe('Six years later')
  })

  it('a site without a title leaves no trailing separator', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: '', hasImage: false }).tab).toBe('Page')
  })

  it('nothing to name gives an empty tab', () => {
    expect(pageHead({ pageTitle: null, siteTitle: '', hasImage: false }).tab).toBe('')
  })
})

describe('the size of the card', () => {
  it('is large when the page has a picture to show', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: true }).card).toBe('summary_large_image')
  })

  it('is small without one', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false }).card).toBe('summary')
  })
})

describe('the description of a page', () => {
  it('is the DESCRIPTION block, on one line', () => {
    const head = pageHead({
      pageTitle: 'Page',
      siteTitle: 'Site',
      hasImage: false,
      description: [para('Line one\nline two')],
    })
    expect(head.description).toBe('Line one line two')
  })

  it('an empty DESCRIPTION counts as none', () => {
    for (const description of [[], [para('   \n')]]) {
      const head = pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false, description, node: [para(LONG)] })
      expect(head.description).toBe(LONG)
    }
  })

  it('without one, the first paragraph long enough', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false, node: [para(LONG)] }).description).toBe(
      LONG,
    )
  })

  it('without a paragraph, the page title', () => {
    expect(pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false, node: [para('short')] }).description).toBe(
      'Page',
    )
  })

  it('without a page title either, the site title', () => {
    expect(pageHead({ pageTitle: null, siteTitle: 'Site', hasImage: false, node: [] }).description).toBe('Site')
  })
})

describe('a hidden word in the description of a page', () => {
  const tree = (text: string): any => {
    const p = podlite({ importPlugins: true })
    return p.toAst(p.parse(text, { podMode: 1 }))
  }
  const describe_ = (text: string, asDescription?: (t: any) => any) => {
    const t = tree(text)
    return pageHead({ pageTitle: 'Page', siteTitle: 'Site', hasImage: false, description: asDescription?.(t), node: t })
      .description
  }
  const descriptionBlock = (t: any) => (getFromTree(t, 'DESCRIPTION')[0] as any)?.content

  it('is masked in the DESCRIPTION the author wrote', () => {
    const text = describe_(
      '=begin pod\n=begin DESCRIPTION\nNotes on the G<Quokka> project and its plans.\n=end DESCRIPTION\n\nBody.\n=end pod\n',
      descriptionBlock,
    )
    expect(text).toBe('Notes on the ██████ project and its plans.')
  })

  it('is masked in a description the publisher took from a masked paragraph', () => {
    const doc =
      '=begin pod\n=for para :masked\nThe launch code for the vault door is kept here, well past forty characters.\n=end pod\n'
    const text = describe_(doc, t => getFromTree(t, 'para'))
    expect(text).not.toMatch(/[A-Za-z]/)
    expect(text).toMatch(/^█+( █+)+\S$/)
  })

  it('is masked in the first paragraph taken in its place', () => {
    const text = describe_(
      '=begin pod\nThe first paragraph names B<G<Lynx>> and L<the G<Wombat> notes|/notes>, long enough to describe it.\n=end pod\n',
    )
    for (const word of ['Lynx', 'Wombat']) expect(text).not.toContain(word)
    expect(text).toContain('names ████ and the ██████ notes')
  })

  it('is masked when the first paragraph is masked whole', () => {
    const text = describe_(
      '=begin pod\n=for para :masked\nThe launch code for the vault door is kept here, well past forty characters.\n\nVisible text.\n=end pod\n',
    )
    expect(text).not.toContain('launch')
    // the masked paragraph is still the one taken, not the title in its place
    expect(text).toMatch(/^███ ██████ ████/)
  })
})
