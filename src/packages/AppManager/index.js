import {name as applicationName} from './metadata.json';
import {h, app} from 'hyperapp';
import {Box, Button, TextField, Toolbar, Menubar} from '@osjs/gui';

const createView = (core) => (state, actions) => {
  const filteredPackages = state.packages.filter(pkg => {
    const query = state.search.toLowerCase();
    const name = pkg.name.toLowerCase();
    const desc = (pkg.description && pkg.description.en_EN ? pkg.description.en_EN : (pkg.description || '')).toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  return h(Box, {}, [
    h(Toolbar, {}, [
      h(Button, {
        onclick: () => actions.openInstallDialog()
      }, 'Install Package'),
      h(TextField, {
        placeholder: 'Search packages...',
        oninput: (ev, value) => actions.setSearch(value),
        value: state.search
      })
    ]),
    h(Box, {grow: 1, shrink: 1, style: {overflow: 'auto'}}, [
      h('div', {class: 'app-list'}, filteredPackages.map(pkg => {
        let icon = null;
        if (pkg.icon) {
           if (pkg.icon.match(/^(https?:|\/)/)) {
             icon = pkg.icon;
           } else if (pkg.icon.match(/\.(png|svg|gif|jpg|jpeg)$/)) {
             icon = `/apps/${pkg.name}/${pkg.icon}`;
           } else {
             icon = core.make('osjs/theme').icon(pkg.icon);
           }
        }

        return h('div', {class: 'app-item', style: {display: 'flex', alignItems: 'center', padding: '5px', borderBottom: '1px solid #ddd'}}, [
          icon ? h('img', {
            src: icon,
            style: {width: '32px', height: '32px', marginRight: '10px'}
          }) : null,
          h('div', {style: {flex: 1}}, [
            h('span', {style: {fontWeight: 'bold'}}, pkg.name),
            h('span', {style: {marginLeft: '10px'}}, pkg.description ? pkg.description.en_EN : '')
          ]),
          h(Button, {
            onclick: () => actions.uninstall(pkg.name)
          }, 'Uninstall')
        ]);
      }))
    ])
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {args, options, metadata});
  
  const installFromVfs = (vfsPath, reloadCallback) => {
    fetch(proc.resource('/inspect'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({vfsPath})
    })
    .then(res => res.json())
    .then(metadata => {
      if (metadata.error) {
        throw new Error(metadata.error);
      }

      const author = metadata.author || 'Unknown';
      const description = (metadata.description && metadata.description.en_EN) || metadata.description || 'No description';
      
      core.make('osjs/dialog', 'confirm', {
        title: 'Install Package',
        message: `Do you want to install ${metadata.name}?\n\nDescription: ${description}\nAuthor: ${author}`
      }, (btn) => {
        if (btn === 'yes') {
          const dialog = core.make('osjs/dialog', 'alert', {
            title: 'Installing...',
            message: 'Please wait while the package is being installed.',
            buttons: [] // Hide buttons
          }, () => {});

          fetch(proc.resource('/install'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({vfsPath})
          })
          .then(res => res.json())
          .then(result => {
            dialog.destroy(); // Close installing dialog
            if (result.success) {
              core.make('osjs/dialog', 'alert', {title: 'Success', message: `Installed ${result.name}`}, () => {});
              if (reloadCallback) reloadCallback();
            } else {
              core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
            }
          })
          .catch(err => {
             dialog.destroy(); // Close installing dialog
             core.make('osjs/dialog', 'alert', {title: 'Error', message: err.message}, () => {});
          });
        }
      });
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
      packages: [],
      search: ''
    }, {
      setPackages: packages => state => ({packages}),
      setSearch: search => state => ({search}),
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
        installFromVfs(vfsPath, () => actions.loadPackages());
      },
      install: file => (state, actions) => {
        const formData = new FormData();
        formData.append('package', file);

        const dialog = core.make('osjs/dialog', 'alert', {
          title: 'Installing...',
          message: 'Please wait while the package is being installed.',
          buttons: []
        }, () => {});

        fetch(proc.resource('/install'), {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(result => {
          dialog.destroy();
          if (result.success) {
            core.make('osjs/dialog', 'alert', {title: 'Success', message: `Installed ${result.name}`}, () => {});
            actions.loadPackages();
          } else {
            core.make('osjs/dialog', 'alert', {title: 'Error', message: result.error}, () => {});
          }
        })
        .catch(err => {
           dialog.destroy();
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
    }, createView(core), $content).loadPackages();
  });

  return proc;
};

OSjs.make('osjs/packages').register(applicationName, register);

