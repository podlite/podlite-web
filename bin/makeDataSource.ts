import * as fs from "fs"
import * as CRC32 from "crc-32" 
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
} from "../src/constants"
import { podlite as podlite_core } from "podlite"
import makeAttrs from "pod6/built/helpers/config"
import {
  getFromTree,
  getTextContentFromNode,
  makeInterator,
  PodliteDocument,
  PodNode,
} from "@podlite/schema"
import { convertFileLinksToUrl, makeLinksMap, parseFiles } from "../src/node-utils"
import { addUrl, makeAstFromSrc } from "../src/shared"


const glob = require("glob")

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
    ":block": (node, ctx, interator) => {
      const config = makeAttrs(node, ctx)
      if (config.exists("pubdate")) {
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
  const publishUrl = conf.exists("publishUrl")
    ? conf.getFirstValue("publishUrl")
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

let Pages = allItemForPublish
  .filter(a => a.publishUrl)
  .filter(a => !(a.pubdate && isDateInFuture(a.pubdate)))

const notPagesWithPublishAttrs = addUrl(notPages)

// save additional info
const nextPublishTime = (
  allItemForPublish.filter(a => isDateInFuture(a.pubdate))[0] || {}
).pubdate
// process images
const getPathToOpen = (filepath, parentDocPath) => {
  const isRemoteReg = new RegExp(/^(https?|ftp):/)
  const isRemote = isRemoteReg.test(filepath)
  if (isRemote) {
    return { isRemote, path: filepath }
  }
  const path = require("path")
  const docDirPath = path.dirname(parentDocPath)
  return {
    isRemote,
    path: path.isAbsolute(filepath)
      ? filepath
      : path.normalize(path.join(docDirPath, filepath)),
  }
}
const imagesMap = new Map()
const componensMap = new Map()
const processNode = (node: PodNode, file:string) => {
  const rules = {
    // process JSX
    useReact: (node, ctx, interator) => {
      const text = getTextContentFromNode(node)
      const importMatchResult = text.match(
        /^\s*(?<component>\S+)\s*from\s*['"](?<source>\S+)['"]/
      )
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
                const onlyUnique = (value, index, self) => self.indexOf(value) === index;
                const newComponents = [...savedComponents, ...components].filter(onlyUnique)
                componensMap.set(path, newComponents )
            } else {
                componensMap.set(path, components )
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
        const doc:PodliteDocument = makeAstFromSrc(text)
        return { ...node, content: [interator( doc.content, ctx )] }
      },
    ":image": node => {
      // process copy files to assets
      const pathMod = require("path")
      // '../assets/'
      const { path } = getPathToOpen(node.src, file)
      const { name, ext, dir } = pathMod.parse(path)
      const variable_name = path
        .split("/")
        .slice(1)
        .join("_")
        .replace(/\W+/g, "_")
        .toLowerCase()
      // const random = getRandomInt(0,1000000)
      // const variable_name = `${name.replace(/[\W_]+/g, '-')}-${random}`
      const newFileName = `${variable_name}${ext}`
      //   const newPath = pathMod.join("..", "assets", `${newFileName}`); ////   ext: '.txt',
      const dstFilename = ASSETS_PATH + "/" + newFileName
      // copy file
      //   const fs = require("fs");
      //   if (!fs.existsSync(dstFilename) && fs.existsSync(path)) {
      //     fs.copyFileSync(path, dstFilename);
      //   }
      //   const relativeToPost = pathMod.relative(PAGES_FILE_PATH, dstFilename); //dir

      // const variable_name = path.split('/').slice(1).join('_').replace(/\W+/g, '_').toLowerCase()

      imagesMap.set(path, variable_name)

      return { ...node, src: variable_name }
    },
  }
  return makeInterator(rules)(node, {})
}
const allRecords  = convertFileLinksToUrl([...notPagesWithPublishAttrs, ...Pages]).map(item => {

   const node = processNode(item.node, item.file)
  // process images inside description
  let extra = {} as { description?: PodNode }
  if (item.description) {
    // extra.description = makeInterator(rules)(item.description, {})
    extra.description = processNode(item.description, item.file)
  }

  return { ...item, node, ...extra }
})

const getStateVersion = (allREcords:typeof allRecords):string => {
    return CRC32.str(allREcords.reduce((prev,current)=>{
        return prev + CRC32.str(getTextContentFromNode(current.node))
    }, "")) + ""
}

const controlJson = { 
    stateVersion: getStateVersion(allRecords),
    nextPublishTime: nextPublishTime }



// const siteInfo = require(`${POSTS_PATH}/config`)
// for now trying to et index page

// try to get index.from alreday exists records
const indexFilePath = `${POSTS_PATH}/index.pod6`
const collectlinksMap = makeLinksMap(allRecords)
// console.log(indexPageRecord);
const indexPageData = (() => {
    
    if ( fs.existsSync(indexFilePath) ) {
        return fs.readFileSync(indexFilePath, "utf8")
    } else {
        console.warn(`${indexFilePath} not found. Continue using default template`)
        return defaultIndexPage
    }
 })()
 const indexPageTree  = convertFileLinksToUrl(
    [{
        node: processNode( makeAstFromSrc (indexPageData ), indexFilePath),
        publishUrl: "/",
        file: indexFilePath,
        type: "page",
        pubdate:'',
        description:'',
        title:'',
        sources:[]
    }],
    collectlinksMap
    )[0].node
  // collect site metadata like TITLE, SUBTITLE and attributes from pod
  const [pod] = getFromTree(indexPageTree, "pod")
  const attr = makeAttrs(pod, {})
  const pageAttr = Object.fromEntries(
    Object.keys(attr.asHash()).map(k => [k, attr.getFirstValue(k)])
  )
  const {postsPerPage, favicon, url, pathPrefix, globalStyles = "../src/styles/pod6.css"} = pageAttr

  let title
  let subtitle
  let author

  const pageNode = makeInterator({
    TITLE: (node, ctx, interator) => {
      title = getTextContentFromNode(node)
    },
    SUBTITLE: (node, ctx, interator) => {
        subtitle = getTextContentFromNode(node)
    },
    AUTHOR: (node, ctx, interator) => {
        const attr = makeAttrs(node, ctx)
        author =  Object.fromEntries(
            Object.keys(attr.asHash()).map(k => [k, attr.getFirstValue(k)])
          )
    },
  })(indexPageTree, {})

  let redirects:SiteInfo['redirects'] = []
  notPagesWithPublishAttrs.map(item=>{
        const {publishUrl, sources } = item
        sources.forEach( src => {
        redirects.push({source: src, destination: publishUrl, "statusCode": 308}) //permanent redirect
        })
  })
  const siteData:SiteInfo = {
        postsPerPage, favicon, url:process.env.SITE_URL||url, pathPrefix,
        node:pageNode,
        author,
        title,
        subtitle,
        globalStyles,
        redirects
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
    let stylesContent = '';
    if ( siteData.globalStyles ) {
        const pathFs = require("path")
        const docDirPath = pathFs.dirname(STYLES_LIB)
        // const path = pathFs.relative(docDirPath, siteData.globalStyles )
        const path = pathFs.relative(docDirPath, pathFs.join(pathFs.dirname(indexFilePath),siteData.globalStyles) )
        stylesContent += `
            @import '${path}';
        `
    }
    fs.writeFileSync(STYLES_LIB, stylesContent, "utf8")

// process Images
let libFileContent = ""
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
fs.writeFileSync(IMAGE_LIB, libFileContent, "utf8")

// process Components
let componensFileContent = ""
for (const key of componensMap.keys()) {
  const componentName = componensMap.get(key)
  componensFileContent += `import ${ Array.isArray(componentName) ? `{ ${componentName} }` : componentName } from "${key}"
export { ${componentName} }
        `
}
componensFileContent += `
export default {}
`

fs.writeFileSync(COMPONENTS_LIB, componensFileContent, "utf8")

// save control.json
fs.writeFileSync(
  `${PUBLIC_PATH}/control.json`,
  JSON.stringify(controlJson, null, 2)
)

console.warn(`Processed ${allFiles.length} files`)
