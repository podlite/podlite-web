import { publishRecord } from '@podlite/publisher'
import * as fs from 'fs'
import { DATA_PATH, PAGES_PATH } from './constants'
import { DataFeedContent } from './utils'
let chachedData: DataFeedContent | null = null
let chachedPagesData: DataFeedContent | null = null
export function getData(): DataFeedContent {
  const d = chachedData || JSON.parse(fs.readFileSync(DATA_PATH).toString())
  //@ts-ignore
  if (!chachedData) chachedData = d
  return d as DataFeedContent
}
export function getAllPages(): publishRecord[] {
  const d = chachedPagesData || JSON.parse(fs.readFileSync(PAGES_PATH).toString())
  //@ts-ignore
  if (!chachedData) chachedPagesData = d
  return d as publishRecord[]
}

let cachedContentData: DataFeedContent['all'] | null = null
export function contentData(): DataFeedContent['all'] {
  const res =
    cachedContentData ||
    getAllPages().map(({ publishUrl, title, node, sources, pubdate = null, ...args }) => ({
      ...args,
      publishUrl,
      title,
      node,
      sources,
      pubdate,
      shortUrl: sources[0] || false,
    }))
  if (!cachedContentData) cachedContentData = res
  return res
}
