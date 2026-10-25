// Shared by the layout snapshot script and the layout test: where the podlite-web
// style layer sits in a site's CSS, how a page is drawn offline, and how the wide
// blocks of a page are measured and compared.
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')

const ROOT = path.join(__dirname, '..')
const LAYOUT_DIR = path.join(ROOT, 't', 'layout')
const LAYER_FILES = ['screen', 'global', 'tests']
const WIDTHS = [1280, 1600, 390]
const HEIGHT = 900
// Blocks that take more than the text column or set its edge
const WIDE = 'table, div.image_block, div.video, div.editor-block, code.shiki, section>header, figure, iframe'
const STILL = '*{transition:none!important;animation:none!important}'
const TOLERANCE = 1
const STYLES_MARK = '<!--layout-styles-->'

const chromePath = () => {
  const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  const found = candidates.find(p => p && fs.existsSync(p))
  if (!found)
    throw new Error('No Chrome to measure the layout with: set CHROME_PATH to the Chrome or Chromium executable')
  return found
}

const launch = () => require('puppeteer-core').launch({ executablePath: chromePath(), headless: true })

// The layer runs from the one :root rule to the first rule of Editor.css after it
const END_ANCHOR = /^\[data-color-mode\*=['"]?dark['"]?\] \.podlite-editor$/
const cutLayer = css => {
  const nodes = postcss.parse(css).nodes
  const starts = nodes.map((n, i) => (n.type === 'rule' && n.selector === ':root' ? i : -1)).filter(i => i >= 0)
  if (starts.length !== 1) throw new Error(`expected one :root rule, found ${starts.length}`)
  const end = nodes.findIndex((n, i) => i > starts[0] && n.type === 'rule' && END_ANCHOR.test(n.selector))
  if (end < 0) throw new Error('no Editor.css rule after the :root rule')
  const text = list => list.map(n => n.toString()).join('\n')
  return {
    before: text(nodes.slice(0, starts[0])),
    layer: text(nodes.slice(starts[0], end)),
    after: text(nodes.slice(end)),
  }
}

const readLayer = dir => LAYER_FILES.map(f => fs.readFileSync(path.join(dir, f + '.css'), 'utf8')).join('\n')
const workingLayer = () => readLayer(path.join(ROOT, 'src', 'styles'))
const referenceLayer = () => readLayer(path.join(LAYOUT_DIR, 'reference'))

// A page that asks the network for nothing: image requests are answered from the
// snapshot, everything else is refused, so fonts fall back the same way for both layers.
const offlinePage = async browser => {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', req => {
    const picture = page.layoutImages && page.layoutImages[req.url()]
    if (picture) req.respond({ status: 200, contentType: 'image/svg+xml', body: picture })
    else if (req.isNavigationRequest()) req.continue()
    else {
      if (req.resourceType() === 'image' && page.layoutMissing) page.layoutMissing.push(req.url())
      req.abort()
    }
  })
  return page
}

// The wide blocks of the page now drawn, in document order. `direct` marks a block
// that is a child of the article itself, the place where f224f0d moved tables.
const readBlocks = (page, moved) =>
  page.evaluate(
    (selector, movedIndex) => {
      // what the editor draws inside itself is its own business; the editor block is measured
      const blocks = Array.prototype.slice
        // no spread here: the test compiles this file, and a spread helper does not reach the page
        .call(document.querySelectorAll(selector))
        .filter(el => !(el.parentElement && el.parentElement.closest('div.editor-block')))
      if (movedIndex !== undefined && blocks[movedIndex]) {
        blocks[movedIndex].style.setProperty('position', 'relative', 'important')
        blocks[movedIndex].style.setProperty('left', '10px', 'important')
      }
      return blocks.map(el => {
        const r = el.getBoundingClientRect()
        const name =
          el.tagName.toLowerCase() +
          (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')
        const direct = !!el.parentElement && el.parentElement.tagName === 'ARTICLE'
        return { name, direct, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height }
      })
    },
    WIDE,
    moved,
  )

// Draws the snapshot with the given styles at the given width; `moved` shifts one
// block by 10px to show the comparison sees it; `images` answers the image requests of the page
const measure = async (page, html, css, width, moved, images) => {
  page.layoutImages = images || {}
  page.layoutMissing = []
  await page.setViewport({ width, height: HEIGHT })
  await page.setContent(html.replace(STYLES_MARK, `<style>${css}\n${STILL}</style>`), { waitUntil: 'load' })
  // an image the snapshot cannot answer would be drawn at another size
  if (images && page.layoutMissing.length) {
    // a picture a stylesheet asks for is not part of the snapshot and is left out
    const pictures = await page.evaluate(() =>
      Array.prototype.map.call(document.images, img => img.currentSrc || img.src),
    )
    const unanswered = page.layoutMissing.filter(url => pictures.includes(url))
    if (unanswered.length) throw new Error(`images not in the snapshot: ${unanswered.join(', ')}`)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  return readBlocks(page, moved)
}

// Each block against its counterpart in document order; a block that is gone is a difference too
const compare = (expected, actual) => {
  const diffs = []
  if (expected.length !== actual.length) diffs.push(`${expected.length} wide blocks expected, ${actual.length} found`)
  expected.forEach((e, i) => {
    const a = actual[i]
    if (!a) return
    if (a.name !== e.name) diffs.push(`#${i} ${e.name} became ${a.name}`)
    for (const f of ['left', 'top', 'width', 'height'])
      if (Math.abs(e[f] - a[f]) > TOLERANCE) diffs.push(`#${i} ${e.name} ${f}: ${e[f]} → ${a[f]}`)
  })
  return diffs
}

module.exports = {
  LAYOUT_DIR,
  LAYER_FILES,
  WIDTHS,
  WIDE,
  STYLES_MARK,
  chromePath,
  launch,
  cutLayer,
  readLayer,
  workingLayer,
  referenceLayer,
  offlinePage,
  STILL,
  HEIGHT,
  readBlocks,
  measure,
  compare,
}
