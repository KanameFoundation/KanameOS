const BaseInitSystem = require('./base.js');
const consola = require('consola');

class HoshinoInit extends BaseInitSystem {
  async start(availableServices) {
    consola.info('Hoshino INIT System v1.0 (Server)');
    consola.info('Initializing server services...');

    const {core, config} = this;
    let enabledServices = config.enabledServices || [];
    const availableNames = Object.keys(availableServices);

    // Validate enabled services
    const validServices = enabledServices.filter(name => {
      if (availableNames.includes(name)) {
        return true;
      }
      consola.warn(`HoshinoInit: Service '${name}' configured but not found in registry.`);
      return false;
    });

    console.debug('HoshinoInit: Enabled services:', validServices);

    for (const name of validServices) {
      const serviceDef = availableServices[name];
      if (serviceDef) {
        consola.success(`HoshinoInit: Registering service: ${name}`);
        core.register(serviceDef.provider, {
          ...serviceDef.options,
          name
        });
      }
    }
    
    consola.success(`Hoshino INIT Boot sequence complete. ${validServices.length} services registered.`);
  }
}

module.exports = HoshinoInit;
