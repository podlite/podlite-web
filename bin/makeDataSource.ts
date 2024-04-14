import * as fs from 'fs'
import * as CRC32 from 'crc-32'
import {
  POSTS_PATH,
  DATA_PATH,
  IMAGE_LIB,
  ASSETS_PATH,
  PAGES_FILE_PATH,
  COMPONENTS_LIB,
  PUBLIC_PATH,
  defaultIndexPage,
  STYLES_LIB,
  SiteInfo,
  INDEX_PATH,
} from '../src/constants'
import {
  getFromTree,
  getTextContentFromNode,
  makeAttrs,
  makeInterator,
  PodliteDocument,
  PodNode,
} from '@podlite/schema'
import { convertFileLinksToUrl, makeLinksMap, parseFiles } from '../src/node-utils'
import { addUrl, makeAstFromSrc } from '../src/shared'

const version = require('../package.json').version
const pathFs = require('path')
const glob = require('glob')

type pubRecord = {
  type: string
  pubdate: string
  node: PodNode
  description: PodNode
  file: string
}
type publishRecord = pubRecord & {
  title: string | undefined
  publishUrl: string
  sources: string[]
}

export function isExistsPubdate(node: PodNode) {
  let isShouldBePublished = false
  const rules = {
    ':block': (node, ctx, interator) => {
      const config = makeAttrs(node, ctx)
      if (config.exists('pubdate')) {
        isShouldBePublished = true
        return
      }
      if (Array.isArray(node.content)) {
        interator(node.content)
      }
    },
  }
  const transformer = makeInterator(rules)
  const res = transformer(node, {})
  return isShouldBePublished
}

const allFiles = parseFiles(`${POSTS_PATH}/**/*.pod6`)
// flatten

// declare type pubRecord = { type: string, pubdate: string, node: PodNode, description: PodNode, file: string, publishUrl: string}
const nodes: publishRecord[] = []
allFiles.flat().map((record: pubRecord) => {
  // filling title
  let title
  let description = record.description
  makeInterator({
    NAME: (node, ctx, interator) => {
      title = getTextContentFromNode(node)
    },
    TITLE: (node, ctx, interator) => {
      title = getTextContentFromNode(node)
    },
    DESCRIPTION: (node, ctx, interator) => {
      description = node.content
    },
  })(record.node, {})
  // prepare publishUrl
  const conf = makeAttrs(record.node, {})
  const publishUrl = conf.exists('puburl')
    ? conf.getFirstValue('puburl')
    : // check old publishUrl attribute
    conf.exists('publishUrl')
    ? conf.getFirstValue('publishUrl')
    : undefined
  nodes.push({ ...record, title, publishUrl, sources: [], description })
})
// now filter  out items for publish in future
const isDateInFuture = dateString => {
  return new Date().getTime() < new Date(dateString).getTime()
}
//filter items with pubdate and sort all by pubdate
//@ts-ignore
const allItemForPublish = nodes
  .filter(a => a.pubdate)
  .sort((a, b) => {
    //@ts-ignore
    return new Date(a.pubdate) - new Date(b.pubdate)
  })

// get not "pages" ( check if it have pubdate)
let notPages = allItemForPublish
  .filter(a => !a.publishUrl)
  .filter(a => !!a.pubdate)
  .filter(a => !isDateInFuture(a.pubdate))

let Pages = allItemForPublish.filter(a => a.publishUrl).filter(a => !(a.pubdate && isDateInFuture(a.pubdate)))

const notPagesWithPublishAttrs = addUrl(notPages)

// save additional info
const nextPublishTime = (allItemForPublish.filter(a => isDateInFuture(a.pubdate))[0] || {}).pubdate
// process images
const getPathToOpen = (filepath, parentDocPath) => {
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
const imagesMap = new Map()
const componensMap = new Map()
const processNode = (node: PodNode, file: string) => {
  const rules = {
    // process JSX
    useReact: (node, ctx, interator) => {
      const text = getTextContentFromNode(node)
      const importMatchResult = text.match(/^\s*(?<component>\S+)\s*from\s*['"](?<source>\S+)['"]/)
      if (importMatchResult) {
        //@ts-ignore
        const { component, source } = (
          importMatchResult || {
            groups: { component: undefined, source: undefined },
          }
        ).groups
        const { path } = source.match(/^\.?\//) ? getPathToOpen(source, file) : { path: source }
        // save absolute Component path and Component name
        const notDefaultImport = component.match(/{(.*)}/)
        if (notDefaultImport) {
          const components = notDefaultImport[1].split(/\s*,\s*/)
          // check if already exists
          if (componensMap.has(path)) {
            const savedComponents = componensMap.get(path)
            const onlyUnique = (value, index, self) => self.indexOf(value) === index
            const newComponents = [...savedComponents, ...components].filter(onlyUnique)
            componensMap.set(path, newComponents)
          } else {
            componensMap.set(path, components)
          }
        } else {
          componensMap.set(path, component)
        }
      } else {
        console.warn(`can't parse =React body. Expected =React Component from './somefile.tsx', but got: ${text}`)
      }
      return
    },
    React: (node, ctx, interator) => {
      const text = getTextContentFromNode(node)
      const doc: PodliteDocument = makeAstFromSrc(text)
      return { ...node, content: [interator(doc.content, ctx)] }
    },
    ':image': node => {
      // process copy files to assets
      const pathMod = require('path')
      // '../assets/'
      const { path } = getPathToOpen(node.src, file)
      const { name, ext, dir } = pathMod.parse(path)
      const variable_name = 'i' + path.split('/').slice(1).join('_').replace(/\W+/g, '_').toLowerCase()
      const newFileName = `${variable_name}${ext}`
      const dstFilename = ASSETS_PATH + '/' + newFileName
      imagesMap.set(path, variable_name)

      return { ...node, src: variable_name }
    },
  }
  return makeInterator(rules)(node, {})
}
const allRecords = convertFileLinksToUrl([...notPagesWithPublishAttrs, ...Pages]).map(item => {
  const node = processNode(item.node, item.file)
  // process images inside description
  let extra = {} as { description?: PodNode }
  if (item.description) {
    extra.description = processNode(item.description, item.file)
  }

  return { ...item, node, ...extra }
})

const getStateVersion = (allREcords: typeof allRecords): string => {
  return (
    CRC32.str(
      allREcords.reduce((prev, current) => {
        return prev + CRC32.str(getTextContentFromNode(current.node))
      }, ''),
    ) +
    '+v' +
    version
  )
}

// try to get index.from already exists records
const indexFilePath = `${POSTS_PATH}/${INDEX_PATH}`
const collectlinksMap = makeLinksMap(allRecords)
const indexPageData = (() => {
  if (fs.existsSync(indexFilePath)) {
    return fs.readFileSync(indexFilePath, 'utf8')
  } else {
    console.warn(`${indexFilePath} not found. Continue using default template`)
    return defaultIndexPage
  }
})()
const indexPageTree = convertFileLinksToUrl(
  [
    {
      node: processNode(makeAstFromSrc(indexPageData), indexFilePath),
      publishUrl: '/',
      file: indexFilePath,
      type: 'page',
      pubdate: '',
      description: '',
      title: '',
      sources: [],
    },
  ],
  collectlinksMap,
)[0].node
// collect site metadata like TITLE, SUBTITLE and attributes from pod
const [pod] = getFromTree(indexPageTree, 'pod')
const attr = makeAttrs(pod, {})
const pageAttr = Object.fromEntries(Object.keys(attr.asHash()).map(k => [k, attr.getFirstValue(k)]))
const { postsPerPage, favicon, puburl, url, globalStyles,gtmId} = pageAttr

// process favicon file

const faviconPath = favicon ? pathFs.join(pathFs.dirname(indexFilePath), favicon) : 'src/favicon.png'
const { base, ext } = pathFs.parse(faviconPath)
const faviconFileName = `favicon${ext}`
fs.copyFileSync(faviconPath, `${PUBLIC_PATH}/${faviconFileName}`)

let title
let subtitle
let author
let footer = ''
const pageNode = makeInterator({
  TITLE: (node, ctx, interator) => {
    title = getTextContentFromNode(node)
  },
  SUBTITLE: (node, ctx, interator) => {
    subtitle = getTextContentFromNode(node)
  },
  AUTHOR: (node, ctx, interator) => {
    const attr = makeAttrs(node, ctx)
    author = Object.fromEntries(Object.keys(attr.asHash()).map(k => [k, attr.getFirstValue(k)]))
  },
  FOOTER: (node, ctx, interator) => {
    footer = node.content
  },
})(indexPageTree, {})

let redirects: SiteInfo['redirects'] = []
notPagesWithPublishAttrs.map(item => {
  const { publishUrl, sources } = item
  sources.forEach(src => {
    redirects.push({ source: src, destination: publishUrl, statusCode: 308 }) //permanent redirect
  })
})
const siteData: SiteInfo = {
  postsPerPage,
  favicon: faviconFileName,
  url: process.env.SITE_URL || url || puburl,
  node: pageNode,
  title,
  globalStyles,
  redirects,
  footer,
}

const controlJson = {
  stateVersion: getStateVersion([
    ...allRecords,
    {
      node: indexPageTree,
      pubdate: '',
      file: '',
      title: '',
      type: '',
      publishUrl: '',
      sources: [''],
    },
  ]),
  nextPublishTime: nextPublishTime,
}

export type DataFeedContent = typeof dataJson
const dataJson = {
  all: allRecords,
  control: controlJson,
  imagesMap: Object.fromEntries(imagesMap),
  siteInfo: siteData,
}

fs.writeFileSync(DATA_PATH, JSON.stringify(dataJson, null, 2))

// process GlobalStyles
let stylesContent = ''
if (siteData.globalStyles) {
  const pathFs = require('path')
  const docDirPath = pathFs.dirname(STYLES_LIB)
  const path = pathFs.relative(docDirPath, pathFs.join(pathFs.dirname(indexFilePath), siteData.globalStyles))
  stylesContent += `
            @import '${path}';
        `
} else {
  const path = '@Styles/default'
  stylesContent += `
            @import '${path}';
        `
}
fs.writeFileSync(STYLES_LIB, stylesContent, 'utf8')

// process Images
let libFileContent = ''
for (const key of imagesMap.keys()) {
  const variable_name = imagesMap.get(key)
  if (!fs.existsSync(key)) {
    continue
  }
  libFileContent += `import ${variable_name} from "${key}"
export { ${variable_name} }
    `
}
libFileContent += `
export default {}
`
fs.writeFileSync(IMAGE_LIB, libFileContent, 'utf8')

// process Components
let componensFileContent = ''
for (const key of componensMap.keys()) {
  const componentName = componensMap.get(key)
  componensFileContent += `import ${Array.isArray(componentName) ? `{ ${componentName} }` : componentName} from "${key}"
export { ${componentName} }
        `
}
componensFileContent += `
export default {}
`

fs.writeFileSync(COMPONENTS_LIB, componensFileContent, 'utf8')

// save control.json
fs.writeFileSync(`${PUBLIC_PATH}/control.json`, JSON.stringify(controlJson, null, 2))

console.warn(`Processed ${allFiles.length} files`)
