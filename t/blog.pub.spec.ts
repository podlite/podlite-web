import { getParserTypeforFile, parseFile } from '../src/node-utils'
import { validatePodliteAst } from '@podlite/schema'
import { separateFilesByPlugin } from 'src/plugins'

it('process files', () => {
  const glob = require('glob')
  const arr = glob.sync('./t/test-blog.pub/*')
  const config = {
    plugins: [
      {
        name: 'blog.pub',
        includePatterns: 'dir1/',
      },
      {
        name: 'blog.pub',
        includePatterns: 'dir2/',
        excludePatterns: 'dir2/mod3',
      },
      {
        name: 'default',
        excludePatterns: '.*', // reject all files by default
      },
    ],
  }
  console.log(JSON.stringify(arr, null, 2))
  // expect(arr.length).toEqual(2)
})
it('parseFiles', () => {
  // console.log(parseToHtml(nodes));
  // expect(parseToHtml(pod)).toMatchInlineSnapshot(
  // expect(true).toEqual(true)
})
it('collect rejected', () => {
  const config = {
    plugins: [
      {
        name: 'blog.pub',
        includePatterns: 'dir1/',
      },
      {
        name: 'blog.pub',
        includePatterns: 'dir2/',
        excludePatterns: 'dir2/mod3',
      },
      {
        name: 'default',
        excludePatterns: '.*', // reject all files by default
      },
    ],
  }

  const allFiles = [
    't/dir1/index.component.spec.tsx',
    't/dir2/mod1/test-linking/dst.pod6',
    't/dir2/mod3/test-linking/dst.pod6',
    't/dir3/mod3/test-linking/dst.pod6',
    'index.pod6',
  ]
  const results = separateFilesByPlugin(allFiles, config)
  expect(results).toMatchInlineSnapshot(`
    Object {
      "blog.pub": Array [
        "t/dir1/index.component.spec.tsx",
        "t/dir2/mod1/test-linking/dst.pod6",
      ],
      "default": Array [],
      "rejected": Array [
        "t/dir2/mod3/test-linking/dst.pod6",
        "t/dir3/mod3/test-linking/dst.pod6",
        "index.pod6",
      ],
    }
  `)
})

it('detect parser type', () => {
  expect(getParserTypeforFile('somefile.txt')).toEqual('default')
  expect(getParserTypeforFile('somefile.pod6')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.podlite')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.md')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.markdown')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.tsx')).toEqual('default')
})

it ('parse podlite file 1', () => {
    const p = parseFile('t/test-parse/file.pod6')
    const r = validatePodliteAst(p)
    expect(r).toEqual([])
})
it ('parse podlite file 2', () => {
    const p = parseFile('t/test-parse/file.podlite')
    const r = validatePodliteAst(p)
    expect(r).toEqual([])
})
it ('parse default file: ', () => {
    const p = parseFile('t/test-parse/main.ts')
    const r = validatePodliteAst(p)
    expect(r).toEqual([])
})
it ('parse markdown file', () => {
    const p = parseFile('t/test-parse/text.md')
    const r = validatePodliteAst(p)
    expect(r).toEqual([])
})