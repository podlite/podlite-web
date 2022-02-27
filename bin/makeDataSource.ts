import * as fs from "fs"
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
import { SiteInfo } from "../src/utils"

const glob = require("glob")

type pubRecord = {
  type: string
  pubdate: string
  node: PodNode
  description: PodNode
  file: string
}
// now we add base60 letters
const translit = require("iso_9")
const base60 = require("newbase60")
const addUrl = (items: publishRecord[]) => {
  const withSxd: (publishRecord & {
    number?: number
    sxd: string
    sequence?: number
    slug?: string
  })[] = items.map(i => {
    const { file: f } = i
    const attrs = i
    const pubDate = new Date(i.pubdate)
    const sxd = base60.DateToSxg(pubDate)
    const type = i.type === "note" ? "n" : "a"
    // make short name from title
    //console.error(`process ${f}`)
    let words: string[] = (attrs.title || "").split(/\s/)
    let res = []
    while ([...res, words[0]].join(" ").length < 120) {
      //@ts-ignore
      res.push(words.shift())
    }
    let shortTitle = res.join(" ")
    // translit only cyrillic
    const translit2 = /[а-яА-ЯЁё]/.test(shortTitle)
      ? translit(shortTitle, 5)
      : shortTitle
    // console.log({title:attrs.TITLE, shortTitle, translit2})
    // make url clean
    const slug = ((translit2.replace(/`/, "") || "").replace(/\W+/g, "-") || "")
      .replace(/(^[-]+|[-]+$)/g, "")
      .toLowerCase()

    return { ...attrs, type, sxd, slug, file: f }
  })

  // get count of each type on corresponding date
  withSxd.reduce((acc, item) => {
    const { sxd, type } = item
    acc[sxd] = acc[sxd] || {}
    acc[sxd][type] = acc[sxd][type] || 0
    acc[sxd][type]++
    item.number = acc[sxd][type]
    return acc
  }, {})
  // sequence -  index of record at all in that day
  withSxd.reduce((acc, item) => {
    const { sxd } = item
    acc[sxd] = acc[sxd] || 0
    acc[sxd]++
    item.sequence = acc[sxd]
    return acc
  }, {})

  return withSxd.map(item => {
    const { type, number, sxd, slug, pubdate, sequence } = item
    const shortUrl = `/${type}${sxd}${number}`
    // /2019/12/34/a1/WriteAt-my-opensource-startup-on-Perl-6-Pod
    const date = new Date(pubdate)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const day = date.getDate()
    // !!!!! publishUrl  может присутсвовать
    const publishUrl = `/${year}/${month}/${day}/${sequence}/${slug}`
    const sources = [
      shortUrl,
      `/${year}/${month}/${day}/${sequence}`,
      `/${year}/${month}/${day}/${sequence}/(.*)`,
    ]
    return { ...item, shortUrl, publishUrl, sources }
  })
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
let count = 0

const makeAstFromSrc = (src: string) => {
  let podlite = podlite_core({ importPlugins: true }).use({})
  let tree = podlite.parse(src)
  const asAst = podlite.toAstResult(tree).interator as PodliteDocument
  return asAst
}
const allFiles = glob
  .sync(`${POSTS_PATH}/**/*.pod6`)
  .map((f: any) => {
    count++
    const testData = fs.readFileSync(f).toString()
    // let podlite = podlite_core({ importPlugins: true }).use({});
    // let tree = podlite.parse(testData);
    // const asAst =  podlite.toAstResult(tree).interator;
    const asAst = makeAstFromSrc(testData)
    // now check if tree contains block with :pubdate attribute
    // '* :pubdate'
    if (!isExistsPubdate(asAst)) {
      return
    }
    // extract notes

    const notes: pubRecord[] = getFromTree(asAst, "para")
      .filter(n => makeAttrs(n, {}).exists("pubdate"))
      .map((n: PodNode) => {
        const pubdate = makeAttrs(n, {}).getFirstValue("pubdate")
        return {
          pubdate,
          type: "note",
          node: n,
          description: n,
          file: f,
        }
      })

    let articles: pubRecord[] = []
    const getArticles = array => {
      // collect alias
      const aliases = array.filter(i => i.type == "alias")
      // at first collect all levels
      const levels =
        array.filter(node => node.level && node.name === "head") || []
      const nodesWithPubdate = levels.filter(node => {
        return makeAttrs(node, {}).exists("pubdate")
      })
      if (nodesWithPubdate.length > 0) {
        const nodePublished = nodesWithPubdate[0]
        // get next header with same level
        const nextHeader = levels
          .slice(levels.indexOf(nodePublished) + 1) // ignore this and previous nodes
          .filter(node => node.level <= nodePublished.level) // stop then found the same or lower level
          .shift()

        let lastIndexOfArticleNode = !nextHeader
          ? array.length
          : array.indexOf(nextHeader)
        const articleContent = array.slice(
          array.indexOf(nodePublished) + 1,
          lastIndexOfArticleNode
        )
        if (articleContent.length) {
          const description = getFromTree(articleContent, "para")[0]
          const pubdate = makeAttrs(nodePublished, {}).getFirstValue("pubdate")
          articles.push({
            pubdate,
            type: "page",
            node: articleContent,
            description,
            file: f,
          })
        }
      }
      array.forEach(node => {
        if (Array.isArray(node.content)) {
          getArticles(node.content)
        }
      })
    }
    getArticles([asAst])
    // note get full posts
    const pages: pubRecord[] = getFromTree(asAst, "pod")
      .filter(n => makeAttrs(n, {}).exists("pubdate"))
      .map((n: PodNode) => {
        const pubdate = makeAttrs(n, {}).getFirstValue("pubdate")
        return {
          pubdate,
          type: "page",
          node: n,
          file: f,
        }
      })
    console.warn(
      ` pages: ${pages.length} articles: ${articles.length}, notes: ${notes.length} from ${f}`
    )
    return [...pages, ...articles, ...notes].map(item => {
      return { ...item, file: f }
    })
  })
  .filter(Boolean)
// flatten
type publishRecord = pubRecord & {
  title: string | undefined
  publishUrl: string
  sources: string[]
}
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

// let redirects = []
// notPagesWithPublishAttrs.map(item=>{
//     const {publishUrl, sources } = item
//     sources.forEach( src => {
//       redirects.push({source: src, destination: publishUrl, "statusCode": 301})
//     })
// })

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
            
            componensMap.set(path, notDefaultImport[1].split(/\s*,\s*/) )
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
const allRecords = [...notPagesWithPublishAttrs, ...Pages].map(item => {

   const node = processNode(item.node, item.file)
  // process images inside description
  let extra = {} as { description?: PodNode }
  if (item.description) {
    // extra.description = makeInterator(rules)(item.description, {})
    extra.description = processNode(item.description, item.file)
  }

  return { ...item, node, ...extra }
})

const controlJson = { nextPublishTime: nextPublishTime }



// const siteInfo = require(`${POSTS_PATH}/config`)
// for now trying to et index page
const indexFilePath = `${POSTS_PATH}/index.pod6`
const indexPageData = (() => {
    
    if ( fs.existsSync(indexFilePath) ) {
        return fs.readFileSync(indexFilePath, "utf8")
    } else {
        console.warn(`${indexFilePath} not found. Continue using default template`)
        return defaultIndexPage
    }
 })()
 const indexPageTree  = processNode( makeAstFromSrc (indexPageData ), indexFilePath)
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

  const siteData:SiteInfo = {
        postsPerPage, favicon, url, pathPrefix,
        node:pageNode,
        author,
        title,
        subtitle,
        globalStyles,
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
