/**
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
import { name as applicationName } from "./metadata.json";
import { h, app } from "hyperapp";
import { Box, Button, SelectField, TextField, RangeInput, Label, Tabs, Toolbar } from "@osjs/gui";
import './index.scss';
import PanelServiceProvider from './src/provider';

export {default as PanelServiceProvider} from './src/provider';
export {default as WindowsPanelItem} from './src/items/windows';
export {default as TrayPanelItem} from './src/items/tray';
export {default as ClockPanelItem} from './src/items/clock';
export {default as MenuPanelItem} from './src/items/menu';
export {default as PanelItem} from './src/panel-item';
export {default as Panel} from './src/panel';

const createSettingsWindow = (core, proc, provider) => {
  if (proc.settingsWindow) {
    proc.settingsWindow.focus();
    return;
  }

  const win = proc.createWindow({
    id: 'osjs-panels-settings',
    title: 'Panel Settings',
    dimension: { width: 400, height: 450 },
    position: 'center'
  });

  proc.settingsWindow = win;

  const state = {
    panelIndex: 0,
    tabIndex: 0,
    options: {}
  };

  const actions = {
    setTab: (index) => state => ({ tabIndex: index }),
    setPanelIndex: (index) => (state) => {
      const panel = provider.panels[index];
      return { 
        panelIndex: index, 
        options: panel ? { ...panel.options } : {} 
      };
    },
    updateOption: ({ key, value }) => state => ({
      options: { ...state.options, [key]: value }
    }),
    apply: () => (state) => {
      const panel = provider.panels[state.panelIndex];
      if (panel) {
        panel.update(state.options);
        provider.save();
      }
    }
  };

  const view = (state, actions) => {
    const panels = provider.panels;
    const panelOptions = panels.map((_, i) => ({ label: `Panel ${i + 1}`, value: i }));

    const renderGeneralTab = () => h(Box, { padding: true, grow: 1, shrink: 1 }, [
      h(Box, { margin: true }, [
        h(Label, {}, "Target Panel"),
        h(SelectField, {
          choices: panelOptions,
          value: state.panelIndex,
          onchange: (ev, value) => actions.setPanelIndex(parseInt(value))
        })
      ]),

      h(Box, { margin: true }, [
        h(Label, {}, "Position"),
        h(SelectField, {
          choices: [{label: 'Top', value: 'top'}, {label: 'Bottom', value: 'bottom'}],
          value: state.options.position || 'top',
          onchange: (ev, value) => actions.updateOption({ key: 'position', value })
        })
      ]),

      h(Box, { margin: true }, [
        h(Label, {}, "Opacity"),
        h(Box, { direction: 'row', align: 'center' }, [
          h('input', {
            type: 'range',
            min: 0,
            max: 1,
            step: 0.01,
            value: state.options.opacity !== undefined ? state.options.opacity : 1,
            oninput: (ev) => actions.updateOption({ key: 'opacity', value: parseFloat(ev.target.value) }),
            style: { flex: 1, marginRight: '12px' }
          }),
          h(TextField, {
            type: 'number',
            min: 0,
            max: 1,
            step: 0.01,
            value: state.options.opacity !== undefined ? state.options.opacity : 1,
            oninput: (ev, value) => actions.updateOption({ key: 'opacity', value: parseFloat(value) }),
            style: { width: '80px' }
          })
        ])
      ])
    ]);

    const renderStyleTab = () => h(Box, { padding: true, grow: 1, shrink: 1 }, [
      h(Box, { margin: true }, [
        h(Label, {}, "Background Color"),
        h(Box, { direction: 'row', align: 'center' }, [
            h(TextField, {
              type: 'color',
              value: state.options.background || '#1e1e1e',
              oninput: (ev, value) => actions.updateOption({ key: 'background', value }),
              style: { width: '60px', marginRight: '8px' }
            }),
            h(TextField, {
                value: state.options.background || '#1e1e1e',
                oninput: (ev, value) => actions.updateOption({ key: 'background', value }),
                style: { flex: 1 }
            })
        ])
      ]),

      h(Box, { margin: true }, [
        h(Label, {}, "Text Color"),
        h(Box, { direction: 'row', align: 'center' }, [
            h(TextField, {
              type: 'color',
              value: state.options.color || '#ffffff',
              oninput: (ev, value) => actions.updateOption({ key: 'color', value }),
              style: { width: '60px', marginRight: '8px' }
            }),
            h(TextField, {
              value: state.options.color || '#ffffff',
              oninput: (ev, value) => actions.updateOption({ key: 'color', value }),
              style: { flex: 1 }
            })
        ])
      ])
    ]);

    return h(Box, {}, [
      h(Tabs, {
        labels: ['General', 'Style'],
        selectedIndex: state.tabIndex,
        onchange: (ev, index) => actions.setTab(index)
      }, [
        renderGeneralTab(),
        renderStyleTab()
      ]),
      
      h(Toolbar, { justify: 'flex-end' }, [
        h(Button, {
          label: "Apply & Save",
          onclick: actions.apply
        })
      ])
    ]);
  };

  win.render($content => {
    const wiredActions = app(state, actions, view, $content);
    wiredActions.setPanelIndex(0);
  });

  win.on('destroy', () => {
    proc.settingsWindow = null;
  });
};

const register = (core, args, options, metadata) => {
  const proc = core.make("osjs/application", { args, options, metadata });

  const provider = new PanelServiceProvider(core, {
    args,
    registry: options.registry
  });

  proc.on('destroy', () => {
    provider.destroy();
  });
  
  // Open settings window when user launches the app again (clicks icon)
  proc.on('attention', (args, options) => {
    if (options && options.restore) {
      return;
    }
    createSettingsWindow(core, proc, provider);
  });

  // Initialize the provider immediately
  // Panels are self-managing like Waybar - they don't need desktop approval
  provider.init().then(() => {
    provider.start();
  });

  return proc;
};

OSjs.make("osjs/packages").register(applicationName, register);

