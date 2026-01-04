const path = require('path');
const rspack = require('@rspack/core');
const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';

module.exports = {
  mode,
  devtool: 'source-map',
  entry: {
    main: [
      path.resolve(__dirname, 'index.js'),
      path.resolve(__dirname, 'index.scss')
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: 'Terminal',
    libraryTarget: 'umd'
  },
  externals: {
    osjs: 'OSjs'
  },
  optimization: {
    minimize,
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: '[name].css'
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'logo.svg' },
        { from: 'metadata.json' }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'ecmascript'
              }
            }
          }
        }
      }
    ]
  }
};
