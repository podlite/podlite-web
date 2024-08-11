import { getParserTypeforFile, parseFile, parseSources } from '../src/node-utils'
import { validatePodliteAst } from '@podlite/schema'
import { PluginConfig, PodliteWebPlugin, processPlugin } from 'src/plugins'
it('process files', () => {
  const glob = require('glob')
  const arr = glob.sync('./t/test-blog.pub/*')
  expect(arr.length).toEqual(2)
})
it('detect parser type', () => {
  expect(getParserTypeforFile('somefile.txt')).toEqual('default')
  expect(getParserTypeforFile('somefile.pod6')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.podlite')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.md')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.markdown')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.tsx')).toEqual('default')
})

it('parse podlite file 1', () => {
  const p = parseFile('t/test-parse/file.pod6')
  const r = validatePodliteAst(p)
  expect(r).toEqual([])
})
it('parse podlite file 2', () => {
  const p = parseFile('t/test-parse/file.podlite')
  const r = validatePodliteAst(p)
  expect(r).toEqual([])
})
it('parse default file: ', () => {
  const p = parseFile('t/test-parse/main.ts')
  const r = validatePodliteAst(p)
  expect(r).toEqual([])
})
it('parse markdown file', () => {
  const p = parseFile('t/test-parse/text.md')
  const r = validatePodliteAst(p)
  expect(r).toEqual([])
})

it('parse Source:  markdown file', () => {
  const [p] = parseSources('t/test-parse/text.md')
  //validate podlite
  const r = validatePodliteAst(p.node)
  expect(r).toEqual([])
  const { node, ...rest } = p
  expect(rest).toMatchInlineSnapshot(`
    Object {
      "author": Array [
        "Author One",
        "Author Two",
      ],
      "description": "This is the abstract.

    It consists of two paragraphs.
    ",
      "file": "t/test-parse/text.md",
      "footer": undefined,
      "pubdate": 2024-08-02T12:34:56.000Z,
      "publishUrl": "/about",
      "sources": Array [],
      "subtitle": undefined,
      "title": "My article",
      "type": "page",
    }
  `)
})

it('parse Source:  typescript file', () => {
  const [p] = parseSources('t/test-parse/main.ts')
  //validate podlite
  const r = validatePodliteAst(p.node)
  expect(r).toEqual([])
  const { node, ...rest } = p
  expect(rest).toMatchInlineSnapshot(`
    Object {
      "author": undefined,
      "description": "",
      "file": "t/test-parse/main.ts",
      "footer": "",
      "pubdate": undefined,
      "publishUrl": undefined,
      "sources": Array [],
      "subtitle": undefined,
      "title": "",
      "type": "page",
    }
  `)
})

it('parse Source:  podlite file', () => {
  const [p] = parseSources('t/test-parse/note.podlite')
  //validate podlite
  const r = validatePodliteAst(p.node)
  expect(r).toEqual([])
  const { node, ...rest } = p
  expect(rest).toMatchInlineSnapshot(`
    Object {
      "author": undefined,
      "description": "",
      "file": "t/test-parse/note.podlite",
      "footer": "",
      "pubdate": undefined,
      "publishUrl": undefined,
      "sources": Array [],
      "subtitle": undefined,
      "title": "The Last of the Mohicans
    ",
      "type": "page",
    }
  `)
})

// now lets make pipe tp process files

it('make pipe depends on config', () => {
  const items = parseSources('t/test-parse/*')

  const testPlugin = ({ title = 'processed' }): PodliteWebPlugin => {
    return [
      items => {
        return items.map(i => ({ ...i, title }))
      },
      ctx => ctx,
    ]
  }

  const config1: PluginConfig = {
    plugin: testPlugin({ title: 'test_title' }),
    includePatterns: '.*',
    excludePatterns: 'dir1/mod1',
  }

  expect(processPlugin(config1, items)[0].map(i => i.title)).toMatchInlineSnapshot(`
    Array [
      "test_title",
      "test_title",
      "test_title",
      "test_title",
      "test_title",
    ]
  `)
  const config2: PluginConfig = {
    plugin: testPlugin({ title: 'test_title' }),
    includePatterns: '.*',
    excludePatterns: 'dir1/mod1',
  }

  expect(processPlugin(config2, items)[0].map(i => i.title)).toMatchInlineSnapshot(`
    Array [
      "test_title",
      "test_title",
      "test_title",
      "test_title",
      "test_title",
    ]
  `)
})
