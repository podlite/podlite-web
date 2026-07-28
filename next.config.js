const path = require('path')

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  webpack: config => {
    const assetRegex = new RegExp(`.(png|jpe?g|gif|woff|woff2|ico|svg|mp4)$`)
    config.resolve.alias['@Components'] = path.resolve('./src/components')
    config.resolve.alias['@Styles'] = path.resolve('./src/styles')
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
