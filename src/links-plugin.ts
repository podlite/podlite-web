import { getTextContentFromNode, makeAttrs, makeInterator, PodNode, Text } from '@podlite/schema'
import { convertFileLinksToUrl, getPathToOpen, makeLinksMap } from './node-utils'
import { PodliteWebPlugin, PodliteWebPluginContext } from './plugins'
import { publishRecord } from './shared'

const plugin = (): PodliteWebPlugin => {
  const outCtx: PodliteWebPluginContext = {}
  const docsMap = new Map()
  const onExit = ctx => ({ ...ctx, ...outCtx })
  const processNode = (node: PodNode, srcfile: string) => {
    const rules = {
      'L<>': node => {
        const { content, meta } = node
        const link = meta ? meta : getTextContentFromNode(content)

        const r = link.match(/doc:\s*(?<path>(.+))\s*$/)
        if (r?.groups?.path) {
          const docLink = r.groups.path
          const { isRemote } = getPathToOpen(docLink, srcfile)
          if (isRemote) {
            return node
          }
          const { title, url } = docsMap.get(docLink)

          const newContent: Text = {
            type: 'text',
            value: `${title}`,
          }
          const updated = meta ? { meta: url } : { content: newContent, meta: url }

          return { ...node, ...updated }
        }
        return node
      },
    }
    return makeInterator(rules)(node, {})
  }
  const onProcess = (recs: publishRecord[]) => {
    // const collectlinksMap = makeLinksMap(recs)
    // collects docsMap map doc: to file
    for (const item of recs) {
      // get =TITLE
      const handler = node => {
        const conf = makeAttrs(node, {})
        const title = getTextContentFromNode(node).trim()
        if (conf.exists('id')) {
          const id = conf.getFirstValue('id')
          if (id) {
            docsMap.set(id, { file: item.file, title, url: item.publishUrl })
          }
        }
        docsMap.set(title, { file: item.file, title, url: item.publishUrl })
      }
      makeInterator({
        NAME: handler,
        TITLE: handler,
      })(item.node, {})
    }
    // convert all doc: links to file:: links
    const docToFileLinksConverted = recs.map(item => {
      const node = processNode(item.node, item.file)
      // process images inside description
      let extra = {} as { description?: PodNode }
      if (item.description) {
        extra.description = processNode(item.description, item.file)
      }

      return { ...item, node, ...extra }
    })

    return convertFileLinksToUrl(docToFileLinksConverted)
  }

  return [onProcess, onExit]
}

export default plugin
