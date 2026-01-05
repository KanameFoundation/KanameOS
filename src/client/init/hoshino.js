import BaseInitSystem from './base.js';

export default class HoshinoInit extends BaseInitSystem {
  async start(availableServices) {
    console.log('%c Hoshino INIT System %c v1.0 ', 'background: #ff0080; color: #fff; font-weight: bold; border-radius: 3px;', 'color: #ff0080; font-weight: bold;');
    console.log('Initializing services...');

    const {core, config} = this;
    const storageKey = 'webos/services';
    let enabledServices = config.enabledServices;
    const availableNames = Object.keys(availableServices);

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasValidServices = parsed.some(s => availableNames.includes(s));

          if (hasValidServices) {
            enabledServices = parsed;
          } else {
            console.warn('HoshinoInit: Saved services configuration appears invalid. Falling back to default.');
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        console.info('HoshinoInit: First run detected. Initializing service configuration.');
        localStorage.setItem(storageKey, JSON.stringify(enabledServices));
      }
    } catch (e) {
      console.warn('HoshinoInit: Failed to load services from storage', e);
    }

    console.debug('HoshinoInit: Enabled services:', enabledServices);

    // Ensure CoreServiceProvider is always enabled
    if (!enabledServices.includes('CoreServiceProvider')) {
      console.warn('HoshinoInit: CoreServiceProvider was missing from enabled services. Forcing it to enable.');
      enabledServices.unshift('CoreServiceProvider');
    }

    enabledServices.forEach(name => {
      const serviceDef = availableServices[name];
      if (serviceDef) {
        console.debug('HoshinoInit: Registering service:', name);
        core.register(serviceDef.provider, {
          ...serviceDef.options,
          name
        });
      } else {
        console.warn(`HoshinoInit: Service '${name}' not found in available services.`);
      }
    });
    
    console.log(`%c Hoshino INIT %c Boot sequence complete. ${enabledServices.length} services started.`, 'color: #ff0080; font-weight: bold;', 'color: inherit;');
  }
}
