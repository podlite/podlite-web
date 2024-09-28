/* eslint-disable react/display-name */
import React, { useEffect, useState } from 'react'
import { PodNode, Rules, getTextContentFromNode, makeAttrs, setFn, PodliteDocument } from '@podlite/schema'
import ReactDOMServer from 'react-dom/server'
import Podlite from '@podlite/to-jsx'
import * as img from '../built/images'
//@ts-ignore
import * as components from '../built/components'
import Link from 'next/link'
import { DATA_PATH } from './constants'
import { SiteInfo } from '@podlite/publisher/lib/site-data-plugin'
import { getLangFromFilename, pubRecord } from '@podlite/publisher'
import { codeToHtml } from '@Components/shiki'

// POSTS_PATH is useful when you want to get the path to a specific file
// type pubRecord = {
//   type: string
//   pubdate: string | number
//   node: PodNode
//   description: PodNode
//   file: string
// }
type publishRecord = Omit<pubRecord, 'pubdate'> & {
  title: string | null
  publishUrl: string
  sources: string[]
  node: PodliteDocument
  pubdate?: string | null
}
export type DataFeed = {
  all: FeedContent[]
  control: {
    [propName: string]: string
  }
  imagesMap: {
    [path: string]: string
  }
}

export type FeedContent = publishRecord & {
  title: string | null
  number?: number
  sxd: string
  sequence?: number
  slug?: string
  sources?: string[]
  shortUrl?: string
}
export type ContentRecord = Pick<FeedContent, 'publishUrl' | 'title' | 'node' | 'sources' | 'shortUrl'>
export type DataFeedContent = {
  all: publishRecord[]
  siteInfo: SiteInfo
  control: {
    stateVersion: any
    nextPublishTime: any
  }
  imagesMap: {
    [k: string]: any
  }
}
export function getSiteInfo(): DataFeedContent['siteInfo'] {
  const d = require('../built/siteInfo.json')
  return d as DataFeedContent['siteInfo']
}
export function mapPathToImage(path: string): string | undefined {
  const data = require('../built/imagesMap.json') as DataFeedContent['imagesMap']
  return data[path]
}
export function getArticlesGroupedByYearMonth() {
  //filter out pages
  const source = [] // TODO:: need to fix instead of use contentData()
    .filter(({ type = '' }) => type !== 'page')
    .reverse()

  const groupedByYearMonth = source.reduce(
    (
      acc: {
        [year: number]: {
          [month: number]: DataFeedContent['all']
        }
      },
      rest,
    ) => {
      const year = new Date(rest.pubdate ? rest.pubdate : new Date()).getFullYear()
      const month = new Date(rest.pubdate ? rest.pubdate : new Date()).getMonth()
      const { [year]: months = {}, ...other } = acc
      const { [month]: monthRecords = [], ...otherMonth } = months
      return {
        ...other,
        [year]: {
          ...otherMonth,
          [month]: [...monthRecords, rest],
        },
      }
    },
    {},
  )
  return groupedByYearMonth
}

export function getPostComponent(podNode: PodNode, template?: publishRecord) {
  const plugins = (makeComponent): Partial<Rules> => {
    const mkComponent = src => (writer, processor) => (node, ctx, interator) => {
      // check if node.content defined
      return makeComponent(src, node, 'content' in node ? interator(node.content, { ...ctx }) : [])
    }
    const hcode = mkComponent(({ children, key, ...node }, ctx) => {
      const conf = makeAttrs(node, ctx)
      let caption
      if (conf.exists('caption')) {
        caption = conf.getFirstValue('caption')
      }
      const data1 = conf.getFirstValue('_highlighted_code_')
      const lang1 = conf.getFirstValue('_highlighted_code_lang_')
      const lang =
        conf.getFirstValue('lang') ||
        // try to detect default language
        // (filename)=>getLangFromFilename(filename )
        (filename => lang1)()
      // Create a highlighter instance
      const [data, setData] = useState(null)
      const fetchData = async () => {
        try {
          console.log('call codeToHtml lang:' + lang)
          const html = await codeToHtml({ code: getTextContentFromNode(node.content), language: lang || 'text' })
          setData(html)
        } catch (e) {
          console.error('error highlite ' + e)
        } finally {
        }
      }
      useEffect(() => {
        if (lang) {
          fetchData()
        }
      }, [])

      return (
        <>
          {data ? (
            <>
              <p>
                <caption className="caption">{caption}</caption>
              </p>
              <code key={key} className="shiki" dangerouslySetInnerHTML={{ __html: data || '' }} />
            </>
          ) : (
            <>
              <p>
                <caption className="caption">{caption}</caption>
              </p>
              <code key={key}>
                <pre>{children}</pre>
              </code>
            </>
          )}
        </>
      )
    })
    return {
      //process only content nodes
      root: () => (node, ctx, interator) => {
        return interator(node.content, { ...ctx })
      },
      //process only content nodes
      pod: () => (node, ctx, interator) => {
        return interator(node.content, { ...ctx })
      },
      //@ts-ignore
      TITLE: () => () => null,
      //@ts-ignore
      SUBTITLE: () => () => null,
      //@ts-ignore
      FOOTER: () => () => null,
      //@ts-ignore
      HEADER: () => () => null,
      //@ts-ignore
      DESCRIPTION: () => () => null,
      'L<>': setFn((node, ctx) => {
        let { meta } = node
        if (meta === null) {
          meta = getTextContentFromNode(node)
        }
        const text_content = getTextContentFromNode(node)
        //TODO: fix links to anchors
        return mkComponent(({ children, key }) => (
          <Link href={meta?.trim().replace(/\s/g, '-') || '#'} key={key}>
            {text_content}
            {/* {Array.isArray(children) ? children[0] : children} */}
          </Link>
        ))
      }),
      React: () => (node, ctx, interator) => {
        const conf = makeAttrs(node, ctx)
        const componentName = conf.getFirstValue('component')
        const variables = Object.keys(conf.asHash()).filter(name => name !== 'component')
        // prepare simple key value pairs
        const props = variables.reduce((acc, name) => {
          acc[name] = conf.getFirstValue(name)
          return acc
        }, {})

        if (components[componentName]) {
          return makeComponent(
            components[componentName],
            {
              ...props,
              ...{ item: template },
              ...{ renderNode: node => getPostComponent(node, template), getThisNode: () => node },
            },
            interator(node.content, ctx),
          )
        } else {
          return (
            <div style={{ color: 'red' }}>
              {' '}
              Not found:{' '}
              <code>
                <pre>{componentName}</pre>
              </code>
            </div>
          )
        }
      },
      code1: () => (node, ctx, interator) => {
        const conf = makeAttrs(node, ctx)
        const code = getTextContentFromNode(node)
        const lang = conf.getFirstValue('lang')
        return (
          <pre>
            <code className={lang}>{code}</code>
          </pre>
        )
      },
      ':code': hcode,
      code: hcode,
    }
  }
  const node = {
    interator: podNode,
    errors: {},
    toString: () => '',
    valueOf: () => '',
    indexingTerms: {},
    annotations: {},
    defenitions: {},
  }
  // wrap all elements and add line link info
  const wrapFunction = (node: PodNode, children, ctx) => {
    if (typeof node !== 'string' && 'type' in node && node.type == 'image') {
      const imageName = node.src
      const linkTo = ctx.link
      if (imageName && img[imageName]) {
        const placeholder = !node.src.endsWith('gif') ? 'blur' : 'empty'
        const Comp = () => {
          if (node.src.endsWith('mp4')) {
            return (
              <div className="video shadow">
                {' '}
                <video controls>
                  {' '}
                  <source src={img[imageName]} type="video/mp4" />{' '}
                </video>
              </div>
            )
          } else {
            return <img className="shadow_DISABLED" src={img[imageName]} />
          }
        }
        return linkTo ? (
          <a target="_blank" rel="noreferrer" href={linkTo}>
            <Comp />
          </a>
        ) : (
          <Comp />
        )
      } else {
        return (
          <>
            <h1>image {imageName} not found</h1>
          </>
        )
      }
      return children
    } else {
      return children
    }
  }
  return <Podlite plugins={plugins} tree={node} wrapElement={wrapFunction} />
}
export function convertPodNodeToHtml(node: PodNode): string {
  return ReactDOMServer.renderToString(getPostComponent(node))
}
