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
  async start(availableServices) {
    console.log(
      "%c Hoshino Service Manager %c v2.0 ",
      "background: #ff0080; color: #fff; font-weight: bold; border-radius: 3px;",
      "color: #ff0080; font-weight: bold;"
    );
    console.log("Initializing services with dependency order...");

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
              "HoshinoServiceProvider: Saved services configuration appears invalid. Falling back to default."
            );
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        console.info(
          "HoshinoServiceProvider: First run detected. Initializing service configuration."
        );
        localStorage.setItem(storageKey, JSON.stringify(enabledServices));
      }
    } catch (e) {
      console.warn(
        "HoshinoServiceProvider: Failed to load services from storage",
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
      console.error("HoshinoServiceProvider: Dependency error:", e);
      bootOrder = enabledServices; // fallback to flat order
    }
    console.group("hoshino::init()");

    for (const name of bootOrder) {
      const serviceDef = availableServices[name];
      if (serviceDef) {
        console.log("Registering service:", name);
        await core.register(serviceDef.provider, {
          ...serviceDef.options,
          name,
        });
      } else {
        console.warn(
          `HoshinoServiceProvider: Service '${name}' not found in available services.`
        );
      }
    }
    console.groupEnd();

    console.log(
      `%c Hoshino Service Manager %c Boot sequence complete. ${bootOrder.length} services started.`,
      "color: #ff0080; font-weight: bold;",
      "color: inherit;"
    );
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

  /**
   * Start a service at runtime
   * @param {string} name Service name
   * @param {Object} availableServices Service definitions
   * @returns {Promise<void>}
   */
  async startService(name, availableServices) {
    const { core } = this;
    const serviceDef = availableServices[name];
    if (!serviceDef) throw new Error(`Service '${name}' not found`);
    await core.register(serviceDef.provider, {
      ...serviceDef.options,
      name,
    });
  }

  /**
   * Stop a service at runtime
   * @param {string} name Service name
   * @returns {Promise<void>}
   */
  async stopService(name) {
    const { core } = this;
    await core.unregister(name);
  }
}
