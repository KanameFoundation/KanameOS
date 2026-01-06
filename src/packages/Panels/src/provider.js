/*
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
import Panel from './panel';
import WindowsPanelItem from './items/windows';
import TrayPanelItem from './items/tray';
import ClockPanelItem from './items/clock';
import MenuPanelItem from './items/menu';

/**
 * Panel Service Provider
 *
 * @desc Provides methods to handle panels on a desktop in OS.js
 */
export default class PanelServiceProvider {

  constructor(core, args = {}) {
    this.core = core;
    this.panels = [];
    this.inited = false;
    this.registry = Object.assign({
      menu: MenuPanelItem,
      windows: WindowsPanelItem,
      tray: TrayPanelItem,
      clock: ClockPanelItem
    }, args.registry || {});
  }

  destroy() {
    this.inited = false;
    this.panels.forEach(panel => panel.destroy());
    this.panels = [];
  }

  async init() {
    this.core.singleton('osjs/panels', () => ({
      register: (name, classRef) => {
        if (this.registry[name]) {
          console.warn('Overwriting previously registered panel item', name);
        }

        this.registry[name] = classRef;
      },

      removeAll: () => {
        this.panels.forEach(p => p.destroy());
        this.panels = [];
      },

      remove: (panel) => {
        const index = typeof panel === 'number'
          ? panel
          : this.panels.findIndex(p => p === panel);

        if (index >= 0) {
          this.panels[index].destroy();
          this.panels.splice(index, 1);
        }
      },

      create: (options) => {
        const panel = new Panel(this.core, options);

        this.panels.push(panel);

        panel.on('destroy', () => this.core.emit('osjs/panel:destroy', panel, this.panels));
        panel.on('create', () => setTimeout(() => {
          this.core.emit('osjs/panel:create', panel, this.panels);
        }, 1));

        if (this.inited) {
          panel.init();
        }
      },

      save: () => this.save(),

      get: (name) => this.registry[name]
    }));
  }

  save() {
    const settings = this.core.make('osjs/settings');
    const panels = this.panels.map(panel => panel.options);

    return Promise.resolve(settings.set('osjs/desktop', 'panels', panels))
      .then(() => settings.save());
  }

  /**
   * Load panels from settings and create them
   */
  loadPanelsFromSettings() {
    const settings = this.core.make('osjs/settings');
    const defaultPanels = this.core.config('desktop.settings.panels', []);
    const savedPanels = settings.get('osjs/desktop', 'panels', defaultPanels);

    // Only take the last panel for now (TODO: Multiple panels)
    const panelsToCreate = savedPanels.slice(-1);

    panelsToCreate.forEach(panelOptions => {
      const panel = new Panel(this.core, panelOptions);
      this.panels.push(panel);

      panel.on('destroy', () => this.core.emit('osjs/panel:destroy', panel, this.panels));
      panel.on('create', () => setTimeout(() => {
        this.core.emit('osjs/panel:create', panel, this.panels);
      }, 1));

      if (this.inited) {
        panel.init();
      }
    });
  }

  /**
   * Reload panels when settings change
   * This is more efficient than destroying and recreating
   */
  reloadPanels() {
    const settings = this.core.make('osjs/settings');
    const defaultPanels = this.core.config('desktop.settings.panels', []);
    const savedPanels = settings.get('osjs/desktop', 'panels', defaultPanels);
    const newPanelOptions = savedPanels.slice(-1)[0];

    if (this.panels.length > 0 && newPanelOptions) {
      // Update existing panel instead of recreating
      this.panels[0].update(newPanelOptions);
    } else {
      // No panels exist, create them
      this.loadPanelsFromSettings();
    }
  }


  start() {
    this.inited = true;
    
    // Load panels from settings on start (like Waybar loading its config)
    this.loadPanelsFromSettings();
    
    // Initialize all panels
    this.panels.forEach(p => p.init());

    // Listen for settings changes and reload panels
    this.core.on('osjs/settings:save', () => {
      // Only reload if desktop settings changed
      this.reloadPanels();
    });
  }

}
