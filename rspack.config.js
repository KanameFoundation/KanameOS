const path = require("path");
const rspack = require("@rspack/core");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const mode = process.env.NODE_ENV || "development";
const minimize = mode === "production";
const npm = require("./package.json");

module.exports = {
  mode,
  devtool: "source-map",
  entry: {
    kaname: path.resolve(__dirname, "src/client/index.js"),
  },
  resolve: {
    extensions: [".js", ".json"],
    modules: ["node_modules"],
  },
  performance: {
    maxEntrypointSize: 1024 * 1024,
    maxAssetSize: 1024 * 1024,
  },
  optimization: {
    minimize,
    splitChunks: {
      chunks: "all",
    },
  },
  plugins: [
    new rspack.DefinePlugin({
      WEBOS_VERSION: JSON.stringify(npm.version),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/client/index.ejs"),
      favicon: path.resolve(__dirname, "src/client/favicon.ico"),
      title: "KanameOS",
    }),
    new rspack.CssExtractRspackPlugin({
      filename: "[name].css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(svg|png|jpe?g|gif|webp)$/,
        type: "asset/resource",
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        include: /typeface/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              sassOptions: {
                silenceDeprecations: ["legacy-js-api"],
              },
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            sourceMaps: true,
            jsc: {
              parser: {
                syntax: "ecmascript",
              },
            },
          },
        },
      },
      {
        test: /\.js$/,
        enforce: "pre",
        exclude: /node_modules/,
        use: {
          loader: "source-map-loader",
        },
      },
    ],
  },
};
