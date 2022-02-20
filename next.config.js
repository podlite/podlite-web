// const isDev = process.env.NODE_ENV !== "production";
const withPlugins = require("next-compose-plugins");
const optimizedImages = require("next-optimized-images");
module.exports = withPlugins([
  [optimizedImages,
      {
        //   assetPrefix: isDev ? "" : `/`,
          handleImages: ["jpeg", "jpg", "png", "svg"],
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
    reactStrictMode: true,
    // esModule: true,
    webpack: (config) => {
      const assetRegex = new RegExp(`.(png|jpe?g|gif|woff|woff2|ico|svg|mp4)$`);

      config.module.rules.push({
        test: assetRegex,
        type: "asset/resource",
        generator: {
          filename: "./static/assets/[name]-[contenthash].[ext]",
        },
      });
      return config;
    },
  },
]);

