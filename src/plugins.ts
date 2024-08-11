import { publishRecord } from './shared'

export interface PodliteWebPluginContext {
  [name: string]: any
}
export type PodliteWebPlugin = [
  (rects: publishRecord[]) => publishRecord[],
  (ctx: PodliteWebPluginContext) => { [name: string]: any },
]
export interface PluginConfig {
  name?: string
  plugin: PodliteWebPlugin
  includePatterns?: string | string[]
  excludePatterns?: string | string[]
}

// Config file
interface Config {
  plugins: PluginConfig[]
}

/**
=begin pod
=head1 filterFiles

This function filters an array of file names based on provided include and exclude patterns. It first converts the includePatterns and excludePatterns arguments into arrays, if they aren't already. The function then filters through the files array, including a file if it matches any of the include patterns (or if no include patterns are provided) and excluding it if it matches any of the exclude patterns. The function returns a new array containing the files that match the include criteria and do not match the exclude criteria.

=head2 Parameters

  =begin item
  B<files>
  
  An array of strings, each representing a file name to be filtered.
  =end item
  =begin item
  B<includePatterns>
  
  Optional. A string or an array of strings representing the pattern(s) files must match to be included. If not provided, all files are considered to match the include criteria.
  =end item
  =begin item
  B<excludePatterns>
  
  Optional. A string or an array of strings representing the pattern(s) files must match to be excluded. If not provided, no files are excluded based on patterns.
  =end item

=head2 Returns

An array of strings, each representing a file name that matched the include criteria and did not match the exclude criteria.

=end pod
*/
export function filterFiles(
  files: string[],
  includePatterns?: string | string[],
  excludePatterns?: string | string[],
): string[] {
  const patternArray = includePatterns ? (Array.isArray(includePatterns) ? includePatterns : [includePatterns]) : ['.*']
  const excludePatternArray = excludePatterns
    ? Array.isArray(excludePatterns)
      ? excludePatterns
      : [excludePatterns]
    : []

  return files.filter(file => {
    const include = patternArray.length === 0 ? true : patternArray.some(pattern => new RegExp(pattern).test(file))
    const exclude =
      excludePatternArray.length === 0 ? false : excludePatternArray.some(pattern => new RegExp(pattern).test(file))
    return include && !exclude
  })
}

/**
=begin pod
=head1 processPlugin

The function `processPlugin` processes a collection of publishing records based on a given 
plugin configuration. It filters the items to determine which ones match specified inclusion 
and exclusion patterns. Items that match are processed by the provided plugin function, while
 items that do not match are passed through unchanged. Finally, it returns a tuple containing 
 the processed items and the result of calling the `onClose` function with a context object.

=head2 Parameters

  =begin item
  B<pluginConf>
  
  An object of type `PluginConfig` that provides configuration for the plugin, including 
  the plugin processing function, inclusion patterns, and exclusion patterns.
  =end item
  =begin item
  B<items>
  
  An array of `publishRecord` objects representing the items to be processed by the plugin.
  =end item

=head2 Returns

A tuple where the first element is an array of `publishRecord` objects representing 
the processed and unprocessed items, and the second element is an object resulting 
from calling the plugin's `onClose` function with a context object. This object may 
contain arbitrary data based on the plugin's implementation.

=end pod
*/
export const processPlugin = (
  pluginConf: PluginConfig,
  items: publishRecord[],
  ctx: { [name: string]: any } = {},
): [publishRecord[], { [name: string]: any }] => {
  const [processItems, onClose] = pluginConf.plugin
  // process items
  const allPaths = items.map(i => i.file)
  const matchedPaths = filterFiles(allPaths, pluginConf.includePatterns || '.*', pluginConf.excludePatterns || [])
  const matchedItems = items.filter(i => matchedPaths.includes(i.file))
  const notMatchedPaths = allPaths.filter(i => !matchedPaths.includes(i))
  const notMatchedItems = items.filter(i => notMatchedPaths.includes(i.file))
  const nextState = [...notMatchedItems, ...processItems(matchedItems)]
  return [nextState, onClose(ctx)]
}
