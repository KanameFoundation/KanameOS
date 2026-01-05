import { name as applicationName } from "./metadata.json";
import { h, app } from "hyperapp";
import { Box, Button, TextField, Toolbar, Statusbar } from "@osjs/gui";
import "./index.scss";

// Configuration - In a real app, this might be in a settings file
const REPO_URL =
  "https://kaname-fundation.github.io/KanameStore/repository.json";

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

            return h("div", { class: "app-card" }, [
              h("img", {
                class: "app-icon",
                src: pkg.icon || proc.resource("icon.png"), // Fallback or remote icon
              }),
              h("div", { class: "app-name" }, pkg.name),
              h(
                "div",
                { class: "app-meta" },
                `v${pkg.version} • ${pkg.category}`
              ),
              h("div", { class: "app-desc" }, pkg.description),
              h(
                Button,
                {
                  onclick: () => actions.installApp({ pkg, core }),
                  disabled: isInstalling,
                  type: "primary",
                },
                isInstalling ? "Downloading..." : "Install"
              ),
            ]);
          })
        ),

    h(Statusbar, {}, `Total Apps: ${state.apps.length}`),
  ]);
};

const register = (core, args, options, metadata) => {
  const proc = core.make("osjs/application", { args, options, metadata });

  proc
    .createWindow({
      id: "StoreWindow",
      title: metadata.title.en_EN,
      icon: proc.resource(metadata.icon),
      dimension: { width: 800, height: 600 },
    })
    .on("destroy", () => proc.destroy())
    .render(($content, win) => {
      const a = app(
        {
          apps: [],
          search: "",
          loading: false,
          installing: {},
        },
        {
          setSearch: (search) => (state) => ({ search }),
          setApps: (apps) => (state) => ({ apps }),
          setLoading: (loading) => (state) => ({ loading }),
          setInstalling:
            ({ name, value }) =>
            (state) => ({
              installing: { ...state.installing, [name]: value },
            }),

          fetchApps: () => async (state, actions) => {
            actions.setLoading(true);
            try {
              const response = await fetch(REPO_URL);
              const data = await response.json();
              actions.setApps(data.apps || []);
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

          installApp:
            ({ pkg, core }) =>
            async (state, actions) => {
              actions.setInstalling({ name: pkg.name, value: true });

              try {
                // 1. Construct Download URL
                // If download is relative, prepend the repo base URL
                let downloadUrl = pkg.download;
                if (!downloadUrl.match(/^https?:\/\//)) {
                  const baseUrl = REPO_URL.substring(
                    0,
                    REPO_URL.lastIndexOf("/")
                  );
                  downloadUrl = `${baseUrl}/${pkg.download}`;
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

      // Initial fetch
      a.fetchApps();
    });

  return proc;
};

// Register the package in the OS.js core
OSjs.make("osjs/packages").register(applicationName, register);

export { register, applicationName };
