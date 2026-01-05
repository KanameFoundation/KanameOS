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

//
// This is the client bootstrapping script.
// This is where you can register service providers or set up
// your libraries etc.
//
// https://manual.os-js.org/guide/provider/
// https://manual.os-js.org/install/
// https://manual.os-js.org/resource/official/
//

import Core from "./core.js";
import config from "./config.js";
import { services } from "./services.js";
import HoshinoInit from "./init/hoshino.js";
import "./index.scss";

const init = async () => {
  const KanameOS = new Core(config, {});

  // Expose service classes for runtime management (systemctl)
  // We map the services object back to just the provider classes for compatibility
  KanameOS.serviceClasses = Object.keys(services).reduce((acc, name) => {
    acc[name] = services[name].provider;
    return acc;
  }, {});

  // Expose full service definitions for dependency graph
  KanameOS.serviceDefinitions = services;

  // Initialize the Hoshino INIT System
  const initSystem = new HoshinoInit(KanameOS, config);

  await initSystem.start(services);

  KanameOS.boot();
};

window.addEventListener("DOMContentLoaded", () => init());
