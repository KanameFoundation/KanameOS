import { name as applicationName } from "./metadata.json";
import { h, app } from "hyperapp";
import { Box, Button, TextField, Toolbar, Menubar } from "@osjs/gui";

const createView = (core) => (state, actions) => {
  const filteredPackages = state.packages.filter((pkg) => {
    const query = state.search.toLowerCase();
    const name = pkg.name.toLowerCase();
    const desc = (
      pkg.description && pkg.description.en_EN
        ? pkg.description.en_EN
        : pkg.description || ""
    ).toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  return h(Box, {}, [
    h(Toolbar, {}, [
      h(
        Button,
        {
          onclick: () => actions.openInstallDialog(),
        },
        "Install Package"
      ),
      h(TextField, {
        placeholder: "Search packages...",
        oninput: (ev, value) => actions.setSearch(value),
        value: state.search,
      }),
    ]),
    h(Box, { grow: 1, shrink: 1, style: { overflow: "auto" } }, [
      h(
        "div",
        { class: "app-list" },
        filteredPackages.map((pkg) => {
          let icon = null;
          if (pkg.icon) {
            if (pkg.icon.match(/^(https?:|\/)/)) {
              icon = pkg.icon;
            } else if (pkg.icon.match(/\.(png|svg|gif|jpg|jpeg)$/)) {
              icon = `/apps/${pkg.name}/${pkg.icon}`;
            } else {
              icon = core.make("osjs/theme").icon(pkg.icon);
            }
          }

          return h(
            "div",
            {
              class: "app-item",
              style: {
                display: "flex",
                alignItems: "center",
                padding: "5px",
                borderBottom: "1px solid #ddd",
              },
            },
            [
              icon
                ? h("img", {
                    src: icon,
                    style: {
                      width: "32px",
                      height: "32px",
                      marginRight: "10px",
                    },
                  })
                : null,
              h("div", { style: { flex: 1 } }, [
                h("span", { style: { fontWeight: "bold" } }, pkg.name),
                h(
                  "span",
                  { style: { marginLeft: "10px" } },
                  pkg.description ? pkg.description.en_EN : ""
                ),
              ]),
              h(
                Button,
                {
                  onclick: () => actions.uninstall(pkg.name),
                },
                "Uninstall"
              ),
              h(
                "label",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    marginLeft: "10px",
                    cursor: "pointer",
                  },
                },
                [
                  h("input", {
                    type: "checkbox",
                    checked: state.autostartList.includes(pkg.name),
                    onchange: (ev) =>
                      actions.toggleAutostart({
                        name: pkg.name,
                        enabled: ev.target.checked,
                      }),
                  }),
                  h("span", { style: { marginLeft: "5px" } }, "Autostart"),
                ]
              ),
            ]
          );
        })
      ),
    ]),
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make("osjs/application", { args, options, metadata });
  const { icon } = core.make("osjs/theme");
  const winIcon = icon(metadata.icon);



  const installFromVfs = (vfsPath, reloadCallback) => {
    // 1. Inspect (Unprotected)
    fetch("/packages/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vfsPath }),
    })
      .then((res) => res.json())
      .then((metadata) => {
        if (metadata.error) {
          throw new Error(metadata.error);
        }

        const author = metadata.author || "Unknown";
        const description =
          (metadata.description && metadata.description.en_EN) ||
          metadata.description ||
          "No description";
        const version = metadata.version || "0.0.0";

        proc
          .createWindow({
            id: "AppInstallDialog",
            title: "Install Package",
            icon: winIcon,
            dimension: { width: 400, height: 300 },
            position: "center",
            attributes: {
              modal: true,
              resizable: false,
            },
          })
          .on("destroy", () => {
            if (args && args.file) proc.destroy();
          })
          .render(($content, win) => {
            app(
              {
                installing: false,
                installed: false,
              },
              {
                setInstalling: (installing) => (state) => ({ installing }),
                setInstalled: (installed) => (state) => ({ installed }),
                install: () => (state, actions) => {
                  actions.setInstalling(true);

                  // 2. Install (Protected - Triggers Elevation if needed)
                  core.request("/packages/install", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vfsPath }),
                  })
                    .then((res) => res.json())
                    .then((result) => {
                      actions.setInstalling(false);
                      if (result.success) {
                        actions.setInstalled(true);
                        core.make(
                          "osjs/notification",
                          {
                            title: "Success",
                            message: `Installed ${result.name}`,
                          }
                        );

                        if (
                          result.metadata &&
                          result.metadata.autostart
                        ) {
                          core.make(
                            "osjs/dialog",
                            "confirm",
                            {
                              title: "Autostart",
                              message: `Do you want to allow ${result.name} to start automatically?`,
                            },
                            (btn) => {
                              if (btn === "yes") {
                                const settings = core.make("osjs/settings");
                                const whitelist = settings.get(
                                  "osjs/packages",
                                  "autostart",
                                  [
                                    "osjs-desktop",
                                    "osjs-panels",
                                    "osjs-notifications",
                                  ]
                                );
                                whitelist.push(result.name);
                                settings.set(
                                  "osjs/packages",
                                  "autostart",
                                  whitelist
                                );
                                settings.save();
                              }
                            }
                          );
                        }
                        if (reloadCallback) reloadCallback();
                      } else {
                        core.make(
                          "osjs/dialog",
                          "alert",
                          { title: "Error", message: result.error },
                          () => {}
                        );
                      }
                    })
                    .catch((err) => {
                      actions.setInstalling(false);
                      core.make(
                        "osjs/dialog",
                        "alert",
                        { title: "Error", message: err.message },
                        () => {}
                      );
                    });
                },
                close: () => win.destroy(),
              },
              (state, actions) => {
                if (state.installing) {
                  return h(Box, { grow: 1, padding: true, align: "center", justify: "center" }, [
                    h("div", { style: { fontWeight: "bold" } }, "Installing..."),
                    h("div", {}, "Please wait while the package is being installed.")
                  ]);
                }

                if (state.installed) {
                  return h(Box, { grow: 1, padding: true, align: "center", justify: "center" }, [
                    h("div", { style: { fontWeight: "bold", fontSize: "1.2em", marginBottom: "10px" } }, "Success!"),
                    h("div", { style: { marginBottom: "20px" } }, `Package has been installed successfully.`),
                    h(Button, { onclick: () => actions.close(), type: "primary" }, "Close")
                  ]);
                }

                return h(Box, { grow: 1, style: { padding: '20px' } }, [
                  h(
                    "div",
                    { style: { textAlign: "center", marginBottom: "1em" } },
                    [
                      h(
                        "div",
                        { style: { fontWeight: "bold", fontSize: "1.2em" } },
                        metadata.name
                      ),
                      h("div", {}, `v${version}`),
                    ]
                  ),
                  h("div", { style: { marginBottom: "1em" } }, [
                    h("div", { style: { fontWeight: "bold" } }, "Description:"),
                    h("div", {}, description),
                  ]),
                  h("div", { style: { marginBottom: "1em" } }, [
                    h("div", { style: { fontWeight: "bold" } }, "Author:"),
                    h("div", {}, author),
                  ]),
                  h(Box, { grow: 1 }), // Spacer
                  h(
                    "div",
                    { style: { display: "flex", justifyContent: "flex-end" } },
                    [
                      h(Button, { onclick: () => actions.close() }, "Cancel"),
                      h(
                        Button,
                        { onclick: () => actions.install(), type: "primary" },
                        "Install"
                      ),
                    ]
                  ),
                ]);
              },
              $content
            );
          });
      })
      .catch((err) => {
        core.make(
          "osjs/dialog",
          "alert",
          { title: "Error", message: err.message },
          () => {
            if (args && args.file) proc.destroy();
          }
        );
      });
  };

  if (args && args.file) {
    installFromVfs(args.file.path);
    return proc;
  }

  proc
    .createWindow({
      id: "AppManagerWindow",
      title: metadata.title.en_EN,
      icon: metadata.icon,
      dimension: { width: 400, height: 400 },
      position: { left: 200, top: 200 },
    })
    .on("destroy", () => proc.destroy())
    .render(($content, win) => {
      app(
        {
          packages: [],
          search: "",
          autostartList: [],
        },
        {
          setPackages: (packages) => (state) => ({ packages }),
          setSearch: (search) => (state) => ({ search }),
          setAutostartList: (list) => (state) => ({ autostartList: list }),
          loadPackages: () => (state, actions) => {
            const settings = core.make("osjs/settings");
            const whitelist = settings.get("osjs/packages", "autostart", [
              "osjs-desktop",
              "osjs-panels",
              "osjs-notifications",
            ]);
            actions.setAutostartList(whitelist);

            fetch("/packages")
              .then((res) => res.json())
              .then((packages) => actions.setPackages(packages));
          },
          toggleAutostart:
            ({ name, enabled }) =>
            (state, actions) => {
              const settings = core.make("osjs/settings");
              const whitelist = settings.get("osjs/packages", "autostart", [
                "osjs-desktop",
                "osjs-panels",
                "osjs-notifications",
              ]);
              const newList = enabled
                ? [...whitelist, name]
                : whitelist.filter((n) => n !== name);

              settings.set("osjs/packages", "autostart", newList);
              settings.save();
              actions.setAutostartList(newList);
            },
          openInstallDialog: () => (state, actions) => {
            core.make(
              "osjs/dialog",
              "file",
              {
                type: "open",
                mime: ["application/zip", "application/webpackage"],
              },
              (btn, item) => {
                if (btn === "ok" && item) {
                  actions.installFromVfs(item.path);
                }
              }
            );
          },
          installFromVfs: (vfsPath) => (state, actions) => {
            installFromVfs(vfsPath, () => actions.loadPackages());
          },
          install: (file) => (state, actions) => {
            const formData = new FormData();
            formData.append("package", file);

            const dialog = core.make(
              "osjs/dialog",
              "alert",
              {
                title: "Installing...",
                message: "Please wait while the package is being installed.",
                buttons: [],
              },
              () => {}
            );

            fetch("/packages/install", {
              method: "POST",
              body: formData,
            })
              .then((res) => res.json())
              .then((result) => {
                dialog.destroy();
                if (result.success) {
                  core.make(
                    "osjs/notification",
                    { title: "Success", message: `Installed ${result.name}` }
                  );

                  if (result.metadata && result.metadata.autostart) {
                    core.make(
                      "osjs/dialog",
                      "confirm",
                      {
                        title: "Autostart",
                        message: `Do you want to allow ${result.name} to start automatically?`,
                      },
                      (btn) => {
                        if (btn === "yes") {
                          const settings = core.make("osjs/settings");
                          const whitelist = settings.get(
                            "osjs/packages",
                            "autostart",
                            [
                              "osjs-desktop",
                              "osjs-panels",
                              "osjs-notifications",
                            ]
                          );
                          whitelist.push(result.name);
                          settings.set(
                            "osjs/packages",
                            "autostart",
                            whitelist
                          );
                          settings.save();
                        }
                      }
                    );
                  }
                  actions.loadPackages();
                } else {
                  core.make(
                    "osjs/dialog",
                    "alert",
                    { title: "Error", message: result.error },
                    () => {}
                  );
                }
              })
              .catch((err) => {
                dialog.destroy();
                core.make(
                  "osjs/dialog",
                  "alert",
                  { title: "Error", message: err.message },
                  () => {}
                );
              });
          },
          uninstall: (name) => (state, actions) => {
            core.make(
              "osjs/dialog",
              "confirm",
              {
                title: "Uninstall",
                message: `Are you sure you want to uninstall ${name}?`,
              },
              (btn) => {
                if (btn === "yes") {
                  core.request("/packages/uninstall", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name }),
                  })
                    .then((result) => {
                      if (result.success) {
                        core.make(
                          "osjs/dialog",
                          "alert",
                          { title: "Success", message: `Uninstalled ${name}` },
                          () => {}
                        );
                        actions.loadPackages();
                      } else {
                        core.make(
                          "osjs/dialog",
                          "alert",
                          { title: "Error", message: result.error },
                          () => {}
                        );
                      }
                    })
                    .catch((err) => {
                      core.make(
                        "osjs/dialog",
                        "alert",
                        { title: "Error", message: err.message },
                        () => {}
                      );
                    });
                }
              }
            );
          },
        },
        createView(core),
        $content
      ).loadPackages();
    });

  return proc;
};

OSjs.make("osjs/packages").register(applicationName, register);
