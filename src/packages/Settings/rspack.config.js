const path = require('path');
const rspack = require('@rspack/core');
const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';

module.exports = {
  mode,
  devtool: 'source-map',
  entry: path.resolve(__dirname, 'index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    library: {
      type: 'window'
    }
  },
  optimization: {
    minimize
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: 'main.css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            sourceMaps: true,
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
