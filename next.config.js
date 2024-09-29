// const isDev = process.env.NODE_ENV !== "production";
const path = require('path')
const withPlugins = require('next-compose-plugins')
const optimizedImages = require('next-optimized-images')
module.exports = withPlugins([
  [
    optimizedImages,
    {
      //   assetPrefix: isDev ? "" : `/`,
      handleImages: ['jpeg', 'jpg', 'png', 'svg'],
      //   optimizeImages: {
      /* config for next-optimized-images */
      mozjpeg: {
        quality: 70,
      },
      optipng: {
        optimizationLevel: 3,
      },
      optimizeImagesInDev: true,
      //   }
    },
  ],
  {
    images: {
      disableStaticImages: true,
    },
    // swcMinify: false,
    reactStrictMode: true,
    // staticPageGenerationTimeout: 2000,
    experimental: {
      esmExternals: false,
      webpackBuildWorker: true,
    },
    // esModule: true,
    webpack: config => {
      const assetRegex = new RegExp(`.(png|jpe?g|gif|woff|woff2|ico|svg|mp4)$`)
      ;(config.resolve.alias['@Components'] = path.resolve('./src/components')),
        (config.resolve.alias['@Styles'] = path.resolve('./src/styles'))
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
    //   config.optimization.minimize = false
      config.optimization.splitChunks = {
        chunks: 'all',
      }

      return config
    },
    typescript: {
      // !! WARN !!
      // Dangerously allow production builds to successfully complete even if
      // your project has type errors.
      // !! WARN !!
      ignoreBuildErrors: true,
    },
    eslint: {
      // Warning: This allows production builds to successfully complete even if
      // your project has ESLint errors.
      ignoreDuringBuilds: true,
    },
  },
])
