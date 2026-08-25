/**
 * 
 * 
 * ts-node -P tsconfig-node.json bin/publisher.ts  -b ./built -p ./public 'examples/03-blog/' 
 * 
 * ts-node -P tsconfig-node.json bin/publisher.ts  -b ./built -p ./public 'site2/*.{podlite,pod6}'
 * ts-node -P tsconfig-node.json bin/publisher.ts  -s 'https://zag.im' -b ./built -p ./public 'site2/*.{podlite,pod6}'

 */

import {
  PluginConfig,
  composePlugins,
  processPlugin,
  parseSources,
  PodliteWebPlugin,
  publishRecord,
  processFile,
} from '@podlite/publisher'
import * as fs from 'fs'
import path from 'path'
import { BUILT_PATH, INDEX_NAMES, PAGES_FILE_PATH, POSTS_PATH, PUBLIC_PATH } from '../src/constants'
import imagesPlugin from '@podlite/publisher/lib/images-plugin'
import linksPlugin from '@podlite/publisher/lib/links-plugin'
import pubdatePlugin from '@podlite/publisher/lib/pubdate-plugin'
import reactPlugin from '@podlite/publisher/lib/react-plugin'
import siteDataPlugin from '@podlite/publisher/lib/site-data-plugin'
import stateVersionPlugin from '@podlite/publisher/lib/state-version-plugin'
import breadcrumbPlugin from '@podlite/publisher/lib/breadcrumb-plugin'
import termsIndexPlugin from '@podlite/publisher/lib/terms-index-plugin'
import includeResolvePlugin from '@podlite/publisher/lib/include-resolve-plugin'
import dumpPagesPlugin from '@podlite/publisher/lib/dump-pages-plugin'
import navigatePlugin from '@podlite/publisher/lib/prev-next-plugin'
import docsInjectorPlugin from '@podlite/publisher/lib/docs-injector-plugin'
import specVersionsPlugin, { readVersions } from './spec-versions-plugin'
import indexingPolicyPlugin, { INDEX_FIELD } from './indexing-policy-plugin'
import { Prepared, prepareMounts } from './mounts'
import mountPrefixPlugin from './mount-prefix-plugin'
import { runLint } from 'podlite/lib/lint/index'
import { getFromTree, makeAttrs } from '@podlite/schema'


const glob = require('glob')
const version = require('../package.json').version
const { Command } = require('commander')
const program = new Command()
program.name('publisher').description('CLI for podlite publishing suite').version(version)

program
  .option('-i, --index [path]', 'path to index file')
  .option('-b, --built_path [built_path]', 'path to built', './built')
  .option('-s, --site_url [site_url]', 'site url')
  .option('-p, --public_path [public_path]', 'public path', './public')
  .option('-v, --verbose', 'verbose output')
  .option('-d, --directory [path to project directory]', 'path to sources to build from')
  .option('-g, --glob [glob argument]', 'mask for files to process')
  // preset plugins
  .option('--offline', 'use the sources already prepared, do not reach the network')
  .option('--mounts-only', 'prepare the sources the site declares and stop')
  .option('--no-lint', 'skip the lint report over the sources')
  .option('--lint-strict', 'stop the build when lint reports a problem')
  .option('-preset, --preset [preset]', 'preset plugins (pubdate, everything)')
  .argument('[path to dir...]', 'path to posts')

program.parse()

program.parse(process.argv)
const options = program.opts()
const site_url = options.site_url || process.env.SITE_URL || 'http://example.com'
// reverse args to able to override default values publisher command from  package.json
const [files] = options.glob ? [(options.directory || POSTS_PATH ) + "/" + options.glob] : (program.args || [POSTS_PATH]).reverse()
console.log(JSON.stringify({...options,files}, null, 2))
const preset = options.preset

if (!['pubdate', 'everything'].includes(preset)) {
  program.error(`--preset ${preset} not valide`, { exitCode: 2, code: '--preset' })
}
// Sites written before the .podlite extension still name their index index.pod6.
// The path is matched against the parsed records as a string, so the directory
// has to keep the shape it was given, which path.join would normalise away.
const resolveIndex = (): string => {
  if (options.index) return options.index
  const dir = options.directory || files
  const found = INDEX_NAMES.map(name => `${dir}/${name}`).find(p => fs.existsSync(p))
  if (found) return found
  program.error(`index file not found in ${dir}, looked for ${INDEX_NAMES.join(' and ')}`, {
    exitCode: 2,
    code: '--index',
  })
}
const indexFilePath = resolveIndex()
const built_path = options.built_path || BUILT_PATH
const public_path = options.public_path || PUBLIC_PATH

// a published image ships without these; the plugins below write into them
for (const dir of [built_path, public_path, `${public_path}/assets`]) {
  fs.mkdirSync(dir, { recursive: true })
}

// A template is not a page: it carries no publish date, so the pubdate preset
// would drop it before anything can look it up.
const declaredTemplateFile = (): string | undefined => {
  if (!indexFilePath || !fs.existsSync(indexFilePath)) return undefined
  try {
    const record = processFile(indexFilePath, fs.readFileSync(indexFilePath).toString())
    const [pod] = getFromTree(record.node, 'pod')
    return pod ? makeAttrs(pod, {}).getFirstValue('templateFile') : undefined
  } catch {
    return undefined
  }
}

const tctx = { testing: false }
const makeConfigMainPlugin = (mountsPrepared: Prepared[]) => {
  const configSiteDataPlugin: PluginConfig = {
    plugin: siteDataPlugin({
      public_path,
      indexFilePath,
      built_path: built_path || BUILT_PATH,
      site_url,
    }),
    includePatterns: '.*',
  }

  const configDumpPagesPlugin: PluginConfig = {
    plugin: dumpPagesPlugin({
      built_path: built_path || BUILT_PATH,
      indexFields: [INDEX_FIELD],
    }),
    includePatterns: '.*',
  }

  const configIndexingPolicyPlugin: PluginConfig = {
    plugin: indexingPolicyPlugin(),
    includePatterns: '.*',
  }

  const templateFile = declaredTemplateFile()
  const configPubdatePlugin: PluginConfig = {
    plugin: pubdatePlugin(),
    includePatterns: '.*',
    excludePatterns: templateFile ? [indexFilePath, templateFile] : indexFilePath,
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
  const configNavigatePlugin: PluginConfig = {
    plugin: navigatePlugin(),
    includePatterns: '.*',
  }
  
  const configTermsIndexPlugin: PluginConfig = {
    plugin: termsIndexPlugin({ built_path }),
    includePatterns: '.*',
  }

  const configIncludeResolvePluginPlugin: PluginConfig = {
    plugin: includeResolvePlugin(),
    includePatterns: '.*',
  }

  const configStateVersionPlugin: PluginConfig = {
    plugin: stateVersionPlugin(version, indexFilePath),
    includePatterns: '.*',
  }

    // pricess defult template 
    const tempalteFilepath = `${PAGES_FILE_PATH}/src/defaultTemplate/defaultSiteTemplate.podlite`
    const templateContent = fs.readFileSync(tempalteFilepath, 'utf-8')
    const templateDoc = processFile(tempalteFilepath, templateContent, "text/podlite")
  
    const makedocInjectorPlugin: PluginConfig = {
      plugin: docsInjectorPlugin({ docs: [templateDoc] }),
      includePatterns: '.*',
    }
  
  
  // Versions are read from the content directory: the runner clones each one
  // there, and the same file tells the build which of them is the current one.
  const contentDir = options.directory || POSTS_PATH
  const versions = readVersions(contentDir, mountsPrepared)
  if (versions.length) {
    console.log(`spec versions: ${versions.map(v => `${v.prefix}${v.state === 'current' ? ' (current)' : ''}`).join(', ')}`)
  }
  const configSpecVersionsPlugin: PluginConfig = {
    plugin: specVersionsPlugin({ versions, builtPath: built_path || BUILT_PATH }),
    includePatterns: '.*',
  }

  // The address is settled by the pubdate plugin, which reads it from the
  // document again; a section given to a mounted source is applied after that.
  const configMountPrefixPlugin: PluginConfig = {
    plugin: mountPrefixPlugin(mountsPrepared),
    includePatterns: '.*',
  }

  const plugins = [
    configMountPrefixPlugin,
    configSpecVersionsPlugin,
    configIndexingPolicyPlugin,
    makedocInjectorPlugin,
    configReactPlugin,
    configImagesPlugin,
    configLinksPlugin,
    configStateVersionPlugin,
    configBreadcrumbPlugin,
    configNavigatePlugin,
    configTermsIndexPlugin,
    configSiteDataPlugin,
    configIncludeResolvePluginPlugin,
    configDumpPagesPlugin
  ]

  if (preset === 'pubdate') {
    plugins.unshift(configPubdatePlugin)
  }

  return composePlugins(plugins, tctx)
}

// The index carries named fields only, and the site names its own. An older
// publisher drops them without a word, and the sitemap filter would then pass
// everything.
const indexFieldsSupported = () => {
  try {
    return (
      typeof require('@podlite/publisher/lib/dump-pages-plugin').buildPagesIndex === 'function' &&
      typeof require('@podlite/publisher').isEntry === 'function'
    )
  } catch {
    return false
  }
}

;(async () => {
  let customPlugin = ({ rootdir }): any => [(a: publishRecord[]) => a, all => all] as PodliteWebPlugin
  if (options.directory) {
    // if we get directory option
    // lets try to find config file in that directory named podlite-web.config.js
    // and import it
    const resolvedModulePath = path.resolve(process.cwd(), `${options.directory}/podlite-web.config.js`)

    if (fs.existsSync(resolvedModulePath)) {
      // A site may keep only data in its config, mounted sources and versions,
      // and never write a plugin of its own.
      const site = require(resolvedModulePath)
      if (typeof site.plugin === 'function') {
        customPlugin = site.plugin
        console.log(customPlugin({ rootdir: options.directory }))
      }
    } else {
      console.warn(`config file not found: ${resolvedModulePath}`)
    }
  }

  const makeCustomPlugin: PluginConfig = customPlugin({ rootdir: options.directory })

  // Sources the site declares are fetched here, before the walk: the walk cannot
  // see a file that is not on disk yet, and the plugin chain runs later still.
  const mounts = prepareMounts(options.directory || POSTS_PATH, options.offline)
  if (options.mountsOnly) return
  const mountMasks = mounts.filter(m => m.dir).map(m => `${m.dir}/**/*.{podlite,pod6}`)

  //parse files
  const sources = [files, ...mountMasks]
    .flatMap((mask: string) => glob.sync(mask, { ignore: '**/node_modules/**', nodir: true }))
    // force exclude node_modules ( this happens when we use symlinks )
    .filter((f:string)=> !f.split(path.sep).includes('node_modules'))

  if (options.lint) {
    const code = runLint(sources, { strict: false, format: 'text' })
    if (code !== 0 && options.lintStrict) {
      program.error('lint reported problems, and --lint-strict is on', { exitCode: 1, code: '--lint-strict' })
    }
  }

  // A source that gave the walk nothing was mounted for nothing; one that gave
  // files but no pages is a source whose documents chose not to publish, which is
  // their own business.
  for (const m of mounts.filter(m => m.dir)) {
    const taken = sources.filter((f: string) => f.startsWith(`${m.dir}/`)).length
    if (taken) continue
    const message = `mount "${m.name}" (${m.ref}) gave the walk no files`
    if (m.required !== false) program.error(message, { exitCode: 1, code: 'empty-mount' })
    console.warn(`${message}; it is declared optional, so the build goes on`)
  }

  const items = sources.map((file: string) => parseSources(file)).flat()

  if (!indexFieldsSupported()) {
    program.error('the installed @podlite/publisher is older than this site needs; update it', {
      exitCode: 1,
      code: 'index-fields',
    })
  }

  const [res, ctx] = processPlugin(
    composePlugins([makeCustomPlugin, makeConfigMainPlugin(mounts)], tctx),
    items,
    tctx,
  )
})()
