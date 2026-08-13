const path = require('path')
const fs = require('fs')

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // a full export of tens of thousands of pages exhausts memory with the default worker fan-out
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
  },
  webpack: config => {
    // images are handled by next itself; emitting them here again produced a js module under an image url
    const assetRegex = /\.(woff|woff2|mp4)$/
    config.resolve.alias['@Components'] = path.resolve('./src/components')
    config.resolve.alias['@Styles'] = path.resolve('./src/styles')
    // these packages keep their state in module-level facets, so a second
    // instance in the bundle makes the editor read from the wrong one
    for (const name of ['@codemirror/state', '@codemirror/view', '@codemirror/language', '@lezer/common']) {
      const dir = path.resolve(__dirname, 'node_modules', name)
      // read the manifest off disk: these packages do not expose ./package.json through exports
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      config.resolve.alias[`${name}$`] = path.join(dir, meta.module || meta.main)
    }
    // This content will be replaced
    //@@
//@@
    config.module.rules.push(
      {
        test: assetRegex,
        type: 'asset/resource',
        generator: {
          filename: './static/assets/[name]-[contenthash].[ext]',
        },
      },
      {
        test: /\.json$/i,
        type: 'javascript/auto',
        use: ['json-loader'],
      },
    )
    config.resolve.symlinks = false
    return config
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
