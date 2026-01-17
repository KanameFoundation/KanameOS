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
const vfsRoot = process.env.KANAMEOS_VFS_PATH || path.join(process.cwd(), "vfs");

module.exports = {
  root,
  development: !(process.env.NODE_ENV || "").match(/^prod/i),
  logging: true,
  index: "index.html",
  bind: process.env.KANAMEOS_BIND || "127.0.0.1",
  port: process.env.KANAMEOS_PORT || 8000,
  public: path.resolve(root, "dist"),
  morgan: "tiny",
  express: {
    maxFieldsSize: mb(20),
    maxFileSize: mb(200),
    maxBodySize: "200mb",
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
    adapter: require("./adapters/auth/arima.js"),
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
        path: path.join(vfsRoot, "session-store.db"),
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
    // List of system packages (node_modules) to load.
    // We list them here to avoid scanning the entire node_modules directory.
    system: [
      "@osjs/gui",
      "@osjs/dialogs"
    ],
    metadata: path.join(vfsRoot, "metadata.json"),
  },
  vfs: {
    watch: false,
    root: vfsRoot,
    mountpoints: [
      {
        name: "os",
        attributes: {
          root: "{vfs}",
          groups: ["admin"],
        },
      },
      {
        name: "home",
        attributes: {
          root: "{vfs}/users/{username}",
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
