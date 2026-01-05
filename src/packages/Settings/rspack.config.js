const path = require("path");
const rspack = require("@rspack/core");
const mode = process.env.NODE_ENV || "development";
const minimize = mode === "production";
const npm = require("../../../package.json");

module.exports = {
  mode,
  devtool: "source-map",
  entry: path.resolve(__dirname, "index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    library: {
      type: "window",
    },
  },
  optimization: {
    minimize,
  },
  plugins: [
    new rspack.DefinePlugin({
      WEBOS_VERSION: JSON.stringify(npm.version),
    }),
    new rspack.CssExtractRspackPlugin({
      filename: "main.css",
    }),
  ],
  module: {
    rules: [
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
    ],
  },
};
