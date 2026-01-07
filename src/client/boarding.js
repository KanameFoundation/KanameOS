import { h, app } from "hyperapp";
import { EventEmitter } from "../event/emitter";

const DEFAULT_REPO = "https://raw.githubusercontent.com/Kaname-Fundation/KanameStore/refs/heads/live/repository.json";

export default class Boarding extends EventEmitter {
  constructor(core) {
    super("Boarding");
    this.core = core;
    this.$container = document.createElement("div");
    this.$container.className = "osjs-login-base osjs-boarding"; 
    // Basic fallback styles in case theme is missing
    this.$container.style.fontFamily = "sans-serif";
    this.$container.style.backgroundColor = "#2f2f2f";
  }

  init() {
    this.core.$root.classList.add("login"); 
    this.core.$root.appendChild(this.$container);
    this.render();
  }

  destroy() {
    this.core.$root.classList.remove("login");
    if (this.$container) this.$container.remove();
  }

  render() {
    const view = (state, actions) =>
      h(
        "div",
        {
          class: "osjs-login", 
          style: {
             display: "flex",
             flexDirection: "column",
             alignItems: "center",
             justifyContent: "center",
             height: "100%",
             color: "white"
          },
        },
        [
          h("h1", { style: { marginTop: "0", marginBottom: "10px" } }, "Welcome to KanameOS"),
          h("p", { style: { marginBottom: "20px", color: "#ccc" } }, "Let's set up your system."),
          
          state.error ? h("div", { 
            class: "osjs-login-error", 
            style: {
              display: 'block', 
              backgroundColor: '#ff4444', 
              color: 'white', 
              padding: '10px', 
              borderRadius: '4px',
              marginBottom: '20px'
            } 
          }, state.error) : null,

          h("form", {
            onsubmit: actions.submit,
            style: { 
              width: "100%", 
              maxWidth: "400px",
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
            }
          }, [
             // Progress Section (visible when loading)
             state.loading ? h("div", { 
               style: { 
                 textAlign: "center",
                 display: "flex",
                 flexDirection: "column",
                 alignItems: "center"
               } 
             }, [
               h("div", { 
                 class: "osjs-loader", // Use system loader style if available, or we define custom
                 style: {
                   border: "4px solid rgba(255, 255, 255, 0.1)",
                   borderLeft: "4px solid #d97aa6",
                   borderRadius: "50%",
                   width: "40px",
                   height: "40px",
                   animation: "spin 1s linear infinite",
                   marginBottom: "20px"
                 }
               }),
               h("style", {}, `
                 @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
               `),
               h("div", { style: { marginBottom: "10px", fontSize: "1.2em", fontWeight: "bold" } }, "Setting up System..."),
               h("div", { style: { color: "#aaa", marginBottom: "15px" } }, state.status || "Please wait..."),
               h("div", { 
                 style: { 
                   width: "100%", 
                   height: "6px", 
                   backgroundColor: "#333", 
                   borderRadius: "3px",
                   overflow: "hidden"
                 } 
               }, [
                 h("div", {
                   style: {
                     width: `${state.progress}%`,
                     height: "100%",
                     backgroundColor: "#d97aa6",
                     transition: "width 0.3s ease",
                     boxShadow: "0 0 10px rgba(217, 122, 166, 0.5)"
                   }
                 })
               ])
             ]) : h("div", {}, [
              // Form Section
              h("h3", { style: {borderBottom: '1px solid #eba4c2', paddingBottom: '5px', marginTop: 0} }, "Create Admin Account"),
              h("div", { class: "osjs-login-field", style: {marginBottom: '15px'} }, [
                h("label", { style: {display: 'block', marginBottom: '5px'} }, "Username"),
                h("input", { 
                  name: "username", 
                  placeholder: "admin", 
                  required: true,
                  style: { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' } 
                })
              ]),
              h("div", { class: "osjs-login-field", style: {marginBottom: '15px'} }, [
                h("label", { style: {display: 'block', marginBottom: '5px'} }, "Password"),
                h("input", { 
                  name: "password", 
                  type: "password", 
                  required: true,
                  style: { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: 'white' }
                })
              ]),

              h("button", {
                type: "submit",
                style: {
                  width: "100%",
                  boxSizing: 'border-box',
                  padding: "12px",
                  marginTop: "10px",
                  cursor: "pointer",
                  backgroundColor: "#d97aa6",
                  border: "none",
                  borderRadius: "4px",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "1em",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                },
                onmouseover: (e) => e.target.style.backgroundColor = "#e08eb3",
                onmouseout: (e) => e.target.style.backgroundColor = "#d97aa6"
              }, "Start Installation")
             ])
          ])
        ]
      );

    app(
      {
        loading: false,
        status: "",
        progress: 0,
        error: null
      },
      {
        setLoading: (loading) => ({ loading }),
        setStatus: (status) => ({ status }),
        setProgress: (progress) => ({ progress }),
        setError: (error) => ({ error }),
        submit: (ev) => async (state, actions) => {
          ev.preventDefault();
          actions.setLoading(true);
          actions.setError(null);
          
          const formData = new FormData(ev.target);
          const values = Object.fromEntries(formData);
          const packagesToInstall = ["osjs-desktop", "osjs-panels", "osjs-notifications", "StandardTheme", "GnomeIcons", "settings-application", "store", "appmanager", "FreedesktopSounds"];

          try {
            // 1. Register Admin
            actions.setStatus("Registering admin account...");
            actions.setProgress(10);
            
            const regRes = await this.core.request('/register', { 
                method: 'POST', 
                body: JSON.stringify(values), 
                headers: {'Content-Type': 'application/json'} 
            });
            const regResult = await regRes.json();
            if (regResult.error) throw new Error(regResult.error);

            // 2. Login immediately to get session
            actions.setStatus("Logging in...");
            actions.setProgress(20);
             const loginRes = await this.core.request('/login', { 
                method: 'POST', 
                body: JSON.stringify(values), 
                headers: {'Content-Type': 'application/json'} 
            });
            const loginResult = await loginRes.json();
            if (!loginResult || loginResult.error) throw new Error("Automatic login failed");


            // 3. Fetch Repository Information
            actions.setStatus("Fetching package repository...");
            actions.setProgress(30);
            
            const repoRes = await fetch(DEFAULT_REPO);
            if (!repoRes.ok) throw new Error("Failed to fetch repository");
            const repoData = await repoRes.json();
            const repoBase = DEFAULT_REPO.substring(0, DEFAULT_REPO.lastIndexOf("/"));
            
            // 4. Download and Install Packages
            const total = packagesToInstall.length;
            let current = 0;

            for (const pkgName of packagesToInstall) {
                 actions.setStatus(`Downloading ${pkgName}...`);
                 
                 const pkgInfo = (repoData.apps || []).find(p => p.name === pkgName);
                 if (!pkgInfo) {
                     console.warn(`Package ${pkgName} not found in repository. Skipping.`);
                     continue;
                 }

                 let downloadUrl = pkgInfo.download;
                 if (!downloadUrl.match(/^https?:\/\//)) {
                   downloadUrl = `${repoBase}/${pkgInfo.download}`;
                 }

                 // Download
                 const dlRes = await fetch(downloadUrl);
                 if (!dlRes.ok) throw new Error(`Failed to download ${pkgName}`);
                 const blob = await dlRes.blob();
                 
                 actions.setStatus(`Installing ${pkgName}...`);
                 
                 // Upload to Install
                 const uploadData = new FormData();
                 uploadData.append("package", blob, `${pkgName}.wpk`); // Filename matters for extension
                 
                 await this.core.request('/packages/install', {
                     method: 'POST',
                     body: uploadData
                 });

                 current++;
                 actions.setProgress(30 + Math.floor((current / total) * 60));
            }

            // 5. Setup Whitelist (Wait, package install should put it in metadata? 
            // The Trusted Autostart logic reads metadata. But we should ensure default whitelist exists)
            actions.setStatus("Finalizing configuration...");
            try {
              const whitelist = ["osjs-desktop", "osjs-panels", "osjs-notifications"];
              // Use settings service if available? No, core not booted fully. Use localStorage directly or osjs/settings adapter?
              // The user session is active now.
              // But osjs/settings service isn't loaded generally until core boot.
              // We'll write to localStorage for the 'osjs/settings' key as a robust fallback/init
               const uniqueId = "osjs"; // Default namespace
               const settingsKey = `${uniqueId}__settings__osjs/packages`;
               
              const settingsStr = localStorage.getItem(settingsKey) || '{}';
              const settings = JSON.parse(settingsStr);
              settings.autostart = whitelist;
              localStorage.setItem(settingsKey, JSON.stringify(settings));

            } catch (e) {
              console.warn("Failed to set initial whitelist", e);
            }

            actions.setStatus("Done! Reloading...");
            actions.setProgress(100);
            setTimeout(() => window.location.reload(), 1500);

          } catch (err) {
            console.error(err);
            actions.setLoading(false);
            actions.setError(err.message);
          }
        }
      },
      view,
      this.$container
    );
  }
}
