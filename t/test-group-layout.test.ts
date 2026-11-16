// The block a test of the specification follows keeps its place in the text column:
// on a wide page the test stands in the right margin, and the block stands where it
// stands with no test after it. Drawn with the podlite-web style layer of the working tree.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../scripts/layout-lib')

jest.setTimeout(120000)

type Box = { tag: string; left: number; width: number }

const picture = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%2250%22/%3E'

// The first blocks @podlite/to-jsx gives a test group: a paragraph, nested and folded
// blocks, lists, code with and without highlighting, a notification, a boundary, a
// picture, a formula and a table, bare and folded
const BLOCKS: Record<string, string> = {
  paragraph: '<p>Short.</p>',
  nested: '<blockquote><p>Quoted.</p></blockquote>',
  folded:
    '<details class="folded"><summary class="folded-summary">More</summary><div class="folded-content"><p>Text</p></div></details>',
  'unordered list': '<ul><li>One</li></ul>',
  'ordered list': '<ol><li>One</li></ol>',
  'task list': '<ul class="task-list"><li class="task-list-item"><input type="checkbox">One</li></ul>',
  definitions: '<dl><dt>Term</dt><dd>Text</dd></dl>',
  code: '<pre><code>code</code></pre>',
  'code block': '<div class="code-block"><pre><code>code</code></pre><div class="caption">Caption</div></div>',
  highlighted: '<code class="shiki"><pre><code>code</code></pre></code>',
  notification: '<aside class="notifynote"><p class="notify-title">Note</p><p>Text</p></aside>',
  boundary: '<hr>',
  picture: `<div class="image_block"><img src="${picture}"></div>`,
  formula: '<div class="formula"><span>x</span></div>',
  table: '<table><tr><td>a</td><td>b</td></tr></table>',
  'folded table':
    '<details class="folded table-folded"><summary class="folded-summary">Table</summary><div class="folded-content"><table><tr><td>a</td></tr></table></div></details>',
}

// Blocks with no width limit of their own: they fill the article, not the text column
const UNLIMITED = ['code block', 'highlighted', 'formula']

const TEST =
  '<details class="test"><summary class="test-summary">test</summary><div class="test-body">body</div></details>'

const page = (css: string) =>
  `<!DOCTYPE html><html><head><style>${css}\n${lib.STILL}</style></head><body><main><article>` +
  '<p class="column">A paragraph with no test after it.</p>' +
  Object.entries(BLOCKS)
    .map(([kind, html]) => `<div class="test-group" data-kind="${kind}">${html}${TEST}</div>`)
    .join('') +
  '</article></main></body></html>'

// Where the block stands without a test: with no page container no rule of the wide layout
// applies, the group is a plain block, and the test is out of the way
const WITHOUT_TEST =
  'main { container-type: normal !important } .test-group > details.test { display: none !important }'
// The same group held to one text column: a block with a width limit stands as in the article,
// a block without one takes the column, as it does in the grid
const IN_COLUMN =
  WITHOUT_TEST +
  ' .test-group { max-width: var(--spacing-width-max) !important; margin-left: auto !important; margin-right: auto !important }'

let browser: any
let tab: any
beforeAll(async () => {
  browser = await lib.launch()
  tab = await lib.offlinePage(browser)
}, 120000)
afterAll(async () => {
  if (browser) await browser.close()
})

// The boxes of the first block of each group and of everything inside it
const draw = async (css: string, width: number): Promise<Record<string, Box[]>> => {
  await tab.setViewport({ width, height: lib.HEIGHT })
  await tab.setContent(page(css), { waitUntil: 'load' })
  return tab.evaluate(() => {
    const out: Record<string, { tag: string; left: number; width: number }[]> = {}
    document.querySelectorAll('.test-group').forEach(g => {
      const first = g.firstElementChild as HTMLElement
      const els = [first].concat(Array.prototype.slice.call(first.querySelectorAll('*')))
      out[(g as HTMLElement).dataset.kind || ''] = els.map((el: Element) => {
        const r = el.getBoundingClientRect()
        return { tag: el.tagName.toLowerCase(), left: r.left, width: r.width }
      })
    })
    return out
  })
}

const misplaced = (expected: Record<string, Box[]>, actual: Record<string, Box[]>, kinds: string[]) =>
  kinds.flatMap(kind =>
    expected[kind]
      .map((e, i) => ({ e, a: actual[kind][i] }))
      .filter(({ e, a }) => Math.abs(e.left - a.left) > 1 || Math.abs(e.width - a.width) > 1)
      .map(
        ({ e, a }) =>
          `${kind} ${e.tag}: ${Math.round(a.left)}/${Math.round(a.width)}, expected ${Math.round(e.left)}/${Math.round(
            e.width,
          )}`,
      ),
  )

const ALL = Object.keys(BLOCKS)
const LIMITED = ALL.filter(kind => !UNLIMITED.includes(kind))

describe('the first block of a test group', () => {
  it('stands in the text column as it does without the grid on a wide page', async () => {
    const layer = lib.workingLayer()
    const expected = await draw(layer + IN_COLUMN, 1600)
    const actual = await draw(layer, 1600)
    expect(misplaced(expected, actual, ALL)).toEqual([])
  })

  it('stands where it stands without the test on a narrow page', async () => {
    const layer = lib.workingLayer()
    const expected = await draw(layer + WITHOUT_TEST, 1000)
    const actual = await draw(layer, 1000)
    expect(misplaced(expected, actual, ALL)).toEqual([])
  })
})

describe('a group held to one text column', () => {
  it('draws a block with a width limit as the article does', async () => {
    const layer = lib.workingLayer()
    const article = await draw(layer + WITHOUT_TEST, 1600)
    const column = await draw(layer + IN_COLUMN, 1600)
    expect(misplaced(article, column, LIMITED)).toEqual([])
  })
})

describe('the line of a test on a wide page', () => {
  it('stands in the right margin, past the text column', async () => {
    await draw(lib.workingLayer(), 1600)
    const gaps = await tab.evaluate(() => {
      // a paragraph with no test is as wide as the text column
      const column = (document.querySelector('p.column') as HTMLElement).getBoundingClientRect()
      return Array.prototype.map.call(document.querySelectorAll('.test-group'), (g: HTMLElement) => {
        const line = (g.querySelector('summary.test-summary') as HTMLElement).getBoundingClientRect()
        return line.left - column.right
      })
    })
    expect(gaps.length).toBe(ALL.length)
    expect(gaps.filter((gap: number) => gap <= 0)).toEqual([])
  })
})
