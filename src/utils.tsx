import React from "react"
import { PodNode, Rules } from "@podlite/schema"
import ReactDOMServer from "react-dom/server"
import Podlite from "@podlite/to-jsx"
import d from "../built/data.json"
import * as img from "../built/images"
import * as components from "../built/components"
import { DataFeedContent } from "../bin/makeDataSource"
// import * as fs from "fs"
import { DATA_PATH } from "./constants"
import makeAttrs from "pod6/built/helpers/config"
// POSTS_PATH is useful when you want to get the path to a specific file
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
export type SiteInfo = {
  postsPerPage: 4
  favicon: "./favicon.png"
  url: "http://example.com"
  pathPrefix: "/"
  title: "Example"
  subtitle: "Example"
  globalStyles?: string
  node: PodNode
  author: {
    name: "Your name here"
    photo: "./photo.jpg"
    bio: "Keeping this page up to date 💻."
    [name: string]: string
  }
}

export type FeedContent = publishRecord & {
  number?: number
  sxd: string
  sequence?: number
  slug?: string
  sources?: string[]
}
export type ContentRecord = Pick<
  FeedContent,
  "publishUrl" | "title" | "node" | "sources"
>
export function getData(): DataFeedContent {
  //@ts-ignore
  return d as DataFeedContent
  //   const data = fs.readFileSync(DATA_PATH, "utf8").toString()
  //   return JSON.parse(data)
}
export function pageNames() {
  const data = getData()
  return data.all.map(post => post.publishUrl)
}
export function contentData(): ContentRecord[] {
  const data = getData()
  return data.all.map(({ publishUrl, title, node, sources }) => ({
    publishUrl,
    title,
    node,
    sources,
  }))
}
export function mapPathToImage(path: string): string | undefined {
  const data = getData().imagesMap
  return data[path]
}

export function getPostComponent(podNode: PodNode) {
  const plugins = (makeComponent): Partial<Rules> => {
    const mkComponent =
      src => (writer, processor) => (node, ctx, interator) => {
        // check if node.content defined
        return makeComponent(
          src,
          node,
          "content" in node ? interator(node.content, { ...ctx }) : []
        )
      }

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
      DESCRIPTION: () => () => null,
      React: () => (node, ctx, interator) => {
        const conf = makeAttrs(node, ctx)
        const componentName = conf.getFirstValue("component")
        if (components[componentName]) {
          return makeComponent(
            components[componentName],
            {},
            interator(node.content, ctx)
          )
        } else {
          return (
            <div style={{ color: "red" }}>
              {" "}
              Not found:{" "}
              <code>
                <pre>{componentName}</pre>
              </code>
            </div>
          )
        }
      },
    }
  }
  const node = {
    interator: podNode,
    errors: {},
    toString: () => "",
    valueOf: () => "",
    indexingTerms: {},
    annotations: {},
    defenitions: {},
  }
  // wrap all elements and add line link info
  const wrapFunction = (node: PodNode, children) => {
    if (typeof node !== "string" && "type" in node && node.type == "image") {
      const imageName = node.src
      if (imageName && img[imageName]) {
        const placeholder = !node.src.endsWith("gif") ? "blur" : "empty"
        if (node.src.endsWith("mp4")) {
          return (
            <div className="video shadow">
              {" "}
              <video controls>
                {" "}
                <source src={img[imageName]} type="video/mp4" />{" "}
              </video>
            </div>
          )
        } else {
          return <img className="shadow_DISABLED" src={img[imageName]} />
        }
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
