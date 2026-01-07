import { name as applicationName } from "./metadata.json";
import { h, app } from "hyperapp";
import { Box, Button, TextField, Toolbar, Statusbar } from "@osjs/gui";
import "./index.scss";

// Configuration - In a real app, this might be in a settings file
const DEFAULT_REPO =
  "https://raw.githubusercontent.com/Kaname-Fundation/KanameStore/refs/heads/live/repository.json";

const createView = (core, proc) => (state, actions) => {
  const filteredApps = state.apps.filter((pkg) => {
    const query = state.search.toLowerCase();
    const name = pkg.name.toLowerCase();
    const desc = (pkg.description || "").toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  return h(Box, { class: "kaname-store" }, [
    h(Toolbar, { class: "store-toolbar" }, [
      h(TextField, {
        placeholder: "Search apps...",
        oninput: (ev, value) => actions.setSearch(value),
        value: state.search,
        box: { grow: 1 },
      }),
      h(
        Button,
        {
          onclick: () => actions.showRepoManager(),
        },
        "Repositories"
      ),
      h(
        Button,
        {
          onclick: () => actions.fetchApps(),
          disabled: state.loading,
        },
        "Refresh"
      ),
    ]),

    state.loading
      ? h(
          Box,
          { grow: 1, align: "center", justify: "center" },
          "Loading Store..."
        )
      : h(
          "div",
          { class: "store-grid" },
          filteredApps.map((pkg) => {
            const isInstalling = state.installing[pkg.name];
            const installedVersion = state.installedPackages[pkg.name];
            const isInstalled = !!installedVersion;
            // Check for updates by comparing version numbers
            const hasUpdate = isInstalled && installedVersion !== pkg.version;

            // Always use repository version and download for display and install
            const repoVersion = pkg.version;
            const repoDownload = pkg.download;

            let iconUrl = proc.resource("icon.png");

            if (pkg.icon) {
              iconUrl = pkg.icon.match(/^https?:\//)
                ? pkg.icon
                : `${pkg._repoBase}/${pkg.icon}`;
            } else if (pkg.iconName) {
              iconUrl = core.make("osjs/theme").icon(pkg.iconName);
            }

            const fallbackIcon = core.make("osjs/theme").icon("application-x-executable");

            let buttonText = "Install";
            let buttonDisabled = isInstalling;
            let buttonType = "primary";

            if (isInstalling) {
              buttonText = "Downloading...";
            } else if (hasUpdate) {
              buttonText = "Update";
              buttonType = "warning";
            } else if (isInstalled) {
              buttonText = "Installed";
              buttonDisabled = true;
            }

            return h("div", { class: "app-card" }, [
              h("img", {
                class: "app-icon",
                src: iconUrl,
                onerror: (ev) => {
                  if (ev.target.src !== fallbackIcon) {
                    ev.target.src = fallbackIcon;
                  }
                },
              }),
              h("div", { class: "app-name" }, pkg.title || pkg.name),
              h(
                "div",
                { class: "app-meta" },
                `v${repoVersion} • ${pkg.category}`
              ),
              h("div", { class: "app-desc" }, pkg.description),
              h(
                Button,
                {
                  onclick: () => actions.installApp({ pkg, core }),
                  disabled: buttonDisabled,
                  type: buttonType,
                },
                buttonText
              ),
            ]);
          })
        ),

    h(Statusbar, {}, `Total Apps: ${state.apps.length}`),
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make("osjs/application", {
    args,
    options: {
      ...options,
      settings: {
        repositories: [DEFAULT_REPO]
      }
    },
    metadata
  });
  const settings = core.make("osjs/settings");

  proc
    .createWindow({
      id: "StoreWindow",
      title: metadata.title.en_EN,
      icon: proc.resource(metadata.icon),
      dimension: { width: 800, height: 600 },
    })
    .on("destroy", () => proc.destroy())
    .render(($content, win) => {
      // Load repositories from settings, ensure it's always an array
      let savedRepos = proc.settings.repositories;
      if (!Array.isArray(savedRepos) || savedRepos.length === 0) {
        savedRepos = [DEFAULT_REPO];
      }

      const a = app(
        {
          apps: [],
          search: "",
          loading: false,
          installing: {},
          installedPackages: {}, // Track installed packages in state
          repositories: savedRepos, // Load from settings
        },
        {
          setSearch: (search) => (state) => ({ search }),
          setApps: (apps) => (state) => ({ apps }),
          setLoading: (loading) => (state) => ({ loading }),
          setRepositories: (repositories) => (state) => {
            // Ensure repositories is always a non-empty array
            let validRepos = Array.isArray(repositories)
              ? repositories.filter(
                  (url) => typeof url === "string" && url.length > 0
                )
              : [];
            if (validRepos.length === 0) {
              validRepos = [DEFAULT_REPO];
            }
            proc.settings.repositories = validRepos;
            proc.saveSettings();
            return { repositories: validRepos };
          },
          setInstalling:
            ({ name, value }) =>
            (state) => ({
              installing: { ...state.installing, [name]: value },
            }),
          refreshInstalled: () => (state) => {
            const installedPkgs = core.make("osjs/packages").getPackages();
            const installedPackages = {};
            installedPkgs.forEach((pkg) => {
              let version = pkg.version;
              // If version is missing or 1.0.0, try to fetch from metadata.json
              // Version check removed: trusting core package metadata provided by the server
              // This relies on the server-side fix in src/server/packages.js
              installedPackages[pkg.name] = version || "1.0.0";
            });
            return { installedPackages };
          },

          fetchApps: () => async (state, actions) => {
            actions.setLoading(true);
            try {
              const allApps = [];

              // Ensure repositories is always an array
              const repos =
                Array.isArray(state.repositories) &&
                state.repositories.length > 0
                  ? state.repositories
                  : [DEFAULT_REPO];

              for (const repoUrl of repos) {
                try {
                  const response = await fetch(repoUrl);
                  const data = await response.json();
                  const repoBase = repoUrl.substring(
                    0,
                    repoUrl.lastIndexOf("/")
                  );

                  // Add repository info to each app
                  const apps = (data.apps || []).map((app) => ({
                    ...app,
                    _repoUrl: repoUrl,
                    _repoBase: repoBase,
                  }));

                  allApps.push(...apps);
                } catch (e) {
                  console.error(`Failed to fetch from ${repoUrl}:`, e);
                }
              }

              actions.setApps(allApps);
              actions.refreshInstalled(); // Refresh installed packages when fetching apps
            } catch (e) {
              console.error(e);
              core.make(
                "osjs/dialog",
                "alert",
                {
                  title: "Store Error",
                  message: "Failed to fetch repository: " + e.message,
                },
                () => {}
              );
            } finally {
              actions.setLoading(false);
            }
          },

          showRepoManager: () => (state, actions) => {
            // Custom dialog for better UX
            let win = core.make("osjs/window", {
              id: "RepoManagerWindow",
              title: "Manage Repositories",
              dimension: { width: 520, height: 400 },
              position: "center",
              attributes: { minHeight: 300, minWidth: 400 },
            });

            // Only mount Hyperapp app ONCE after window is ready
            win.render(($content, win) => {
              // Create a container div for Hyperapp
              $content.innerHTML = "";
              const container = document.createElement("div");
              container.style.height = "100%";
              container.style.width = "100%";
              $content.appendChild(container);

              setTimeout(() => {
                const initialRepos =
                  Array.isArray(state.repositories) &&
                  state.repositories.length > 0
                    ? [...state.repositories]
                    : [""];
                app(
                  {
                    repos: initialRepos,
                  },
                  {
                    setRepo: ({idx, value}) => (state) => {
                      const repos = [...state.repos];
                      repos[idx] = value;
                      return { repos };
                    },
                    addRepo: () => (state) => ({ repos: [...state.repos, ""] }),
                    removeRepo: (idx) => (state) => {
                      const repos = [...state.repos];
                      repos.splice(idx, 1);
                      return { repos };
                    },
                    save: () => (state) => {
                      const repos = state.repos
                        .map((url) => url.trim())
                        .filter((url) => url.length > 0);
                      if (repos.length === 0) {
                        core.make("osjs/dialog", "alert", {
                          title: "Validation Error",
                          message: "Please enter at least one repository URL.",
                        });
                        return {};
                      }
                      actions.setRepositories(repos);
                      actions.fetchApps();
                      win.destroy();
                      return {};
                    },
                    cancel: () => () => {
                      win.destroy();
                      return {};
                    },
                  },
                  (state, actions) =>
                    h(
                      Box,
                      { style: { padding: 16, height: "100%" }, grow: 1 },
                      [
                        h(
                          "div",
                          { style: { marginBottom: 12, fontWeight: "bold" } },
                          "Repository URLs:"
                        ),
                        ...state.repos.map((repo, idx) =>
                          h(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                padding: "5px",
                                borderBottom: "1px solid #ddd",
                                marginBottom: "5px"
                              },
                              key: idx
                            },
                            [
                              h(TextField, {
                                value: state.repos[idx], 
                                placeholder: "https://... (e.g. raw.githubusercontent.com/...)",
                                oninput: (ev, value) => {
                                  const safeValue = value !== undefined ? value : (ev.target ? ev.target.value : ev);
                                  if (state.repos[idx] !== safeValue) {
                                    actions.setRepo({idx, value: safeValue});
                                  }
                                },
                                box: { grow: 1 },
                                style: { marginRight: "8px" } 
                              }),
                              h(
                                Button,
                                {
                                  onclick: () => actions.removeRepo(idx),
                                  disabled: state.repos.length === 1,
                                  title: "Remove this repository",
                                  style: { margin: 0, height: "auto", minWidth: "30px" } 
                                },
                                "✕"
                              ),
                            ]
                          )
                        ),
                        h(
                          Button,
                          {
                            onclick: actions.addRepo,
                            style: { marginBottom: 16 },
                          },
                          "+ Add Repository"
                        ),
                        h(
                          Box,
                          {
                            horizontal: true,
                            style: {
                              marginTop: 16,
                              justifyContent: "flex-end",
                            },
                          },
                          [
                            h(
                              Button,
                              {
                                onclick: actions.cancel,
                                style: { marginRight: 8 },
                              },
                              "Cancel"
                            ),
                            h(
                              Button,
                              { onclick: actions.save, type: "primary" },
                              "Save"
                            ),
                          ]
                        ),
                      ]
                    ),
                  container
                );
              }, 0);
            });
          },

          installApp:
            ({ pkg, core }) =>
            async (state, actions) => {
              actions.setInstalling({ name: pkg.name, value: true });

              try {
                // Always use repository version and download for install
                let downloadUrl = pkg.download;
                if (!downloadUrl.match(/^https?:\/\//)) {
                  downloadUrl = `${pkg._repoBase}/${pkg.download}`;
                }

                // 2. Download File
                const response = await fetch(downloadUrl);
                if (!response.ok)
                  throw new Error(`Failed to download: ${response.statusText}`);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                // 3. Save to VFS (Temp folder)
                const filename = `${pkg.name}-${pkg.version}.wpk`;
                const destPath = `tmp:/${filename}`;

                console.log("Store: Installing", { pkg, filename, destPath });

                // Manual upload to debug VFS issue
                const formData = new FormData();
                formData.append("upload", new Blob([arrayBuffer]));
                formData.append("path", destPath);

                try {
                  await core.request("/vfs/writefile", {
                    method: "POST",
                    body: formData,
                  });
                } catch (writeErr) {
                  console.error("Store: Write failed", writeErr);
                  throw new Error(`Failed to write file: ${writeErr.message}`);
                }

                // 4. Launch AppManager to install
                core.run("AppManager", {
                  file: { path: destPath },
                });

                // Wait a bit for AppManager to complete, then refresh
                setTimeout(() => {
                  actions.refreshInstalled();
                }, 2000);
              } catch (e) {
                console.error(e);
                core.make(
                  "osjs/dialog",
                  "alert",
                  {
                    title: "Installation Failed",
                    message: e.message,
                  },
                  () => {}
                );
              } finally {
                actions.setInstalling({ name: pkg.name, value: false });
              }
            },
        },
        createView(core, proc),
        $content
      );

      // Initial fetch and refresh installed packages
      a.fetchApps();
      a.refreshInstalled();
    });

  return proc;
};

// Register the package in the OS.js core
OSjs.make("osjs/packages").register(applicationName, register);

export { register, applicationName };
