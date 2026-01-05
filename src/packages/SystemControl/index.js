import {name as applicationName} from './metadata.json';
import {h, app} from 'hyperapp';
import {Box, Button} from '@osjs/gui';
import './index.scss';

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {args, options, metadata});
  
  const getServices = () => {
    const running = core.listProviders();
    const available = Object.keys(core.serviceClasses || {});
    const storageKey = 'webos/services';
    let enabled = JSON.parse(localStorage.getItem(storageKey));

    if (!enabled) {
      enabled = core.config('enabledServices', []);
    }
    
    return available.map(name => ({
      name,
      running: running.includes(name),
      enabled: enabled.includes(name)
    }));
  };

  const toggleService = (name, action) => {
    const ServiceClass = (core.serviceClasses || {})[name];
    if (!ServiceClass) return Promise.reject('Service not found');

    if (action === 'start') {
      return core.register(ServiceClass, {name});
    } else if (action === 'stop') {
      return core.unregister(name);
    }
  };

  const toggleEnable = (name, enable) => {
    const storageKey = 'webos/services';
    let enabled = JSON.parse(localStorage.getItem(storageKey));

    if (!enabled) {
      enabled = core.config('enabledServices', []);
    }
    
    if (enable) {
      if (!enabled.includes(name)) enabled.push(name);
    } else {
      const idx = enabled.indexOf(name);
      if (idx !== -1) enabled.splice(idx, 1);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(enabled));
  };

  proc.createWindow({
    id: 'SystemControlWindow',
    title: metadata.title.en_EN,
    icon: proc.resource(metadata.icon),
    dimension: {width: 500, height: 400}
  })
  .on('destroy', () => proc.destroy())
  .render(($content) => {
    const actions = {
      setTab: tab => ({tab}),
      refresh: () => state => ({services: getServices()}),
      toggleRun: ({name, running}) => (state, actions) => {
        toggleService(name, running ? 'stop' : 'start')
          .then(() => actions.refresh())
          .catch(err => console.error(err));
      },
      toggleBoot: ({name, enabled}) => (state, actions) => {
        toggleEnable(name, !enabled);
        actions.refresh();
      }
    };

    const ListView = (state, actions) => h('div', {class: 'service-list'}, state.services.map(service => 
      h('div', {class: 'service-item'}, [
        h('div', {class: 'info'}, [
          h('span', {class: 'name'}, service.name),
          h('span', {class: `status ${service.running ? 'running' : 'stopped'}`}, 
            service.running ? 'Running' : 'Stopped')
        ]),
        h('div', {class: 'controls'}, [
          h(Button, {
            onclick: () => actions.toggleRun(service),
            label: service.running ? 'Stop' : 'Start'
          }),
          h(Button, {
            onclick: () => actions.toggleBoot(service),
            label: service.enabled ? 'Disable Boot' : 'Enable Boot',
            disabled: service.name === 'CoreServiceProvider' // Prevent disabling core
          })
        ])
      ])
    ));

    const GraphView = (state) => {
      // Dynamic dependency visualization
      const definitions = core.serviceDefinitions || {};
      const services = state.services;
      
      // Helper to get dependencies for a service name
      const getDeps = (name) => {
        const def = definitions[name];
        return (def && def.options && def.options.depends) ? def.options.depends : [];
      };

      // Build levels
      const levels = [];
      const visited = new Set();
      let remaining = services.map(s => s.name);

      // Level 0: No dependencies (or only core if we treat core as implicit base)
      // Actually, let's just do a simple topological sort into levels
      
      let iteration = 0;
      while (remaining.length > 0 && iteration < 10) { // Safety break
        const currentLevel = [];
        const nextRemaining = [];

        remaining.forEach(name => {
          const deps = getDeps(name);
          // Check if all dependencies are either satisfied (in previous levels) or non-existent (external/implicit)
          // Note: 'osjs/core' is provided by CoreServiceProvider.
          // We need to map contract names (osjs/core) to provider names (CoreServiceProvider)
          // But for now, let's assume if it has NO dependencies, it's level 0.
          // If it has dependencies, check if they are "resolved".
          
          // Simplified logic:
          // If deps is empty -> Level 0
          // If deps are all in visited -> Current Level
          
          // Problem: 'osjs/core' is a contract, not a provider name.
          // We need to know which provider provides which contract.
          // But we don't have that map easily available here without instantiating.
          // However, we can cheat: CoreServiceProvider is always root.
          
          if (name === 'CoreServiceProvider' && !visited.has(name)) {
             currentLevel.push(name);
             return;
          }

          // If we have visited all "providers" that this service depends on...
          // But we only know contract dependencies (e.g. 'osjs/auth').
          // Let's just use a simple heuristic:
          // 0 deps -> Level 0
          // >0 deps -> Level = Max(Dep Levels) + 1
          
          // Since we can't easily resolve 'osjs/auth' -> 'AuthServiceProvider' dynamically without more data,
          // We will use the hardcoded knowledge that Core is root, and everything else flows from there.
          
          // Fallback: Just put everything else in Level 1 if we can't resolve.
          // Better approach:
          // CoreServiceProvider -> Level 0
          // Services depending ONLY on osjs/core -> Level 1
          // Services depending on osjs/core AND others -> Level 2+
          
          const isRoot = name === 'CoreServiceProvider';
          if (isRoot) {
             currentLevel.push(name);
          } else {
             const deps = getDeps(name);
             if (deps.length === 0) {
                currentLevel.push(name);
             } else if (deps.every(d => d === 'osjs/core')) {
                // Only depends on core
                if (visited.has('CoreServiceProvider')) {
                    currentLevel.push(name);
                } else {
                    nextRemaining.push(name);
                }
             } else {
                // Depends on other things.
                // We need to check if "enough" things are visited.
                // Since we can't map contracts to providers easily here, 
                // let's just push them to later levels.
                if (visited.size > 1) { // If we have visited Core + Level 1 services
                    currentLevel.push(name);
                } else {
                    nextRemaining.push(name);
                }
             }
          }
        });

        if (currentLevel.length === 0 && nextRemaining.length > 0) {
            // Force remaining into a final level to prevent infinite loop
            levels.push(nextRemaining);
            break;
        }

        if (currentLevel.length > 0) {
            levels.push(currentLevel);
            currentLevel.forEach(n => visited.add(n));
            remaining = nextRemaining;
        }
        iteration++;
      }

      return h('div', {class: 'graph-view'}, levels.map((levelServices, i) => 
        h('div', {class: 'level'}, levelServices.map(name => {
          const service = state.services.find(s => s.name === name) || {name, running: false};
          const deps = getDeps(name);
          
          return h('div', {
            class: `node ${service.running ? 'running' : 'stopped'}`,
            title: `Depends on: ${deps.join(', ') || 'None'}`
          }, [
            h('span', {class: 'name'}, service.name),
            h('span', {class: 'status'}, service.running ? 'Running' : 'Stopped')
          ]);
        }))
      ));
    };

    const view = (state, actions) => h(Box, {class: 'osjs-system-control-window'}, [
      h('div', {class: 'toolbar'}, [
        h(Button, {
          onclick: () => actions.setTab('list'),
          label: 'Service List',
          disabled: state.tab === 'list'
        }),
        h(Button, {
          onclick: () => actions.setTab('graph'),
          label: 'Dependency Graph',
          disabled: state.tab === 'graph'
        })
      ]),
      state.tab === 'list' ? ListView(state, actions) : GraphView(state)
    ]);

    app({
      tab: 'list',
      services: getServices()
    }, actions, view, $content);
  });

  return proc;
};

OSjs.make('osjs/packages').register(applicationName, register);

export default register;
