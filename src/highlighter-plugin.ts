import type { BuiltinLanguage, BuiltinTheme, LanguageInput } from 'shiki'
import { getLangFromFilename, PodliteWebPlugin, PodliteWebPluginContext, publishRecord } from '@podlite/publisher'
import { getTextContentFromNode, makeAttrs, makeInterator, PodNode } from '@podlite/schema'

interface pluginOptions {
  langs?: Array<LanguageInput | BuiltinLanguage>
  theme?: BuiltinTheme
  [key: string]: any
}
const plugin = async (options: pluginOptions): Promise<PodliteWebPlugin> => {
  const { bundledLanguages, bundledThemes } = await import('shiki/bundle/full')
  const { getHighlighter } = await import('shiki')
  const highlighter = await getHighlighter({
    langs: options.langs || (Object.keys(bundledLanguages) as BuiltinLanguage[]),
    themes: Object.keys(bundledThemes) as BuiltinLanguage[],
  })

  const outCtx: PodliteWebPluginContext = {}
  const onExit = ctx => ({ ...ctx, ...outCtx })
  const processNode = (node: PodNode, file: string) => {
    const processCode = (node, ctx) => {
      const conf = makeAttrs(node, ctx)
      const lang =
        conf.getFirstValue('lang') ||
        // try to detect default language
        (filename => getLangFromFilename(filename))(file)
      const config = node.config || []
      const html = highlighter.codeToHtml(getTextContentFromNode(node), {
        language: lang,
        themes: {
          light: 'vitesse-light', //'catppuccin-latte', // 'github-light',
          dark: 'github-dark',
        },
      })
      config.unshift({ name: '_highlighted_code_', value: html, type: 'string' })
      config.unshift({ name: '_highlighted_code_lang_', value: lang, type: 'string' })

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
      if (item.description) {
        //   extra.description = processNode(item.description, item.file)
      }

      return { ...item, node, ...extra }
    })
    return res

    return recs
  }

  return [onProcess, onExit]
}

export default plugin
