/*
 * WebOS - Web Based Operating System
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

const Core = require('./core.js')
const CoreServiceProvider = require('./providers/core.js');
const PackageServiceProvider = require('./providers/packages.js');
const VFSServiceProvider = require('./providers/vfs.js');
const AuthServiceProvider = require('./providers/auth.js');
const SettingsServiceProvider = require('./providers/settings.js');
const jsonAuth = require('./adapters/auth/json.js');

const config = require('./config.js');
const WebOS = new Core(config, {});

WebOS.register(CoreServiceProvider, {before: true});
WebOS.register(PackageServiceProvider);
WebOS.register(VFSServiceProvider);
WebOS.register(AuthServiceProvider, {
  args: {
    adapter: jsonAuth
  }
});
WebOS.register(SettingsServiceProvider, {
  args: {
    adapter: 'fs'
  }
});

const shutdown = signal => (error) => {
  if (error instanceof Error) {
    console.error(error);
  }

  WebOS.destroy(() => process.exit(signal));
};

process.on('SIGTERM', shutdown(0));
process.on('SIGINT', shutdown(0));
process.on('exit', shutdown(0));

WebOS.boot().catch(shutdown(1));