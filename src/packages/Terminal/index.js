import { name as applicationName } from "./metadata.json";
import { h, app } from "hyperapp";
import { Box } from "@osjs/gui";
import "./index.scss";

const createView = (core, proc) => (state, actions) => {
  return h(
    Box,
    {
      class: "osjs-terminal-window",
      oncreate: (el) => {
        // Focus input on click
        el.addEventListener("click", () => {
          const input = el.querySelector("input");
          if (input) input.focus();
        });
      },
    },
    [
      h(
        "div",
        {
          class: "terminal-output",
          onupdate: (el) => {
            el.scrollTop = el.scrollHeight;
          },
        },
        state.history.map((item) =>
          h("div", {}, [
            h("div", { class: "command" }, `> ${item.command}`),
            h("div", { class: item.error ? "error" : "result" }, item.result),
          ])
        )
      ),
      h("div", { class: "terminal-input-area" }, [
        h("span", {}, ">"),
        h("input", {
          type: "text",
          value: state.input,
          oninput: (ev) => actions.setInput(ev.target.value),
          onkeydown: (ev) => {
            if (ev.key === "Enter") {
              actions.run();
            }
          },
          oncreate: (el) => el.focus(),
        }),
      ]),
    ]
  );
};

const register = (core, args, options, metadata) => {
  const proc = core.make("osjs/application", { args, options, metadata });
  const { icon } = core.make("osjs/theme");
  const winIcon = icon(metadata.icon);

  proc
    .createWindow({
      id: "TerminalWindow",
      title: metadata.title.en_EN,
      icon: winIcon,
      dimension: { width: 600, height: 400 },
    })
    .on("destroy", () => proc.destroy())
    .render(($content) => {
      app(
        {
          input: "",
          history: [
            {
              command: "System",
              result:
                "Welcome to KanameOS Terminal. Type JavaScript commands to execute them.",
              error: false,
            },
          ],
        },
        {
          setInput: (input) => (state) => ({ input }),
          run: () => (state) => {
            const command = state.input;
            if (!command) return;

            // REPL Context
            const os = core;
            const app = proc;
            const listPackages = () =>
              core
                .make("osjs/packages")
                .getPackages()
                .map((p) => p.name);
            const systemctl = (action, name) => {
              const storageKey = "webos/services";
              const saveState = () => {
                const running = os.listProviders();
                localStorage.setItem(storageKey, JSON.stringify(running));
              };

              if (action === "list") {
                const running = os.listProviders();
                const available = Object.keys(os.serviceClasses || {});
                return available
                  .map(
                    (s) =>
                      `${s} [${running.includes(s) ? "RUNNING" : "STOPPED"}]`
                  )
                  .join("\n");
              }

              if (action === "start") {
                if (!name) return 'Usage: systemctl("start", "ServiceName")';
                if (os.listProviders().includes(name))
                  return `Service ${name} is already running`;

                const ServiceClass = (os.serviceClasses || {})[name];
                if (ServiceClass) {
                  return os
                    .register(ServiceClass, { name })
                    .then(() => {
                      saveState();
                      return `Service ${name} started`;
                    })
                    .catch((err) => `Failed to start ${name}: ${err.message}`);
                }
                return `Service class ${name} not found`;
              }

              if (action === "stop") {
                if (!name) return 'Usage: systemctl("stop", "ServiceName")';
                return os.unregister(name).then((res) => {
                  if (res) {
                    saveState();
                    return `Service ${name} stopped`;
                  }
                  return `Service ${name} not found`;
                });
              }

              if (action === "enable") {
                if (!name) return 'Usage: systemctl("enable", "ServiceName")';
                const current = JSON.parse(
                  localStorage.getItem(storageKey) || "[]"
                );
                if (!current.includes(name)) {
                  current.push(name);
                  localStorage.setItem(storageKey, JSON.stringify(current));
                  return `Service ${name} enabled for next boot`;
                }
                return `Service ${name} already enabled`;
              }

              if (action === "disable") {
                if (!name) return 'Usage: systemctl("disable", "ServiceName")';
                const current = JSON.parse(
                  localStorage.getItem(storageKey) || "[]"
                );
                const index = current.indexOf(name);
                if (index !== -1) {
                  current.splice(index, 1);
                  localStorage.setItem(storageKey, JSON.stringify(current));
                  return `Service ${name} disabled for next boot`;
                }
                return `Service ${name} not enabled`;
              }

              return 'Usage: systemctl("list" | "start" | "stop" | "enable" | "disable", [name])';
            };

            let result;
            let error = false;
            try {
              // eslint-disable-next-line no-eval
              const evalResult = eval(command);
              if (typeof evalResult === "object" && evalResult !== null) {
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
              input: "",
              history: state.history.concat({ command, result, error }),
            };
          },
        },
        createView(core, proc),
        $content
      );
    });

  return proc;
};

OSjs.make("osjs/packages").register(applicationName, register);

export default register;
