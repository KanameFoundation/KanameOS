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
const path = require('path');

//
// This is where you can place your custom CLI tasks
// https://manual.os-js.org/guide/cli/
// https://manual.os-js.org/resource/official/
//

module.exports = {
  discover: [
    path.resolve(__dirname, '../packages') // OS.js/src/packages
  ],
  tasks: []
};
