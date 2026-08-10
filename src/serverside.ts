import { publishRecord } from '@podlite/publisher'
import * as fs from 'fs'
import { DATA_PATH, PAGES_INDEX_PATH, PAGES_PATH } from './constants'
import { DataFeedContent } from './utils'
let chachedData: DataFeedContent | null = null
let chachedPagesData: DataFeedContent | null = null
export function getData(): DataFeedContent {
  const d = chachedData || JSON.parse(fs.readFileSync(DATA_PATH).toString())
  //@ts-ignore
  if (!chachedData) chachedData = d
  return d as DataFeedContent
}
// The index carries every field but the parsed tree, plus where the full record
// sits in pages.jsonl. Reading it whole is safe; reading every record is not.
export function pagesIndex(): publishRecord[] {
  if (!chachedPagesData) chachedPagesData = JSON.parse(fs.readFileSync(PAGES_INDEX_PATH).toString())
  //@ts-ignore
  return chachedPagesData as publishRecord[]
}

const cachedRecords = new Map<string, publishRecord>()

// what the index carries: every field of a record but the parsed tree
export type pageIndexRecord = Omit<publishRecord, 'node' | 'description'> & {
  offset: number
  length: number
  shortUrl?: string | boolean
}

// a template is a record without a publish url, so reading goes by place in the
// file, and the url lookup is a convenience on top of it
export function readRecord(place: Partial<pageIndexRecord>): publishRecord | null {
  if (place?.offset === undefined || place?.length === undefined) return null
  const key = `${place.offset}`
  const cached = cachedRecords.get(key)
  if (cached) return cached
  const fd = fs.openSync(PAGES_PATH, 'r')
  const buf = Buffer.alloc(place.length)
  //@ts-ignore
  fs.readSync(fd, buf, 0, place.length, place.offset)
  fs.closeSync(fd)
  const record = JSON.parse(buf.toString()) as publishRecord
  // a stale data file next to a fresh index would hand back someone else's bytes
  if (place.publishUrl && record.publishUrl !== place.publishUrl) {
    throw new Error(`Index and pages file disagree: expected ${place.publishUrl}, got ${record.publishUrl}`)
  }
  cachedRecords.set(key, record)
  return record
}

export function getPage(publishUrl: string | null | undefined): publishRecord | null {
  if (!publishUrl) return null
  const place = pagesIndex().find(r => r.publishUrl === publishUrl)
  //@ts-ignore
  return place ? readRecord(place) : null
}

export function getAllPages(): publishRecord[] {
  return pagesIndex()
}


let cachedContentData: pageIndexRecord[] | null = null
export function contentData(): pageIndexRecord[] {
  const res =
    cachedContentData ||
    getAllPages().map(({ publishUrl, title, sources, pubdate = null, ...args }) => ({
      ...args,
      publishUrl,
      title,
      sources,
      pubdate,
      shortUrl: sources[0] || false,
    }))
  //@ts-ignore
  if (!cachedContentData) cachedContentData = res
  //@ts-ignore
  return res
}
