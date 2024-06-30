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
