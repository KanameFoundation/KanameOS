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

//
// This is the client bootstrapping script.
// This is where you can register service providers or set up
// your libraries etc.
//
// https://manual.os-js.org/guide/provider/
// https://manual.os-js.org/install/
// https://manual.os-js.org/resource/official/
//

import Core from './core.js';
import CoreServiceProvider from './provider/core.js';
import VFSServiceProvider from './provider/vfs.js';
import AuthServiceProvider from './provider/auth.js';
import SettingsServiceProvider from './provider/settings.js';
import DesktopServiceProvider from './provider/desktop.js';
import NotificationServiceProvider  from './provider/notifications.js';

import {PanelServiceProvider} from '@osjs/panels';
import {GUIServiceProvider} from '@osjs/gui';
import {DialogServiceProvider} from '@osjs/dialogs';
import config from './config.js';
import './index.scss';

const init = () => {
  const WebOS = new Core(config, {});

  // Register your service providers
  WebOS.register(CoreServiceProvider);
  WebOS.register(DesktopServiceProvider);
  WebOS.register(VFSServiceProvider);
  WebOS.register(NotificationServiceProvider);
  WebOS.register(SettingsServiceProvider, {before: true});
  WebOS.register(AuthServiceProvider, {before: true});
  WebOS.register(PanelServiceProvider);
  WebOS.register(DialogServiceProvider);
  WebOS.register(GUIServiceProvider);

  WebOS.boot();
};

window.addEventListener('DOMContentLoaded', () => init());
