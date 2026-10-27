// The page renderer reads modules the site build writes, and Jest does not read CSS modules
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({}))
jest.mock('../src/components/service.module.css', () => ({}))
jest.mock('../src/components/cookieConsentStyles.module.css', () => ({}))
import { renderToStaticMarkup } from 'react-dom/server'
import { DefaultTemplateComponent } from '../src/defaultTemplate/components'
import { TestComponent } from '../src/components/service'

const note = (publishUrl: string, title: string) => ({
  publishUrl,
  pubdate: '2022-08-06',
  type: 'note',
  title,
  node: [],
})

const render = (item: object) =>
  renderToStaticMarkup(
    <DefaultTemplateComponent id="x" item={item} renderNode={() => null} getOpt={() => null}>
      {null}
    </DefaultTemplateComponent>,
  )

// the opening tag of the navigation block, where the search looks for the mark
const navTag = (html: string) => (html.match(/<div id="nav"[^>]*>/) || [''])[0]

describe('the navigation under a page of the standard template', () => {
  it('is kept out of the search, with the labels and links of the neighbours inside', () => {
    const html = render({
      ...note('/2022/8/6/1', 'Middle'),
      pluginsData: {
        navigate: { prev: note('/2022/8/5/1', 'Earlier words'), next: note('/2022/8/7/1', 'Later words') },
      },
    })
    expect(navTag(html)).toContain('data-pagefind-ignore="true"')
    const nav = html.slice(html.indexOf('<div id="nav"'))
    expect(nav).toContain('<a href="/2022/8/5/1">Earlier words</a>')
    expect(nav).toContain('<a href="/2022/8/7/1">Later words</a>')
    expect(nav).toContain('<a href="/2022/8/5/1">←</a><a href="/">↑</a><a href="/2022/8/7/1">→</a>')
  })

  it('is kept out of the search on a page that is not a note', () => {
    const html = render({ publishUrl: '/about', title: 'About', type: 'page', node: [] })
    expect(navTag(html)).toContain('data-pagefind-ignore="true"')
  })

  it('gets the mark from the block of the other template too', () => {
    const html = renderToStaticMarkup(
      <TestComponent id="nav" data-pagefind-ignore>
        <span>a</span>
        <span>b</span>
      </TestComponent>,
    )
    expect(navTag(html)).toContain('data-pagefind-ignore="true"')
  })
})
