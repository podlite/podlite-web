import makeInterator from '@podlite/schema/lib/ast-inerator'
import { addUrl, publishRecord } from '../src/shared'
import { convertFileLinksToUrl, parseFiles } from '../src/node-utils'
import { getTextContentFromNode } from '@podlite/schema'
import { separateFilesByPlugin } from 'src/plugins'

it('parseFiles', () => {
  const arr = parseFiles('./t/test-blog.pub/*')
//   console.log(JSON.stringify(arr, null, 2))
  //   expect(arr.length).toEqual(2)
  // console.log(parseToHtml(nodes));
  // expect(parseToHtml(pod)).toMatchInlineSnapshot(
  // expect(true).toEqual(true)
})
it('collect links', () => {
  const arr = parseFiles('./t/test-linking/*.pod6')
  const converted = convertFileLinksToUrl(addUrl(arr as publishRecord[]))
  const res = converted
    .map(({ node }) => {
      let links: any[] = []
      makeInterator({
        'L<>': ({ content, meta }) => {
          links = [...links, meta ? meta : getTextContentFromNode(content)]
        },
      })(node, {})
      return links
    })
    .flat()

  expect(res).toMatchInlineSnapshot(`
    Array [
      "/2023/4/1/2",
    ]
  `)
})

// lets test pocess files depeends in their location
it('process based on selectings', () => {
  const config = {
    plugins: [
      {
        name: 'blog.pub',
        includePatterns: 'dir1/',
      },
      {
        name: 'default',
        excludePatterns: '.*', // reject all files by default
      },
    ],
  }

  const allFiles = ['t/dir1/index.component.spec.tsx', 't/test-linking/dst.pod6', 't/test-linking/src.pod6']
  const results = separateFilesByPlugin(allFiles, config)
  expect(results).toMatchInlineSnapshot(`
    Object {
      "blog.pub": Array [
        "t/dir1/index.component.spec.tsx",
      ],
      "default": Array [],
      "rejected": Array [
        "t/test-linking/dst.pod6",
        "t/test-linking/src.pod6",
      ],
    }
  `)
})

// lets test pocess files depeends in their location
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
        "t/dir2/mod3/test-linking/dst.pod6",
      ],
      "default": Array [],
      "rejected": Array [
        "t/dir3/mod3/test-linking/dst.pod6",
        "index.pod6",
      ],
    }
  `)
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
