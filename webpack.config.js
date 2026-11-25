const path = require('path')

const swcDefaultConfig =
  require('@nestjs/cli/lib/compiler/defaults/swc-defaults').swcDefaultsFactory().swcOptions

/**
 * Production builds (BUILD_EXCLUDE_DATA=true, see `pnpm build:prod` and ci/Dockerfile) swap the
 * seed / mock modules of src/app/data for empty stubs, so none of their code is bundled. The
 * imports in app.module.ts / cli.module.ts stay as they are; dev builds keep the real modules.
 */
const excludeData = process.env.BUILD_EXCLUDE_DATA === 'true'
const DATA_MODULES = /[\\/]data[\\/]data\.(mock|seed)\.module(\.ts)?$/
const DATA_STUB = path.resolve(__dirname, 'src/app/data/data.stub.module.ts')

// Nest calls the factory with its default options and shallow-merges the result
module.exports = (options, webpack) => ({
  ...options,
  module: {
    rules: [
      {
        test: /\.(j|t)s$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: swcDefaultConfig,
        },
      },
    ],
  },
  plugins: [
    ...(options.plugins ?? []),
    ...(excludeData ? [new webpack.NormalModuleReplacementPlugin(DATA_MODULES, DATA_STUB)] : []),
  ],
})
