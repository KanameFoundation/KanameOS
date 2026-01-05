import CoreServiceProvider from './provider/core.js';
import VFSServiceProvider from './provider/vfs.js';
import AuthServiceProvider from './provider/auth.js';
import SettingsServiceProvider from './provider/settings.js';
import DesktopServiceProvider from './provider/desktop.js';
import NotificationServiceProvider  from './provider/notifications.js';

import {PanelServiceProvider} from '@osjs/panels';
import {GUIServiceProvider} from '@osjs/gui';
import {DialogServiceProvider} from '@osjs/dialogs';

export const services = {
  CoreServiceProvider: {
    provider: CoreServiceProvider,
    options: {}
  },
  VFSServiceProvider: {
    provider: VFSServiceProvider,
    options: {
      depends: ['osjs/core']
    }
  },
  AuthServiceProvider: {
    provider: AuthServiceProvider,
    options: {
      before: true,
      depends: ['osjs/core']
    }
  },
  SettingsServiceProvider: {
    provider: SettingsServiceProvider,
    options: {
      before: true,
      depends: ['osjs/core']
    }
  },
  NotificationServiceProvider: {
    provider: NotificationServiceProvider,
    options: {
      depends: ['osjs/core']
    }
  },
  GUIServiceProvider: {
    provider: GUIServiceProvider,
    options: {
      depends: ['osjs/core']
    }
  },
  DialogServiceProvider: {
    provider: DialogServiceProvider,
    options: {
      depends: ['osjs/gui']
    }
  },
  PanelServiceProvider: {
    provider: PanelServiceProvider,
    options: {
      depends: ['osjs/core', 'osjs/gui']
    }
  },
  DesktopServiceProvider: {
    provider: DesktopServiceProvider,
    options: {
      depends: [
        'osjs/core',
        'osjs/auth',
        'osjs/settings',
        'osjs/vfs',
        'osjs/gui',
        'osjs/dialog',
        'osjs/panels'
      ]
    }
  }
};
