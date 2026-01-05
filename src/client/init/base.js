export default class BaseInitSystem {
  constructor(core, config) {
    this.core = core;
    this.config = config;
  }

  /**
   * Start the init system
   * @param {Object} availableServices Map of service definitions
   */
  async start(availableServices) {
    throw new Error('start() must be implemented by subclass');
  }
}
