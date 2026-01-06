/*
 * KanameOS - Web Based Operating System
 *
 * Copyright (c) 2026 Abdul Vaiz Vahry Iskandar <cyberaioff@gmail.com>
 * All rights reserved.
 *
 * ---------------------------------------------------------
 * Based on OS.js - JavaScript Cloud/Web Desktop Platform
 * Copyright (c) Anders Evenrud <andersevenrud@gmail.com>
 * ---------------------------------------------------------
 */

const path = require("path");
const root = path.resolve(__dirname, "../../");
const maxAge = 60 * 60 * 12;
const mb = (m) => m * 1024 * 1024;

module.exports = {
  root,
  development: !(process.env.NODE_ENV || "").match(/^prod/i),
  logging: true,
  index: "index.html",
  bind: "127.0.0.1",
  port: 8000,
  public: path.resolve(root, "dist"),
  morgan: "tiny",
  express: {
    maxFieldsSize: mb(20),
    maxFileSize: mb(200),
    maxBodySize: "100kb",
  },
  https: {
    enabled: false,
    options: {
      key: null,
      cert: null,
    },
  },
  ws: {
    port: null,
    ping: 30 * 1000,
  },
  proxy: [],
  auth: {
    vfsGroups: [],
    defaultGroups: [],
    requiredGroups: [],
    requireAllGroups: false,
    denyUsers: [],
  },

  enabledServices: [
    "CoreServiceProvider",
    "PackageServiceProvider",
    "VFSServiceProvider",
    "AuthServiceProvider",
    "SettingsServiceProvider",
  ],
  mime: {
    filenames: {
      Makefile: "text/x-makefile",
      ".gitignore": "text/plain",
    },
    define: {
      "text/x-lilypond": ["ly", "ily"],
      "text/x-python": ["py"],
      "application/tar+gzip": ["tgz"],
      "application/webpackage": ["wpk"],
    },
  },
  session: {
    store: {
      module: require.resolve("connect-loki"),
      options: {
        autosave: true,
      },
    },
    options: {
      name: "osjs.sid",
      secret: "osjs",
      rolling: true,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: "auto",
        maxAge: 1000 * maxAge,
      },
    },
  },
  packages: {
    discovery: "packages.json",
    metadata: "../vfs/metadata.json",
  },
  vfs: {
    watch: false,
    root: path.join(process.cwd(), "vfs"),
    mountpoints: [
      {
        name: "system",
        attributes: {
          root: "{root}/dist",
          readOnly: true,
        },
      },
      {
        name: "home",
        attributes: {
          root: "{vfs}/{username}",
        },
      },
      {
        name: "tmp",
        attributes: {
          root: "{vfs}/tmp",
        },
      },
    ],
    home: {
      template: [
        {
          path: ".desktop/.shortcuts.json",
          contents: JSON.stringify([]),
        },
        {
          path: "Downloads/.keep",
          contents: "",
        },
      ],
    },
  },
};
