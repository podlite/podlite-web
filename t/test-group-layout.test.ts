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

// A test line as the renderer writes it, with its label and caption
const line = (id: string) =>
  `<details class="test" id="${id}"><summary class="test-summary"><span class="test-label">test</span> ` +
  '<span class="test-caption">A caption of several words</span></summary><div class="test-body">body</div></details>'

const listPage = () =>
  `<!DOCTYPE html><html><head><style>${lib.workingLayer()}\n${lib.STILL}</style></head><body><main><article>` +
  '<p class="column">A paragraph with no test after it.</p>' +
  `<dl><dt>Term</dt><dd>Text</dd><div class="test-group"><p class="first">Short.</p>${line('in-list')}${line(
    'in-list-2',
  )}</div></dl>` +
  `<dl dir="rtl"><dt>Term</dt><dd>Text</dd><div class="test-group"><p>Short.</p>${line('in-rtl-list')}</div></dl>` +
  `<blockquote><div class="test-group"><p class="quoted">Quoted.</p>${line('in-quote')}</div></blockquote>` +
  `<div class="test-group"><p>Short.</p>${line('top')}</div>` +
  '</article></main></body></html>'

// each page starts clean: a pointer left over a line would hover the next page's line, and
// a fragment left in the address would make a test the target
const showList = async (width: number) => {
  await tab.mouse.move(0, 0)
  await tab.goto('about:blank')
  await tab.setViewport({ width, height: lib.HEIGHT })
  await tab.setContent(listPage(), { waitUntil: 'load' })
}

type Rect = { left: number; right: number; width: number; top: number; bottom: number }

const box = (selector: string): Promise<Rect> =>
  tab.evaluate((s: string) => {
    const r = (document.querySelector(s) as HTMLElement).getBoundingClientRect()
    return { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom }
  }, selector)

describe('a test group inside a definition list on a wide page', () => {
  it('puts every line of a test in the right margin, with room for its caption', async () => {
    await showList(1600)
    const lines = await tab.evaluate(() => {
      const column = (document.querySelector('p.column') as HTMLElement).getBoundingClientRect()
      const main = (document.querySelector('main') as HTMLElement).getBoundingClientRect()
      return Array.prototype.map.call(
        document.querySelectorAll('dl:not([dir]) summary.test-summary'),
        (el: HTMLElement) => {
          const r = el.getBoundingClientRect()
          return { past: r.left > column.right, width: r.width, inside: r.right <= main.right }
        },
      )
    })
    // the first line stands in the row of its block, not below it
    const [group, block, first] = [
      await box('dl:not([dir]) > .test-group'),
      await box('dl p.first'),
      await box('#in-list > summary'),
    ]
    expect(first.top).toBeGreaterThanOrEqual(group.top - 1)
    expect(first.top).toBeLessThan(block.bottom)
    expect(lines.length).toBe(2)
    lines.forEach((l: { past: boolean; width: number; inside: boolean }) => {
      expect(l.past).toBe(true)
      expect(l.width).toBeGreaterThan(100)
      expect(l.inside).toBe(true)
    })
  })

  it('keeps the first block in the text column', async () => {
    await showList(1600)
    const [column, first] = [await box('p.column'), await box('dl p.first')]
    expect(Math.abs(first.left - column.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(first.width - column.width)).toBeLessThanOrEqual(1)
  })

  it('stays on the page when the list is written right to left', async () => {
    await showList(1600)
    const [main, group] = [await box('main'), await box('dl[dir="rtl"] > .test-group')]
    expect(group.left).toBeGreaterThanOrEqual(main.left - 1)
    expect(group.right).toBeLessThanOrEqual(main.right + 1)
  })

  it('is printed within the list', async () => {
    await tab.emulateMediaType('print')
    try {
      await showList(1600)
      const [list, group] = [await box('dl'), await box('dl:not([dir]) > .test-group')]
      expect(Math.abs(group.left - list.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(group.width - list.width)).toBeLessThanOrEqual(1)
    } finally {
      await tab.emulateMediaType(null)
    }
  })
})

describe('a test group inside a quotation on a wide page', () => {
  it('stays within the inset of the quotation', async () => {
    await showList(1600)
    const inner = await tab.evaluate(() => {
      const quote = document.querySelector('blockquote') as HTMLElement
      const r = quote.getBoundingClientRect()
      const st = getComputedStyle(quote)
      const px = (v: string) => parseFloat(v) || 0
      return {
        left: r.left + px(st.borderLeftWidth) + px(st.paddingLeft),
        right: r.right - px(st.borderRightWidth) - px(st.paddingRight),
      }
    })
    const group = await box('blockquote > .test-group')
    expect(group.left).toBeGreaterThanOrEqual(inner.left - 1)
    expect(group.right).toBeLessThanOrEqual(inner.right + 1)
  })
})

type Colours = { caption: string; label: string; labelBackground: string; stripe: string; text: string }

const colours = (id: string): Promise<Colours> =>
  tab.evaluate((testId: string) => {
    const summary = document.querySelector(`#${testId} > summary.test-summary`) as HTMLElement
    const style = (el: Element) => getComputedStyle(el)
    return {
      caption: style(summary.querySelector('.test-caption') as Element).color,
      label: style(summary.querySelector('.test-label') as Element).color,
      labelBackground: style(summary.querySelector('.test-label') as Element).backgroundColor,
      stripe: style(summary).borderLeftColor,
      text: style(document.querySelector('p.column') as Element).color,
    }
  }, id)

const ACTIVE = 'rgb(91, 184, 232)'
const active = (c: Colours) => [c.caption, c.label, c.labelBackground, c.stripe]

describe('the line of a test on a narrow page', () => {
  it('is grey while nothing points at it', async () => {
    await showList(1000)
    const quiet = await colours('top')
    expect([quiet.caption, quiet.label, quiet.labelBackground, quiet.stripe]).toEqual([
      'rgb(107, 114, 128)',
      'rgb(107, 114, 128)',
      'rgba(0, 0, 0, 0)',
      'rgb(229, 231, 235)',
    ])
  })

  it('takes the colours of the text and of its label when hovered', async () => {
    await showList(1000)
    await tab.hover('#top > summary.test-summary')
    const c = await colours('top')
    expect(active(c)).toEqual([c.text, 'rgb(255, 255, 255)', ACTIVE, ACTIVE])
  })

  it('takes them when focused from the keyboard', async () => {
    await showList(1000)
    // Tab through the page until the line at the top level has the focus
    let focused: string | undefined
    for (let i = 0; i < 10 && focused !== 'top'; i++) {
      await tab.keyboard.press('Tab')
      focused = await tab.evaluate(() => document.activeElement?.parentElement?.id)
    }
    expect(focused).toBe('top')
    const ring = await tab.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle)
    expect(ring).not.toBe('none')
    const c = await colours('top')
    expect(active(c)).toEqual([c.text, 'rgb(255, 255, 255)', ACTIVE, ACTIVE])
  })

  it('takes them when the test is open', async () => {
    await showList(1000)
    await tab.evaluate(() => document.querySelector('#top')?.setAttribute('open', ''))
    const c = await colours('top')
    expect(active(c)).toEqual([c.text, 'rgb(255, 255, 255)', ACTIVE, ACTIVE])
  })

  it('takes them when a link leads to the test', async () => {
    await showList(1000)
    await tab.evaluate(() => {
      location.hash = '#top'
    })
    const c = await colours('top')
    expect(active(c)).toEqual([c.text, 'rgb(255, 255, 255)', ACTIVE, ACTIVE])
  })
})

describe('the colours of a test line on a wide page', () => {
  it('stay those of the text and of its label', async () => {
    await showList(1600)
    const wide = await colours('top')
    expect([wide.caption, wide.labelBackground]).toEqual([wide.text, 'rgb(232, 245, 252)'])
  })
})
