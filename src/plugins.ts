interface PluginConfig {
  name: string
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
  const patternArray = includePatterns ? (Array.isArray(includePatterns) ? includePatterns : [includePatterns]) : []
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
=head1 separateFilesByPlugin

This function categorizes an array of file paths based on a given configuration for plugins. Each plugin is associated with specific file patterns and exclude patterns, which determine if a file should be categorized under that plugin. The function iterates over the provided plugins, filters the files according to plugin-specific patterns, and then groups them under the plugin's name. Additionally, files that do not match any plugin's criteria are categorized under 'rejected'.

=head2 Parameters

  =begin item
  B<files>
  
  An array of strings representing file paths to be categorized.
  =end item
  =begin item
  B<cfg>
  
  An object of type Config, which contains an array of plugins. Each plugin has a name, filePatterns (to include), and excludePatterns (to exclude).
  =end item

=head2 Returns

An object where each key is a plugin name and its value is an array of strings representing file paths that match the plugin's criteria. It also includes a 'rejected' key for files that do not match any plugin's criteria.

=end pod
*/
export function separateFilesByPlugin(files: string[], cfg: Config): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  cfg.plugins.forEach(plugin => {
    const filteredFiles = filterFiles(files, plugin.includePatterns, plugin.excludePatterns)
    result[plugin.name] = [...(result[plugin.name] || []), ...filteredFiles]
  })

  result['rejected'] = files.filter(file => {
    return !cfg.plugins.some(plugin => {
      const filteredFiles = filterFiles([file], plugin.includePatterns, plugin.excludePatterns)
      return filteredFiles.length > 0
    })
  })

  return result
}
