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
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: "Preview",
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
