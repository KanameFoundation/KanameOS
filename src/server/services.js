const CoreServiceProvider = require('./providers/core.js');
const PackageServiceProvider = require('./providers/packages.js');
const VFSServiceProvider = require('./providers/vfs.js');
const AuthServiceProvider = require('./providers/auth.js');
const SettingsServiceProvider = require('./providers/settings.js');
const arimaAuth = require('./adapters/auth/arima.js');

module.exports = {
  CoreServiceProvider: {
    provider: CoreServiceProvider,
    options: {before: true}
  },
  PackageServiceProvider: {
    provider: PackageServiceProvider,
    options: {}
  },
  VFSServiceProvider: {
    provider: VFSServiceProvider,
    options: {}
  },
  AuthServiceProvider: {
    provider: AuthServiceProvider,
    options: {
      args: {
        adapter: arimaAuth
      }
    }
  },
  SettingsServiceProvider: {
    provider: SettingsServiceProvider,
    options: {
      args: {
        adapter: 'fs'
      }
    }
  }
};
