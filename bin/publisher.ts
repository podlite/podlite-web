/**
 * 
 * 
 * ts-node -P tsconfig-node.json bin/publisher.ts  -b ./built -p ./public -i examples/03-blog/index.pod6 'examples/03-blog/' 
 * 
 * ts-node -P tsconfig-node.json bin/publisher.ts  -b ./built -p ./public -i site2/03-zag.ru-site/index.pod6 'site2/*.{pod6,podlite}'
 * ts-node -P tsconfig-node.json bin/publisher.ts  -s 'https://zag.im' -b ./built -p ./public -i site2/03-zag.ru-site/index.pod6 'site2/*.{pod6,podlite}'

 */

import {
  PluginConfig,
  composePlugins,
  processPlugin,
  parseSources,
  PodliteWebPlugin,
  publishRecord,
} from '@podlite/publisher'
import * as fs from 'fs'
import path from 'path'
import { BUILT_PATH, INDEX_PATH, POSTS_PATH, PUBLIC_PATH } from '../src/constants'
import imagesPlugin from '@podlite/publisher/lib/images-plugin'
import linksPlugin from '@podlite/publisher/lib/links-plugin'
import pubdatePlugin from '@podlite/publisher/lib/pubdate-plugin'
import reactPlugin from '@podlite/publisher/lib/react-plugin'
import siteDataPlugin from '@podlite/publisher/lib/site-data-plugin'
import stateVersionPlugin from '@podlite/publisher/lib/state-version-plugin'
import breadcrumbPlugin from '@podlite/publisher/lib/breadcrumb-plugin'
import termsIndexPlugin from '@podlite/publisher/lib/terms-index-plugin'

import highlighterPlugin from '../src/highlighter-plugin'

const glob = require('glob')
const version = require('../package.json').version
const { Command } = require('commander')
const program = new Command()
program.name('publisher').description('CLI for podlite publishing suite').version(version)

program
  .option('-i, --index [path]', 'path to index file', 'index.podlite')
  .option('-b, --built_path [built_path]', 'path to built', './built')
  .option('-s, --site_url [site_url]', 'site url', 'http://example.com')
  .option('-p, --public_path [public_path]', 'public path', './public')
  .option('-v, --verbose', 'verbose output')
  .option('-d, --directory [path to project directory]', 'path to sources to build from')
  // preset plugins
  .option('-preset, --preset [preset]', 'preset plugins (pubdate, everything)')
  .argument('[path to dir...]', 'path to posts')

program.parse()

program.parse(process.argv)
const options = program.opts()
const site_url = options.site_url || process.env.SITE_URL
// reverse args to able to override default values publisher command from  package.json
const [files] = (program.args || [POSTS_PATH]).reverse()
console.log(JSON.stringify(options, null, 2))
const preset = options.preset

if (!['pubdate', 'everything'].includes(preset)) {
  program.error(`--preset ${preset} not valide`, { exitCode: 2, code: '--preset' })
}
const indexFilePath = options.index
const built_path = options.built_path || BUILT_PATH
const public_path = options.public_path || PUBLIC_PATH

const tctx = { testing: false }
const makeConfigMainPlugin = () => {
  const configSiteDataPlugin: PluginConfig = {
    plugin: siteDataPlugin({
      public_path,
      indexFilePath: indexFilePath || `${files}/${INDEX_PATH}`,
      built_path: built_path || BUILT_PATH,
      site_url: site_url || process.env.SITE_URL,
    }),
    includePatterns: '.*',
  }
  const configPubdatePlugin: PluginConfig = {
    plugin: pubdatePlugin(),
    includePatterns: '.*',
    excludePatterns: indexFilePath,
  }
  const configImagesPlugin: PluginConfig = {
    plugin: imagesPlugin(),
    includePatterns: '.*',
  }
  const configLinksPlugin: PluginConfig = {
    plugin: linksPlugin(),
    includePatterns: '.*',
  }
  const configReactPlugin: PluginConfig = {
    plugin: reactPlugin(),
    includePatterns: '.*',
  }
  const configBreadcrumbPlugin: PluginConfig = {
    plugin: breadcrumbPlugin(),
    includePatterns: '.*',
  }
  const configTermsIndexPlugin: PluginConfig = {
    plugin: termsIndexPlugin({ built_path }),
    includePatterns: '.*',
  }

  const configStateVersionPlugin: PluginConfig = {
    plugin: stateVersionPlugin(),
    includePatterns: '.*',
  }
  const plugins = [
    configReactPlugin,
    configImagesPlugin,
    configLinksPlugin,
    configStateVersionPlugin,
    configBreadcrumbPlugin,
    configTermsIndexPlugin,
    configSiteDataPlugin,
  ]

  if (preset === 'pubdate') {
    plugins.unshift(configPubdatePlugin)
  }
  return composePlugins(plugins, tctx)
}

;(async () => {
  let customPlugin = ({ rootdir }): any => [(a: publishRecord[]) => a, all => all] as PodliteWebPlugin
  if (options.directory) {
    // if we get directory option
    // lets try to find config file in that directory named podlite-web.config.js
    // and import it
    const resolvedModulePath = path.resolve(process.cwd(), `${options.directory}/podlite-web.config.js`)

    if (fs.existsSync(resolvedModulePath)) {
      customPlugin = require(resolvedModulePath).plugin
      console.log(customPlugin({ rootdir: options.directory }))
    } else {
      console.warn(`config file not found: ${resolvedModulePath}`)
    }
  }

  //   const makeCustomPlugin: PluginConfig = {
  //     plugin: customPlugin({ rootdir: options.directory }),
  //     includePatterns: '.*',
  //   }

  const makeCustomPlugin: PluginConfig = customPlugin({ rootdir: options.directory })

  const makeHighlighterPlugin: PluginConfig = {
    plugin: await highlighterPlugin({ rootdir: options.directory }),
    includePatterns: '.*',
  }

  //parse files
  const items = glob
    .sync(files)
    .map(i => parseSources(i))
    .flat()
  const [res, ctx] = processPlugin(
    composePlugins([makeCustomPlugin, makeHighlighterPlugin, makeConfigMainPlugin()], tctx),
    items,
    tctx,
  )
})()
