import makeInterator from '@podlite/schema/lib/ast-inerator'
// import { convertFileLinksToUrl, parseFiles } from '../src/node-utils'
import { getTextContentFromNode, PodNode } from '@podlite/schema'
import {
  parseFiles,
  PluginConfig,
  PodliteWebPlugin,
  PodliteWebPluginContext,
  processFile,
  processPlugin,
  publishRecord,
} from '@podlite/publisher'
import { convertFileLinksToUrl } from '@podlite/publisher'

const makeAbstactDocument = (title: string, content: string) => {
  return `
  =begin pod 
  =TITLE ${title}

   test

  =for code :lang<js>
  ${content}
  =end pod
  `
}

const plugin = (): PodliteWebPlugin => {
  const outCtx: PodliteWebPluginContext = {}
  const onExit = ctx => ({ ...ctx, ...outCtx })

  const processNode = (node: PodNode, file: string) => {
    const processCode = node => {
      const config = node.config || []
      config.unshift({ name: '_highlighted_code_', value: 'TETETETETETET', type: 'string' })
      return { ...node, ...{ config } }
    }
    const rules = {
      ':code': processCode,
      code: processCode,
    }
    return makeInterator(rules)(node, {})
  }

  const onProcess = (recs: publishRecord[]) => {
    const res = recs.map(item => {
      const node = processNode(item.node, item.file)

      // process images inside description
      let extra = {} as { description?: PodNode }
      // if (item.description) {
      //   extra.description = processNode(item.description, item.file)
      // }

      return { ...item, node, ...extra }
    })
    return res
  }

  return [onProcess, onExit]
}

export default plugin

const tctx = { testing: true }
it('parseFiles', () => {
  // it('parseFiles', async () => {
  const item = processFile('virtual/src.pod6', makeAbstactDocument('test1', 'abstract content'))
  const config: PluginConfig = {
    plugin: plugin(),
    includePatterns: '.*',
  }
  const [res, ctx] = processPlugin(config, [item], tctx)
  const text = ` some text`
  // const html = await codeToHtml({ code: getTextContentFromNode(text), language: 'js' })
  // console.log(html)
  // console.log(JSON.stringify(html, null, 2))
  // })
})
