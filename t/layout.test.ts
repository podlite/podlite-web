// The place of wide blocks on five published pages, drawn with the reference
// style layer and with the layer of the working tree. A change to screen.css,
// global.css or tests.css that moves a table, a picture or a code block shows
// here before a release. The snapshot is taken by scripts/layout-snapshot.js.
import * as fs from 'fs'
import * as path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../scripts/layout-lib')

jest.setTimeout(120000)

type Block = { name: string; direct: boolean; left: number; top: number; width: number; height: number }

const manifest = JSON.parse(fs.readFileSync(path.join(lib.LAYOUT_DIR, 'manifest.json'), 'utf8'))
const read = (...parts: string[]) => fs.readFileSync(path.join(lib.LAYOUT_DIR, ...parts), 'utf8')
const snapshot = (name: string) => ({
  html: read('pages', name + '.html'),
  images: JSON.parse(read('pages', name + '.images.json')),
  before: read('sites', manifest.pages[name].site, 'before.css'),
  after: read('sites', manifest.pages[name].site, 'after.css'),
})

// The rule of f224f0d, which held tables against the edge of the article
const TABLES_TO_EDGE = 'article>table, article table, body table, main>table { margin-left:0 }'

let browser: any
let page: any
beforeAll(async () => {
  browser = await lib.launch()
  page = await lib.offlinePage(browser)
}, 120000)
afterAll(async () => {
  if (browser) await browser.close()
})

const draw = (name: string, layer: string, width: number, moved?: number): Promise<Block[]> => {
  const { html, images, before, after } = snapshot(name)
  return lib.measure(page, html, before + layer + after, width, moved, images)
}

describe.each(Object.keys(manifest.pages))('the wide blocks of %s', name => {
  it('stand where the reference styles put them', async () => {
    const reference = lib.referenceLayer()
    const working = lib.workingLayer()
    const problems: string[] = []
    for (const width of lib.WIDTHS) {
      const expected = await draw(name, reference, width)
      const recorded = manifest.pages[name].blocks[width]
      if (expected.length !== recorded)
        problems.push(`@${width}: the snapshot holds ${expected.length} wide blocks, ${recorded} recorded`)
      const actual = await draw(name, working, width)
      problems.push(...lib.compare(expected, actual).map((d: string) => `@${width}: ${d}`))
    }
    expect(problems).toEqual([])
  })

  // Each block is moved on its own, so a block is not counted as seen because its parent moved
  it('are each seen when moved', async () => {
    const working = lib.workingLayer()
    const unseen: string[] = []
    for (const width of lib.WIDTHS) {
      const still = await draw(name, working, width)
      expect(still.length).toBeGreaterThan(0)
      for (let i = 0; i < still.length; i++) {
        if (still[i].width === 0) continue
        const moved = await draw(name, working, width, i)
        if (!lib.compare([still[i]], [moved[i]]).length) unseen.push(`@${width} #${i} ${still[i].name}`)
      }
    }
    expect(unseen).toEqual([])
  })
})

describe('a table of the specification page that is a child of the article', () => {
  it('is seen leaving the text column when tables are held to the edge of the article', async () => {
    const working = lib.workingLayer()
    for (const width of [1280, 1600]) {
      const still = await draw('podlite-org-specification', working, width)
      const moved = await draw('podlite-org-specification', working + '\n' + TABLES_TO_EDGE, width)
      const i = still.findIndex(b => b.name.startsWith('table') && b.direct && b.width > 0)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(still[i].left - moved[i].left).toBeGreaterThan(1)
    }
  })
})
