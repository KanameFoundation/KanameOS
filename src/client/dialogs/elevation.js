
import {h, app} from 'hyperapp';

/**
 * Shows the Elevation (Sudo) Dialog
 * @param {Core} core OS.js Core reference
 * @returns {Promise<{username: string, password: string}>} Credentials if confirmed, rejection if cancelled
 */
export default (core) => {
  return new Promise((resolve, reject) => {
    // Create a temporary window or overlay for the dialog
    // We can use the OS.js Window API to make it look native
    const { icon } = core.make("osjs/theme");
    const winIcon = icon("system-lock-screen");
    const win = core.make('osjs/window', {
      title: 'Administrator Access Required',
      icon: winIcon,
      dimension: {width: 400, height: 260},
      position: 'center',
      attributes: {
        modal: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        closeable: true
      }
    });

    let submitted = false;
    win.on('destroy', () => {
        if (!submitted) reject(new Error('Cancelled'));
    });
    
    // Dialog UI State
    const state = {
      username: '',
      password: '',
      error: null
    };

    // Dialog Actions
    const actions = {
      setRequest: ({name, value}) => state => ({[name]: value}),
      setError: error => ({error}),
      submit: () => (state, actions) => {
        if (!state.username || !state.password) {
           return actions.setError('Please enter both username and password');
        }
        
        submitted = true;
        win.destroy(); // Close window
        resolve({
            username: state.username,
            password: state.password
        });
      },
      cancel: () => () => {
          win.destroy();
          reject(new Error('Cancelled'));
      }
    };

    // Dialog View
    const view = (state, actions) => h('div', {
        class: 'osjs-dialog-root',
        style: {
            display: 'flex',
            flexDirection: 'column',
            padding: '1em',
            height: '100%',
            boxSizing: 'border-box'
        }
    }, [
      h('div', {
          style: {
              marginBottom: '1em',
              display: 'flex',
              alignItems: 'center'
          }
      }, [
          h('img', {
              src: winIcon,
              style: { marginRight: '1em', width: '32px', height: '32px' }
          }),
          h('span', {}, 'This action requires Administrator privileges. Please enter your credentials to proceed.')
      ]),

      state.error ? h('div', {
          style: { color: 'red', marginBottom: '1em', fontSize: '0.9em' }
      }, state.error) : null,

      h('div', { 
         class: 'osjs-form-group',
         style: { marginBottom: '10px' } 
      }, [
        h('label', { style: { display: 'block', marginBottom: '5px' } }, 'Username'),
        h('input', {
          class: 'osjs-form-input',
          style: { width: '100%', boxSizing: 'border-box' },
          value: state.username,
          oninput: ev => actions.setRequest({name: 'username', value: ev.target.value}),
          oncreate: el => el.focus(),
          onkeydown: ev => {
              if (ev.keyCode === 13) document.querySelector('.osjs-dialog-password').focus();
          }
        })
      ]),

      h('div', { 
          class: 'osjs-form-group',
           style: { marginBottom: '10px' } 
      }, [
        h('label', { style: { display: 'block', marginBottom: '5px' } }, 'Password'),
        h('input', {
          type: 'password',
          class: 'osjs-form-input osjs-dialog-password',
          style: { width: '100%', boxSizing: 'border-box' },
          value: state.password,
          oninput: ev => actions.setRequest({name: 'password', value: ev.target.value}),
          onkeydown: ev => {
              if (ev.keyCode === 13) actions.submit();
          }
        })
      ]),

      h('div', {
          style: {
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'flex-end'
          }

      }, [
        h('button', {
            onclick: () => actions.cancel(),
            class: 'osjs-gui-button'
        }, 'Cancel'),
        h('button', {
            onclick: () => actions.submit(),
            class: 'osjs-gui-button osjs-gui-button-primary',
            style: { marginLeft: '0.5em' }
        }, 'Authenticate')
      ])
    ]);

    // Render
    win.render(($content, win) => app(state, actions, view, $content));
    win.focus();
  });
};
