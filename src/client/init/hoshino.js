import BaseInitSystem from "./base.js";

// Utility: Topological sort for dependency resolution
function topoSort(services, enabled) {
  const graph = {};
  const visited = new Set();
  const result = [];

  // Build dependency graph
  enabled.forEach((name) => {
    const def = services[name];
    graph[name] =
      def && def.options && def.options.depends
        ? def.options.depends.slice()
        : [];
  });

  function visit(name, stack = []) {
    if (visited.has(name)) return;
    if (stack.includes(name))
      throw new Error(
        "Circular dependency: " + stack.concat(name).join(" -> ")
      );
    (graph[name] || []).forEach((dep) => {
      // Only visit dependencies that are also enabled
      if (enabled.includes(dep)) visit(dep, stack.concat(name));
    });
    visited.add(name);
    result.push(name);
  }

  enabled.forEach((name) => visit(name));
  return result;
}

export default class HoshinoInit extends BaseInitSystem {
  constructor(core, config) {
    super(core, config);
    
    // Service tracking (like systemd)
    this.services = new Map();
    this.serviceStates = new Map();
  }

  async start(availableServices) {
    console.log(
      "%c Hoshino Init System %c v3.0 ",
      "background: #ff0080; color: #fff; font-weight: bold; border-radius: 3px;",
      "color: #ff0080; font-weight: bold;"
    );
    console.log("Hoshino is now controlling the boot process...");

    const { core, config } = this;
    const storageKey = "webos/services";
    let enabledServices = config.enabledServices;
    const availableNames = Object.keys(availableServices);

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasValidServices = parsed.some((s) =>
            availableNames.includes(s)
          );
          if (hasValidServices) {
            enabledServices = parsed;
          } else {
            console.warn(
              "Hoshino: Saved services configuration appears invalid. Falling back to default."
            );
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        console.info(
          "Hoshino: First run detected. Initializing service configuration."
        );
        localStorage.setItem(storageKey, JSON.stringify(enabledServices));
      }
    } catch (e) {
      console.warn(
        "Hoshino: Failed to load services from storage",
        e
      );
    }

    // Ensure CoreServiceProvider is always enabled
    if (!enabledServices.includes("CoreServiceProvider")) {
      enabledServices.unshift("CoreServiceProvider");
    }

    // Topological sort for dependency order
    let bootOrder;
    try {
      bootOrder = topoSort(availableServices, enabledServices);
    } catch (e) {
      console.error("Hoshino: Dependency error:", e);
      bootOrder = enabledServices; // fallback to flat order
    }

    // Store for phase 2
    this.bootOrder = bootOrder;
    this.availableServices = availableServices;

    console.group("Hoshino::init()");

    // Phase 1: Init "before" providers (Auth, Settings, etc.)
    console.log("%c Phase 1: Initializing early services", "color: #00ff00; font-weight: bold;");
    for (const name of bootOrder) {
      const serviceDef = availableServices[name];
      if (serviceDef && serviceDef.options.before) {
        await this.initService(name, serviceDef);
      }
    }

    // Phase 2: Boot Core (DOM setup, shows login)
    console.log("%c Phase 2: Booting Core (waiting for login...)", "color: #00ff00; font-weight: bold;");
    await core.boot();  // This will show login and WAIT for user to login

    console.groupEnd();
    
    // Phase 3-5 will be called by Core.start() after login
  }

  // Called by Core.start() after authentication
  async continueBootAfterLogin() {
    console.group("Hoshino::continueBootAfterLogin()");

    // Phase 3: Init remaining providers (AFTER login)
    console.log("%c Phase 3: Initializing remaining services", "color: #00ff00; font-weight: bold;");
    for (const name of this.bootOrder) {
      const serviceDef = this.availableServices[name];
      if (serviceDef && !serviceDef.options.before) {
        await this.initService(name, serviceDef);
      }
    }

    // Phase 4: Start Core (connections)
    console.log("%c Phase 4: Starting Core", "color: #00ff00; font-weight: bold;");
    // Core.start() is already running, just log

    // Phase 5: Start all providers
    console.log("%c Phase 5: Starting all services", "color: #00ff00; font-weight: bold;");
    for (const [name, service] of this.services) {
      await this.startServiceProvider(name, service);
    }

    console.groupEnd();

    console.log(
      `%c Hoshino Init System %c Boot sequence complete. ${this.bootOrder.length} services started.`,
      "color: #ff0080; font-weight: bold;",
      "color: inherit;"
    );
  }

  async initService(name, def) {
    console.log(`[Hoshino] Initializing service: ${name}`);
    
    const instance = new def.provider(this.core, def.options.args || {});
    
    // Call provider's init()
    if (instance.init) {
      await instance.init();
    }
    
    // Track the service
    this.services.set(name, { instance, def });
    this.serviceStates.set(name, 'initialized');
  }

  async startServiceProvider(name, service) {
    console.log(`[Hoshino] Starting service: ${name}`);
    
    if (service.instance.start) {
      await service.instance.start();
    }
    
    this.serviceStates.set(name, 'running');
  }

  // Runtime service control (systemctl-like)
  async startService(name, availableServices) {
    const def = availableServices[name];
    if (!def) throw new Error(`Service '${name}' not found`);
    
    await this.initService(name, def);
    await this.startServiceProvider(name, this.services.get(name));
    
    this.enableService(name);
  }

  async stopService(name) {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service '${name}' not running`);
    
    if (service.instance.destroy) {
      await service.instance.destroy();
    }
    
    this.services.delete(name);
    this.serviceStates.set(name, 'stopped');
    this.disableService(name);
  }

  async restartService(name, availableServices) {
    await this.stopService(name);
    await this.startService(name, availableServices);
  }

  getServiceStatus(name) {
    return {
      state: this.serviceStates.get(name) || 'unknown',
      enabled: this.getEnabledServices().includes(name),
      instance: this.services.get(name)?.instance
    };
  }

  listServices() {
    return Array.from(this.services.keys()).map(name => ({
      name,
      state: this.serviceStates.get(name),
      enabled: this.getEnabledServices().includes(name)
    }));
  }

  // API for runtime management
  getBootOrder(availableServices, enabledServices) {
    try {
      return topoSort(availableServices, enabledServices);
    } catch {
      return enabledServices;
    }
  }

  enableService(name) {
    const storageKey = "webos/services";
    let enabled = JSON.parse(localStorage.getItem(storageKey)) || [];
    if (!enabled.includes(name)) enabled.push(name);
    localStorage.setItem(storageKey, JSON.stringify(enabled));
  }

  disableService(name) {
    const storageKey = "webos/services";
    let enabled = JSON.parse(localStorage.getItem(storageKey)) || [];
    const idx = enabled.indexOf(name);
    if (idx !== -1) enabled.splice(idx, 1);
    localStorage.setItem(storageKey, JSON.stringify(enabled));
  }

  getEnabledServices() {
    const storageKey = "webos/services";
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  }
}
