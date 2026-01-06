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
import HoshinoServiceProvider from "./init/hoshino.js";
// import HoshinoInit from "./init/hoshino.js";
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

  // Initialize the Hoshino Init System (real init system, like systemd)
  const hoshinoInstance = new HoshinoServiceProvider(KanameOS, config);
  
  // Register as singleton for global access
  KanameOS.singleton("webos/service", () => hoshinoInstance);

  // Expose Hoshino globally for debugging
  window.hoshino = hoshinoInstance;
  
  // Expose systemctl-like commands
  window.systemctl = {
    start: (name) => hoshinoInstance.startService(name, services),
    stop: (name) => hoshinoInstance.stopService(name),
    restart: (name) => hoshinoInstance.restartService(name, services),
    status: (name) => hoshinoInstance.getServiceStatus(name),
    list: () => hoshinoInstance.listServices(),
    enable: (name) => hoshinoInstance.enableService(name),
    disable: (name) => hoshinoInstance.disableService(name)
  };

  // Hoshino controls the boot process (like systemd)
  await hoshinoInstance.start(services);
};

window.addEventListener("DOMContentLoaded", () => init());
