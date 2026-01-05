const path = require("path");
const rspack = require("@rspack/core");
const mode = process.env.NODE_ENV || "development";
const minimize = mode === "production";

module.exports = {
  mode,
  devtool: "source-map",
  entry: {
    main: [
      path.resolve(__dirname, "index.js"),
      path.resolve(__dirname, "index.scss"),
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: "Store",
    libraryTarget: "umd",
  },
  externals: {
    osjs: "OSjs",
  },
  optimization: {
    minimize,
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: "[name].css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          "css-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.js$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
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
