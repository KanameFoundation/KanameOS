
import merge from 'deepmerge';
import {h, app} from 'hyperapp';
import './index.scss';
import {name as applicationName} from './metadata.json';
import {
  Box,
  BoxContainer,
  Button,
  Toolbar,
  TextField,
  SelectField,
  Tabs
} from '@osjs/gui';

// Maps our section items to a field
const fieldMap = () => {
  const getValue = props => props.transformValue
    ? props.transformValue(props.value)
    : props.value;

  return {
    select: props => (state, actions) => h(SelectField, {
      value: getValue(props),
      choices: props.choices(state),
      oninput: (ev, value) => actions.update({path: props.path, value})
    }),

    dialog: props => (state, actions) => h(BoxContainer, {}, [
      h(TextField, {
        box: {grow: 1},
        readonly: true,
        value: getValue(props),
        oninput: (ev, value) => actions.update({path: props.path, value})
      }),

      h(Button, {
        onclick: () => actions.dialog(props.dialog(props, state, actions, getValue(props)))
      }, '...')
    ]),

    fallback: props => (state, actions) => h(TextField, {
      value: getValue(props),
      oninput: (ev, value) => actions.update({path: props.path, value})
    })
  };
};

// Resolves a tree by dot notation
const resolve = (tree, key, defaultValue) => {
  try {
    const value = key.split(/\./g)
      .reduce((result, key) => result[key], Object.assign({}, tree));

    return typeof value === 'undefined' ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
};

// Resolves settings by dot notation and gets default values
const resolveSetting = (settings, defaults) => key =>
  resolve(settings, key, resolve(defaults, key));

const resolveValue = (key, value) => key === 'desktop.iconview.enabled' // FIXME
  ? value === 'true'
  : value;

// Resolves a new value in our tree
const resolveNewSetting = state => (key, value) => {
  const object = {};
  const keys = key.split(/\./g);

  let previous = object;
  for (let i = 0; i < keys.length; i++) {
    const j = keys[i];
    const last = i >= keys.length - 1;

    previous[j] = last ? resolveValue(key, value) : {};
    previous = previous[j];
  }

  const settings = merge(state.settings, object);
  return {settings};
};

// Our sections
const tabSections = [{
  title: 'Background',
  items: [{
    label: 'Image',
    path: 'desktop.background.src',
    type: 'dialog',
    transformValue: value => value
      ? (typeof value === 'string' ? value : value.path)
      : value,
    dialog: (props, state, actions, currentValue) => ([
      'file',
      {
        type: 'open',
        title: 'Select background',
        mime: [/^image/]
      },
      (btn, value) => {
        if (btn === 'ok') {
          actions.update({path: props.path, value});
        }
      }
    ])
  }, {
    label: 'Style',
    path: 'desktop.background.style',
    type: 'select',
    choices: () => ({
      color: 'Color',
      cover: 'Cover',
      contain: 'Contain',
      repeat: 'Repeat'
    })
  }, {
    label: 'Color',
    path: 'desktop.background.color',
    type: 'dialog',
    dialog: (props, state, actions, currentValue) => ([
      'color',
      {color: currentValue},
      (btn, value) => {
        if (btn === 'ok') {
          actions.update({path: props.path, value: value.hex});
        }
      }
    ])
  }]
}, {
  title: 'Themes',
  items: [{
    label: 'Style',
    path: 'desktop.theme',
    type: 'select',
    choices: state => state.themes.styles
  }, {
    label: 'Icons',
    path: 'desktop.icons',
    type: 'select',
    choices: state => state.themes.icons
  }, {
    label: 'Sounds',
    path: 'desktop.sounds',
    type: 'select',
    choices: state => state.themes.sounds
  }]
}, {
  title: 'Desktop',
  items: [{
    label: 'Enable desktop icons',
    path: 'desktop.iconview.enabled',
    type: 'select',
    choices: () => ([{
      label: 'Yes',
      value: 'true'
    }, {
      label: 'No',
      value: 'false'
    }])
  }, {
    label: 'Font color style',
    path: 'desktop.iconview.fontColorStyle',
    type: 'select',
    defaultValue: 'system',
    choices: () => ({
      system: 'System',
      invert: 'Inverted background color',
      custom: 'Custom color'
    })
  }, {
    label: 'Custom font color',
    path: 'desktop.iconview.fontColor',
    type: 'dialog',
    dialog: (props, state, actions, currentValue) => ([
      'color',
      {color: currentValue},
      (btn, value) => {
        if (btn === 'ok') {
          actions.update({path: props.path, value: value.hex});
        }
      }
    ])
  }]
}, {
  title: 'Locales',
  items: [{
    label: 'Language (requires restart)',
    path: 'locale.language',
    type: 'select',
    choices: state => state.locales
  }]
}];

// Renders sections
const renderSections = (core, state, actions) => {
  const resolver = resolveSetting(state.settings, state.defaults);
  const setting = path => resolver(path);
  const fields = fieldMap();

  return tabSections.map(s => {
    const items = s.items
      .map(i => {
        const item = props =>
          (fields[props.type] || fields.fallback)(props)(state, actions);

        let value = setting(i.path);
        if (typeof value === 'undefined') {
          value = i.defaultValue;
        }

        return [
          h(BoxContainer, {style: {marginBottom: 0}}, i.label),
          h(item, Object.assign({
            type: i.type,
            value
          }, i))
        ];
      });

    return h(Box, {
      grow: 1,
      shrink: 1,
      style: {
        overflow: 'auto'
      }
    }, [].concat(...items));
  });
};

const renderUsersTab = (state, actions) => {
  return h(Box, {grow: 1, shrink: 1, style: {overflow: 'auto', padding: '1em'}}, [
    h('h2', {}, 'User Management'),
    h('div', {style: {display: 'flex', flexDirection: 'column', marginBottom: '1em', gap: '0.5em'}}, [
      h(TextField, {
        placeholder: 'Username',
        value: state.newUser.username,
        oninput: (ev, value) => actions.updateNewUser({username: value})
      }),
      h(TextField, {
        placeholder: 'Password',
        type: 'password',
        value: state.newUser.password,
        oninput: (ev, value) => actions.updateNewUser({password: value})
      }),
      h(Button, {onclick: () => actions.createUser()}, 'Add User')
    ]),
    h('div', {}, state.users.map(user => 
      h('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5em', borderBottom: '1px solid #333'}}, [
        h('span', {}, `${user.username} (${user.groups.join(', ')})`),
        user.username !== 'admin' ? h(Button, {onclick: () => actions.deleteUser(user.username)}, 'Delete') : null
      ])
    ))
  ]);
};

const renderAboutTab = (state, actions) => {
  return h(Box, {grow: 1, shrink: 1, style: {overflow: 'auto', padding: '1em'}}, [
    h('h2', {}, 'About WebOS'),
    h('p', {}, 'WebOS - Web Based Operating System'),
    h('p', {}, `Version: ${WEBOS_VERSION}`),
    h('p', {}, [
      'Author: ',
      h('a', {href: 'mailto:cyberaioff@gmail.com'}, 'Abdul Vaiz')
    ]),
    h('p', {}, 'License: BSD-2-Clause'),
    h('p', {}, [
      'Website: ',
      h('a', {href: 'https://github.com/DemuraAIdev/webOS', target: '_blank'}, 'https://github.com/DemuraAIdev/webOS')
    ])
  ]);
};

// Renders our settings window
const renderWindow = (core, proc) => ($content, win) => {
  const settingsService = core.make('osjs/settings');
  const packageService = core.make('osjs/packages');
  const desktopService = core.make('osjs/desktop');
  const {translate, translatableFlat} = core.make('osjs/locale');
  const filter = type => pkg => pkg.type === type;

  const getThemes = () => {
    const get = type => packageService
      .getPackages(filter(type))
      .map(pkg => ({value: pkg.name, label: translatableFlat(pkg.title)}));

    return {
      styles: get('theme'),
      icons: get('icons'),
      sounds: [
        {value: '', label: 'None'},
        ...get('sounds')
      ]
    };
  };

  const getLocales = () => core.config('languages', {
    en_EN: 'English'
  });

  const getDefaults = () => ({
    desktop: core.config('desktop.settings', {}),
    locale: core.config('locale', {})
  });

  const getSettings = () => ({
    desktop: settingsService.get('osjs/desktop', undefined, {}),
    locale: settingsService.get('osjs/locale', undefined, {})
  });

  const setSettings = settings => settingsService
    .set('osjs/desktop', null, settings.desktop)
    .set('osjs/locale', null, settings.locale)
    .save();

  const createDialog = (...args) => core.make('osjs/dialog', ...args);

  const view = (state, actions) => h(Box, {}, [
    h(Tabs, {
      grow: 1,
      shrink: 1,
      labels: [...tabSections.map(s => s.title), 'Users', 'About']
    }, [
      ...renderSections(core, state, actions),
      renderUsersTab(state, actions),
      renderAboutTab(state, actions)
    ]),

    h(BoxContainer, {}, [
      h(Toolbar, {grow: 1, shrink: 1, justify: 'flex-end'}, [
        h(Button, {
          onclick: () => actions.save()
        }, translate('LBL_SAVE'))
      ])
    ])
  ]);

  const initialState = {
    loading: false,
    locales: getLocales(),
    themes: getThemes(),
    defaults: getDefaults(),
    settings: getSettings(),
    users: [],
    newUser: {username: '', password: ''}
  };

  const actions = {
    save: () => (state, actions) => {
      if (state.loading) {
        return;
      }

      actions.setLoading(true);

      setSettings(state.settings)
        .then(() => {
          actions.setLoading(false);
          desktopService.applySettings();
        })
        .catch(error => {
          actions.setLoading(false);
          console.error(error);
        });
    },

    dialog: options => () => {
      const [name, args, callback] = options;

      createDialog(name, args, {
        attributes: {modal: true},
        parent: win
      }, callback);
    },

    update: ({path, value}) => state => resolveNewSetting(state)(path, value),
    refresh: () => () => ({settings: getSettings()}),
    setLoading: loading => ({loading}),

    // User Management Actions
    fetchUsers: () => async (state, actions) => {
      try {
        const response = await fetch('/api/Settings/users');
        if (!response.ok) throw new Error(response.statusText);
        const users = await response.json();
        actions.setUsers(users);
      } catch (e) {
        console.error(e);
      }
    },
    setUsers: users => ({users}),
    updateNewUser: data => state => ({newUser: {...state.newUser, ...data}}),
    createUser: () => async (state, actions) => {
      try {
        const response = await fetch('/api/Settings/users/create', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(state.newUser)
        });
        if (!response.ok) throw new Error(response.statusText);
        actions.updateNewUser({username: '', password: ''});
        actions.fetchUsers();
      } catch (e) {
        createDialog('alert', {title: 'Error', message: e.message || 'Failed to create user'}, {parent: win});
      }
    },
    deleteUser: username => async (state, actions) => {
      createDialog('confirm', {title: 'Delete User', message: `Are you sure you want to delete ${username}?`}, {parent: win}, async (btn) => {
        if (btn === 'yes') {
          try {
            const response = await fetch('/api/Settings/users/delete', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({username})
            });
            if (!response.ok) throw new Error(response.statusText);
            actions.fetchUsers();
          } catch (e) {
            createDialog('alert', {title: 'Error', message: e.message || 'Failed to delete user'}, {parent: win});
          }
        }
      });
    }
  };

  const instance = app(initialState, actions, view, $content);
  const refresh = () => instance.refresh();

  win.on('settings/refresh', refresh);
  
  // Initial fetch of users
  instance.fetchUsers();
};

// Creates our application
const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {args, options, metadata});
  const {icon} = core.make('osjs/theme');
  const winIcon = icon(metadata.icon);



  const win = proc.createWindow({
    id: 'SettingsMainWindow',
    title: metadata.title.en_EN,
    icon: winIcon,
    dimension: {width: 500, height: 500},
    gravity: 'center'
  });

  const onSettingsSave = () => win.emit('settings/refresh');

  core.on('osjs/settings:save', onSettingsSave);

  win.on('destroy', () => {
    core.off('osjs/settings:save', onSettingsSave);
    proc.destroy();
  });

  win.render(renderWindow(core, proc));

  return proc;
};

// Register package in OS.js
OSjs.register(applicationName, register);
