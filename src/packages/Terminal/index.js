import {name as applicationName} from './metadata.json';
import {h, app} from 'hyperapp';
import {Box} from '@osjs/gui';
import './index.scss';

const createView = (core, proc) => (state, actions) => {
  return h(Box, {
    class: 'osjs-terminal-window',
    oncreate: (el) => {
      // Focus input on click
      el.addEventListener('click', () => {
        const input = el.querySelector('input');
        if (input) input.focus();
      });
    }
  }, [
    h('div', {
      class: 'terminal-output',
      onupdate: (el) => {
        el.scrollTop = el.scrollHeight;
      }
    }, state.history.map(item => h('div', {}, [
      h('div', {class: 'command'}, `> ${item.command}`),
      h('div', {class: item.error ? 'error' : 'result'}, item.result)
    ]))),
    h('div', {class: 'terminal-input-area'}, [
      h('span', {}, '>'),
      h('input', {
        type: 'text',
        value: state.input,
        oninput: (ev) => actions.setInput(ev.target.value),
        onkeydown: (ev) => {
          if (ev.key === 'Enter') {
            actions.run();
          }
        },
        oncreate: (el) => el.focus()
      })
    ])
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {args, options, metadata});

  proc.createWindow({
    id: 'TerminalWindow',
    title: metadata.title.en_EN,
    icon: proc.resource(metadata.icon),
    dimension: {width: 600, height: 400}
  })
  .on('destroy', () => proc.destroy())
  .render(($content) => {
    app({
      input: '',
      history: [{
        command: 'System',
        result: 'Welcome to WebOS Terminal. Type JavaScript commands to execute them.',
        error: false
      }]
    }, {
      setInput: input => state => ({input}),
      run: () => state => {
        const command = state.input;
        if (!command) return;

        // REPL Context
        const os = core;
        const app = proc;
        const listPackages = () => core.make('osjs/packages').getPackages().map(p => p.name);

        let result;
        let error = false;
        try {
          // eslint-disable-next-line no-eval
          const evalResult = eval(command);
          if (typeof evalResult === 'object' && evalResult !== null) {
             try {
               result = JSON.stringify(evalResult, null, 2);
             } catch (e) {
               result = String(evalResult);
             }
          } else {
             result = String(evalResult);
          }
        } catch (e) {
          result = e.message;
          error = true;
        }

        return {
          input: '',
          history: state.history.concat({command, result, error})
        };
      }
    }, createView(core, proc), $content);
  });

  return proc;
};

OSjs.make('osjs/packages').register(applicationName, register);

export default register;
