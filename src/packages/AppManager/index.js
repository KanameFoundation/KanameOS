import {name as applicationName} from './metadata.json';
import {h, app} from 'hyperapp';
import {Box, Button, TextField, Toolbar, Menubar} from '@osjs/gui';

const createView = (state, actions) => {
  return h(Box, {}, [
    h(Toolbar, {}, [
      h(Button, {
        onclick: () => actions.openInstallDialog()
      }, 'Install Package')
    ]),
    h(Box, {grow: 1, shrink: 1, style: {overflow: 'auto'}}, [
      h('div', {class: 'app-list'}, state.packages.map(pkg => 
        h('div', {class: 'app-item', style: {display: 'flex', alignItems: 'center', padding: '5px', borderBottom: '1px solid #ddd'}}, [
          h('div', {style: {flex: 1}}, [
            h('span', {style: {fontWeight: 'bold'}}, pkg.name),
            h('span', {style: {marginLeft: '10px'}}, pkg.description ? pkg.description.en_EN : '')
          ]),
          h(Button, {
            onclick: () => actions.uninstall(pkg.name)
          }, 'Uninstall')
        ])
      ))
    ])
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {args, options, metadata});
  
  const installFromVfs = (vfsPath) => {
    const dialog = core.make('osjs/dialog', 'alert', {
      title: 'Installing...',
      message: 'Please wait while the package is being installed.'
    }, () => {});

    fetch(proc.resource('/install'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({vfsPath})
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        core.make('osjs/dialog', 'alert', {title: 'Success', message: `Installed ${result.name}`}, () => {});
        // Refresh package list if window is open
        // But we might not have the window open if launched with args
      } else {
        core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
      }
    })
    .catch(err => {
       core.make('osjs/dialog', 'alert', {title: 'Error', message: err.message}, () => {});
    });
  };

  if (args && args.file) {
    installFromVfs(args.file.path);
    return proc;
  }

  proc.createWindow({
    id: 'AppManagerWindow',
    title: metadata.title.en_EN,
    icon: metadata.icon,
    dimension: {width: 400, height: 400},
    position: {left: 200, top: 200}
  })
  .on('destroy', () => proc.destroy())
  .render(($content, win) => {
    app({
      packages: []
    }, {
      setPackages: packages => state => ({packages}),
      loadPackages: () => (state, actions) => {
        fetch('/packages')
          .then(res => res.json())
          .then(packages => actions.setPackages(packages));
      },
      openInstallDialog: () => (state, actions) => {
        core.make('osjs/dialog', 'file', {
          type: 'open',
          mime: ['application/zip', 'application/webpackage']
        }, (btn, item) => {
          if (btn === 'ok' && item) {
            actions.installFromVfs(item.path);
          }
        });
      },
      installFromVfs: vfsPath => (state, actions) => {
        const dialog = core.make('osjs/dialog', 'alert', {
          title: 'Installing...',
          message: 'Please wait while the package is being installed.'
        }, () => {});

        fetch(proc.resource('/install'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({vfsPath})
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            core.make('osjs/dialog', 'alert', {title: 'Success', message: `Installed ${result.name}`}, () => {});
            actions.loadPackages();
          } else {
            core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
          }
        })
        .catch(err => {
           core.make('osjs/dialog', 'alert', {title: 'Error', message: err.message}, () => {});
        });
      },
      install: file => (state, actions) => {
        const formData = new FormData();
        formData.append('package', file);

        const dialog = core.make('osjs/dialog', 'alert', {
          title: 'Installing...',
          message: 'Please wait while the package is being installed.'
        }, () => {});

        fetch(proc.resource('/install'), {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(result => {
          // dialog.close(); // Dialog API might differ, usually it's just a promise or callback
          if (result.success) {
            core.make('osjs/dialog', 'alert', {title: 'Success', message: `Installed ${result.name}`}, () => {});
            actions.loadPackages();
          } else {
            core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
          }
        })
        .catch(err => {
           core.make('osjs/dialog', 'alert', {title: 'Error', message: err.message}, () => {});
        });
      },
      uninstall: name => (state, actions) => {
        core.make('osjs/dialog', 'confirm', {
          title: 'Uninstall',
          message: `Are you sure you want to uninstall ${name}?`
        }, (btn) => {
          if (btn === 'yes') {
             fetch(proc.resource('/uninstall'), {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify({name})
             })
             .then(res => res.json())
             .then(result => {
               if (result.success) {
                 core.make('osjs/dialog', 'alert', {title: 'Success', message: `Uninstalled ${name}`}, () => {});
                 actions.loadPackages();
               } else {
                 core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
               }
             })
             .catch(err => {
                core.make('osjs/dialog', 'alert', {title: 'Error', message: err.message}, () => {});
             });
          }
        });
      }
    }, createView, $content).loadPackages();
  });

  return proc;
};

OSjs.make('osjs/packages').register(applicationName, register);

