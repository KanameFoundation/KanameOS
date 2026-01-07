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
 *
 * Redistribution and use in source and binary forms...
 */

// This is the server bootstrapping script.
// This is where you can register service providers or set up
// your libraries etc.
//
// https://manual.os-js.org/guide/provider/
// https://manual.os-js.org/install/
// https://manual.os-js.org/resource/official/
//

const Core = require("./core.js");
const config = require("./config.js");
const services = require("./services.js");
const HoshinoInit = require("./init/hoshino.js");
const fs = require("fs-extra");
const path = require("path");

// Ensure metadata.json exists in the persistent VFS (important for Docker volumes)
const ensureMetadata = () => {
  try {
    const targetPath = config.packages.metadata;
    const defaultPath = path.resolve(config.root, "vfs/metadata.json");

    if (!fs.existsSync(targetPath) && fs.existsSync(defaultPath)) {
      console.log(`[KanameOS] Seeding metadata.json to ${targetPath}`);
      fs.ensureDirSync(path.dirname(targetPath));
      fs.copySync(defaultPath, targetPath);
    }
  } catch (e) {
    console.warn("[KanameOS] Failed to seed metadata.json:", e);
  }
};

const ensureVFSDirectories = () => {
  try {
    const tmpDir = path.join(config.vfs.root, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      console.log(`[KanameOS] Creating tmp directory at ${tmpDir}`);
      fs.ensureDirSync(tmpDir);
    }
  } catch (e) {
    console.warn("[KanameOS] Failed to create VFS directories:", e);
  }
};

ensureMetadata();
ensureVFSDirectories();

const KanameOS = new Core(config, {});

// Initialize the Hoshino INIT System (Server Side)
const initSystem = new HoshinoInit(KanameOS, config);
initSystem.start(services);

const shutdown = (signal) => (error) => {
  if (error instanceof Error) {
    console.error(error);
  }

  KanameOS.destroy(() => process.exit(signal));
};

process.on("SIGTERM", shutdown(0));
process.on("SIGINT", shutdown(0));
process.on("exit", shutdown(0));

KanameOS.boot().catch(shutdown(1));
