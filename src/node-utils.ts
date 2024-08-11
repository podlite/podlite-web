import {
  getFromTree,
  getTextContentFromNode,
  makeAttrs,
  makeInterator,
  mkRootBlock,
  PodliteDocument,
  PodNode,
  RootBlock,
  Text,
} from '@podlite/schema'
import * as fs from 'fs'
import path from 'path'
import { getAllArticles, isExistsPubdate, makeAstFromSrc, pubRecord, publishRecord } from './shared'
import { parseMd } from '@podlite/markdown'
import { podlite } from 'podlite'
import matter from 'gray-matter'

const glob = require('glob')

export const getPathToOpen = (filepath, parentDocPath) => {
  const isRemoteReg = new RegExp(/^(https?|ftp):/)
  const isRemote = isRemoteReg.test(filepath)
  if (isRemote) {
    return { isRemote, path: filepath }
  }
  const path = require('path')
  const docDirPath = path.dirname(parentDocPath)
  return {
    isRemote,
    path: path.isAbsolute(filepath) ? filepath : path.normalize(path.join(docDirPath, filepath)),
  }
}

export const makeLinksMap = (records: publishRecord[]): { [link: string]: string } => {
  const linksMap = {
    ...Object.fromEntries(records.map(({ publishUrl = '', file }) => [getPathToOpen(file, './').path, publishUrl])),
  }
  return linksMap
}
export const convertFileLinksToUrl = (records: publishRecord[], additinalMap = {}): publishRecord[] => {
  const linksMap = { ...additinalMap, ...makeLinksMap(records) }
  const processed = records.map(item => {
    const converter = makeInterator({
      'L<>': (node, ctx, interator) => {
        const { content, meta } = node
        const link = meta ? meta : getTextContentFromNode(content)
        const r = link.match(/file:\s*(?<path>(.+))\s*$/)
        const convertFileToUrl = filePath => {
          const { isRemote, path } = getPathToOpen(filePath, item.file)
          return isRemote ? null : linksMap[path]
        }
        const newLink = r?.groups?.path ? convertFileToUrl(r.groups.path) : link
        const newContent: Text = {
          type: 'text',
          value: newLink,
        }
        const updated = meta ? { meta: newLink } : { content: newContent }

        return { ...node, ...updated }
      },
    })
    const res = converter(item.node, {})
    if (item.description) {
      const description = converter(item.description, {})
      return { ...item, node: res, description }
    }
    return { ...item, node: res }
  })
  return processed
}

export function parseFiles(path: string) {
  let count = 0
  const allFiles = glob
    .sync(path)
    .map((f: any) => {
      count++
      const testData = fs.readFileSync(f).toString()
      const asAst = makeAstFromSrc(testData)
      // now check if tree contains block with :pubdate attribute
      // '* :pubdate'
      if (!isExistsPubdate(asAst)) {
        return
      }
      // extract notes

      const notes: pubRecord[] = getFromTree(asAst, 'para')
        .filter(n => makeAttrs(n, {}).exists('pubdate'))
        .map((n: PodNode) => {
          const a_pubdate = makeAttrs(n, {}).getFirstValue('pubdate')
          // Due to cover some cases whan new Date fail on safari, i.e.
          // new Date("2022-05-07 10:00:00").getFullYear() -> NaN
          // convert to ISO 8601 "2022-05-07 10:00:00" -> "2022-05-07T10:00:00"
          const pubdate = a_pubdate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
            ? a_pubdate.replace(' ', 'T')
            : a_pubdate

          return {
            pubdate,
            type: 'note',
            node: n,
            description: n,
            file: f,
          }
        })

      const articles: pubRecord[] = getAllArticles([asAst]).map(({ ...all }) => ({ ...all, file: f }))
      // note get full posts
      const pages: pubRecord[] = getFromTree(asAst, 'pod')
        .filter(n => makeAttrs(n, {}).exists('pubdate'))
        .map((n: PodNode) => {
          const a_pubdate = makeAttrs(n, {}).getFirstValue('pubdate')
          // Due to cover some cases whan new Date fail on safari, i.e.
          // new Date("2022-05-07 10:00:00").getFullYear() -> NaN
          // convert to ISO 8601 "2022-05-07 10:00:00" -> "2022-05-07T10:00:00"
          const pubdate = a_pubdate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)
            ? a_pubdate.replace(' ', 'T')
            : a_pubdate
          return {
            pubdate,
            type: 'page',
            node: n,
            file: f,
          }
        })
      console.warn(` pages: ${pages.length} articles: ${articles.length}, notes: ${notes.length} from ${f}`)
      return [...pages, ...articles, ...notes].map(item => {
        return { ...item, file: f }
      })
    })
    .flat()
    .filter(Boolean)
  return allFiles as pubRecord[]
}
const PARSER_TYPES = {
  MARKDOWN: 'markdown' as const,
  PODLITE: 'podlite' as const,
  DEFAULT: 'default' as const,
  ERROR: 'error' as const,
}
type PartserTypes = typeof PARSER_TYPES[keyof typeof PARSER_TYPES]

export function getParserTypeforFile(filePath: string): PartserTypes {
  const ext = path.extname(filePath).toLowerCase()
  const parserTypeMap: { [key: string]: PartserTypes } = {
    '.md': PARSER_TYPES.MARKDOWN,
    '.markdown': PARSER_TYPES.MARKDOWN,
    '.podlite': PARSER_TYPES.PODLITE,
    '.pod6': PARSER_TYPES.PODLITE,
  }
  return parserTypeMap[ext] || PARSER_TYPES.DEFAULT
}

export function parseFile(filePath: string) {
  // check extension of file and parse it deepnds on mime type

  const parser_type = getParserTypeforFile(filePath)
  const typeToParserMap: { [key: string]: (src: string) => PodliteDocument } = {
    [PARSER_TYPES.PODLITE]: (src: string) => {
      return podlite({ importPlugins: true }).parse(src, { skipChain: 0, podMode: 1 })
    },
    [PARSER_TYPES.MARKDOWN]: (src: string) => {
        return parseMd(src)
    },
    [PARSER_TYPES.DEFAULT]: (src: string) => {
      return podlite({ importPlugins: true }).parse(src, { skipChain: 0, podMode: 0 })
    },
  }
    const src = fs.readFileSync(filePath).toString()
    return typeToParserMap[parser_type](src)
}

export function processFile(f: string, content?: string) {
  const podlite_document = parseFile(f, content)
  // now extract some extra meta inforamtion, like pubdate, puburl
  const attr = ((f, node) => {
    if (getParserTypeforFile(f) === PARSER_TYPES.MARKDOWN) {
      // try to extract from markdown front matter
      const { data } = matter(content || fs.readFileSync(f).toString())
      return data
    } else {
      return getDocumentAttributes(podlite_document)
    }
  })(f, podlite_document)
  // prepare attributes
  const { title, description, subtitle, author, footer, puburl, pubdate } = attr
  return {
    type: 'page',
    title,
    description,
    subtitle,
    author,
    footer,
    publishUrl: puburl,
    pubdate,
    file: f,
    sources: [],
    node: podlite_document,
  } as publishRecord
}
