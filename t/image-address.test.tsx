// The page renderer reads modules the site build writes; they play no part here
jest.mock('../built/components', () => ({}))
jest.mock('../built/images', () => ({ 'built.png': '/assets/built.png' }))
import { podlite } from 'podlite'
import { convertPodNodeToHtml } from '../src/utils'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'
const tree = (text: string): any => {
  const p = podlite({ importPlugins: true })
  return p.toAst(p.parse(`=begin pod\n${text}\n=end pod\n`, { podMode: 1 }))
}
const render = (text: string): string => convertPodNodeToHtml(tree(text))
const logo = (attrs = '') => `=begin data :key<Logo> :mime-type<image/png> :encoding<base64>${attrs}\n${PNG}\n=end data`
const images = (node: any, found: any[] = []): any[] => {
  if (Array.isArray(node)) node.forEach(n => images(n, found))
  else if (node && typeof node === 'object') {
    if (node.type === 'image') found.push(node)
    if (node.content && typeof node.content === 'object') images(node.content, found)
  }
  return found
}

describe('a data: picture on the site', () => {
  const picture = '=for picture :src<data:Logo> :alt<Logo> :link<https://x.test/>\n'

  it('is drawn from the data URL of its block, inside its link and with its text', () => {
    expect(images(tree(`${picture}\n${logo()}`))[0].dataUrl).toBe(`data:image/png;base64,${PNG}`)
    const html = render(`${picture}\n${logo()}`)
    const anchor = html.match(/<a [^>]*>[\s\S]*?<\/a>/)?.[0] ?? ''
    expect(anchor).toContain('href="https://x.test/"')
    expect(anchor).toContain(`src="data:image/png;base64,${PNG}"`)
    expect(anchor).toContain('alt="Logo"')
  })

  it('is a video by the type of its data URL', () => {
    const html = render(
      '=for picture :src<data:Clip>\n\n=begin data :key<Clip> :mime-type<video/webm> :encoding<base64>\nGkXfow==\n=end data',
    )
    expect(html).toContain('<video')
    expect(html).toContain('<source src="data:video/webm;base64,GkXfow==" type="video/webm"/>')
  })

  it('keeps its reference and no bytes when its block is hidden', () => {
    const html = render(`=for picture :src<data:Logo> :alt<Logo>\n\n${logo(' :masked')}`)
    const img = html.match(/<img [^>]*>/)?.[0] ?? ''
    expect(img).toContain('src="data:Logo"')
    expect(img).toContain('alt="Logo"')
    expect(img).not.toContain(PNG)
  })

  it('keeps its reference and hides its text when the picture is hidden', () => {
    const html = render(`=for picture :src<data:Logo> :alt<Logo> :masked\n\n${logo()}`)
    const img = html.match(/<img [^>]*>/)?.[0] ?? ''
    expect(img).toContain('src="data:Logo"')
    expect(img).toContain('alt="████"')
    expect(img).not.toContain(PNG)
  })
})

describe('a picture from :src on the site', () => {
  it('draws a ready address with any scheme but file: as written', () => {
    expect(render(`=for picture :src<DATA:image/png;base64,${PNG}>\n`)).toContain(`src="DATA:image/png;base64,${PNG}"`)
    expect(render('=for picture :src<foo+bar.2-x:logo>\n')).toContain('src="foo+bar.2-x:logo"')
    expect(render('=for picture :src<https://x.test/a.png>\n')).toContain('src="https://x.test/a.png"')
  })

  it('draws a picture of the build, its caption with it', () => {
    const html = render('=begin picture :src<built.png>\nThe B<caption>.\n=end picture\n')
    expect(html).toMatch(/src="[^"]*built.png"/)
    expect(html).toContain('<strong>caption</strong>')
  })

  it('names a local picture it does not have', () => {
    expect(render('=for picture :src<missing.png>\n')).toContain('<span class="image-missing">missing.png</span>')
  })
})
