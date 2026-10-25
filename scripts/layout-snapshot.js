#!/usr/bin/env node
// Takes the snapshot the layout test measures: five live pages as drawn, the
// styles of their sites with the podlite-web layer cut out, and the layer of the
// working tree as the reference. Run by hand; `yarn test` only reads the result.
//
//   node scripts/layout-snapshot.js            write only if the working layer draws the pages as published
//   node scripts/layout-snapshot.js --accept   write anyway and note that the layer differs from the published one
//
// A snapshot that does not draw a page as the browser drew it live is never written.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const lib = require('./layout-lib')

const UA = 'Mozilla/5.0 (podlite-web layout snapshot)'
const PAGES = [
  { name: 'podlite-org-specification', url: 'https://podlite.org/specification' },
  { name: 'podlite-org-home', url: 'https://podlite.org/' },
  { name: 'podlite-org-cli', url: 'https://podlite.org/cli' },
  { name: 'zag-im-home', url: 'https://zag.im/' },
  { name: 'zahatski-com-home', url: 'https://zahatski.com/' },
]
const accept = process.argv.includes('--accept')
const hash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
const nextFrame = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))

// The page as the browser drew it. Fonts are not loaded, as in the test, so that the
// live page and its snapshot fall back to the same fonts. Lazy images are made to
// load and are kept as pictures the test answers image requests with. The
// wide blocks are measured live at each width before the page is serialised.
const capture = async (browser, url) => {
  const page = await browser.newPage()
  await page.setUserAgent(UA)
  await page.setRequestInterception(true)
  page.on('request', req => (req.resourceType() === 'font' ? req.abort() : req.continue()))
  await page.setViewport({ width: lib.WIDTHS[0], height: lib.HEIGHT })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 })
  const broken = await page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')]
    images.forEach(img => img.setAttribute('loading', 'eager'))
    await Promise.all(
      images.map(img =>
        img.complete
          ? null
          : new Promise(done => {
              img.addEventListener('load', done, { once: true })
              img.addEventListener('error', done, { once: true })
            }),
      ),
    )
    await Promise.all(images.map(img => img.decode().catch(() => null)))
    return images.filter(img => img.getAttribute('src') && !img.naturalWidth).map(img => img.getAttribute('src'))
  })
  if (broken.length) throw new Error(`${url}: images that did not load: ${broken.slice(0, 5).join(', ')}`)
  await page.addStyleTag({ content: lib.STILL })
  const live = {}
  for (const width of lib.WIDTHS) {
    await page.setViewport({ width, height: lib.HEIGHT })
    await nextFrame(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    live[width] = await lib.readBlocks(page)
  }
  // The pictures the test answers image requests with: an SVG image keeps its own file
  // (it may have no size of its own and take the size of its box), any other image is
  // an empty picture of its natural size. The address in the page stays as written, so
  // a rule that picks an image by its address still applies (podlite.org /cli header).
  const images = await page.evaluate(async () => {
    const out = {}
    for (const img of document.querySelectorAll('img')) {
      const src = img.currentSrc || img.src
      if (!src || out[src] || !img.naturalWidth) continue
      const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}"/>`
      try {
        const res = await fetch(src)
        out[src] = /svg/.test(res.headers.get('content-type') || '') ? await res.text() : placeholder
      } catch (e) {
        out[src] = placeholder
      }
    }
    return out
  })
  const result = await page.evaluate(
    (mark, still) => {
      // an image drawn from a srcset keeps the one source it was drawn from
      document.querySelectorAll('img[srcset]').forEach(img => {
        img.setAttribute('src', img.currentSrc)
        img.removeAttribute('srcset')
        img.removeAttribute('sizes')
      })
      // the rule added for the live measure goes; the test adds the same rule itself
      document.querySelectorAll('style').forEach(s => s.textContent === still && s.remove())
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
      const css = links.map(l => l.href).filter(h => /\/_next\/static\/css\//.test(h))
      links.forEach(l => l.remove())
      document
        .querySelectorAll('script, link[rel="preload"], link[rel="modulepreload"], link[rel="prefetch"]')
        .forEach(n => n.remove())
      // relative addresses resolve against the site, as they did live
      document.head.insertAdjacentHTML('afterbegin', `<base href="${location.origin}/">`)
      document.head.insertAdjacentHTML('beforeend', mark)
      return { html: '<!DOCTYPE html>' + document.documentElement.outerHTML, css }
    },
    lib.STYLES_MARK,
    lib.STILL,
  )
  await page.close()
  if (result.css.length !== 1) throw new Error(`${url}: expected one site stylesheet, found ${result.css.length}`)
  return { html: result.html, cssUrl: result.css[0], live, images }
}

const main = async () => {
  // a run stopped between the two renames below leaves the previous set aside: put it back
  const old = lib.LAYOUT_DIR + '.old'
  if (!fs.existsSync(lib.LAYOUT_DIR) && fs.existsSync(old)) fs.renameSync(old, lib.LAYOUT_DIR)
  const browser = await lib.launch()
  const working = lib.workingLayer()
  const manifest = { taken: new Date().toISOString(), chrome: await browser.version(), accepted: accept, pages: {} }
  const out = { pages: {}, sites: {}, images: {} }
  const broken = []
  const refused = []
  try {
    const offline = await lib.offlinePage(browser)
    for (const p of PAGES) {
      const { html, cssUrl, live, images } = await capture(browser, p.url)
      out.images[p.name] = images
      const res = await fetch(cssUrl, { headers: { 'user-agent': UA } })
      if (!res.ok) throw new Error(`${cssUrl}: ${res.status}`)
      const { before, layer, after } = lib.cutLayer(await res.text())
      const site = new URL(p.url).host
      out.sites[site] = { before, after }
      out.pages[p.name] = html
      const blocks = {}
      for (const width of lib.WIDTHS) {
        const published = await lib.measure(offline, html, before + layer + after, width, undefined, images)
        if (!published.length) broken.push(`${p.name} @${width}: no wide blocks`)
        // the snapshot keeps the page as drawn live: --accept does not lift this
        const kept = lib.compare(live[width], published)
        if (kept.length)
          broken.push(
            `${p.name} @${width}: the snapshot does not draw the page as it was drawn live\n  ` + kept.join('\n  '),
          )
        // the working layer draws the snapshot as the published one: --accept lifts this
        const diffs = lib.compare(
          published,
          await lib.measure(offline, html, before + working + after, width, undefined, images),
        )
        if (diffs.length) refused.push(`${p.name} @${width}: the working layer moves blocks\n  ` + diffs.join('\n  '))
        blocks[width] = published.length
      }
      manifest.pages[p.name] = { url: p.url, site, css: cssUrl, blocks, html: hash(html) }
      console.log(`${p.name}: ${JSON.stringify(blocks)} wide blocks`)
    }
  } finally {
    await browser.close()
  }
  if (broken.length) {
    console.error('Snapshot not written, it does not keep the pages:\n' + broken.join('\n'))
    process.exit(1)
  }
  if (refused.length && !accept) {
    console.error('Snapshot not written:\n' + refused.join('\n'))
    process.exit(1)
  }
  if (refused.length) manifest.differsFromPublished = refused
  // the set is written aside and put in place whole, so a failed write leaves the old one
  const dir = lib.LAYOUT_DIR + '.new'
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'pages'), { recursive: true })
  for (const [name, html] of Object.entries(out.pages)) fs.writeFileSync(path.join(dir, 'pages', name + '.html'), html)
  for (const [name, images] of Object.entries(out.images))
    fs.writeFileSync(path.join(dir, 'pages', name + '.images.json'), JSON.stringify(images, null, 1) + '\n')
  for (const [site, { before, after }] of Object.entries(out.sites)) {
    fs.mkdirSync(path.join(dir, 'sites', site), { recursive: true })
    fs.writeFileSync(path.join(dir, 'sites', site, 'before.css'), before)
    fs.writeFileSync(path.join(dir, 'sites', site, 'after.css'), after)
  }
  fs.mkdirSync(path.join(dir, 'reference'), { recursive: true })
  for (const f of lib.LAYER_FILES)
    fs.copyFileSync(path.join(__dirname, '..', 'src', 'styles', f + '.css'), path.join(dir, 'reference', f + '.css'))
  manifest.reference = hash(lib.readLayer(path.join(dir, 'reference')))
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  fs.rmSync(old, { recursive: true, force: true })
  if (fs.existsSync(lib.LAYOUT_DIR)) fs.renameSync(lib.LAYOUT_DIR, old)
  fs.renameSync(dir, lib.LAYOUT_DIR)
  fs.rmSync(old, { recursive: true, force: true })
  console.log(`Snapshot written to ${path.relative(process.cwd(), lib.LAYOUT_DIR)}`)
}

main().catch(e => {
  console.error(e.message)
  process.exit(1)
})
