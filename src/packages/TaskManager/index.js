import { h, app } from "hyperapp";
import { Box, Button, Toolbar } from "@osjs/gui";
import "./index.scss";

const register = (core, args, options, metadata) => {
  const _ = core.make("osjs/locale").translate;
  const proc = core.make("osjs/application", { args, options, metadata });
  let win = null;

  // State for ListView
  const state = {
    rows: [],
    selectedPid: null
  };

  const hasColumns = (data) => data && typeof data === 'object' && 'columns' in data;

  const getProcesses = () => {
    return proc.constructor.getApplications()
        .filter(p => p)
        .map(p => ({
            pid: p.pid,
            name: p.metadata.name,
            title: p.metadata.title.en_EN || p.metadata.name,
            icon: p.metadata.icon ? core.url(p.metadata.icon) : null
        }));
  };

  const killProcess = (pid) => {
      // Use loose equality to handle potential string/number mismatches
      const p = proc.constructor.getApplications().find(proc => proc.pid == pid);
      if (p) {
          p.destroy();
      }
  };

  const actions = {
    refresh: () => state => ({
        rows: getProcesses()
    }),
    kill: (pid) => (state, actions) => {
        killProcess(pid);
        setTimeout(() => actions.refresh(), 500);
    },
    select: (pid) => state => ({ selectedPid: pid })
  };
  
  const renderHeader = () => h("div", { className: "tm-table-header" }, [
      h("div", { className: "tm-col-name" }, "Name"),
      h("div", { className: "tm-col-pid" }, "PID"),
      h("div", { className: "tm-col-status" }, "Status"),
      h("div", { className: "tm-col-action" }, "Action"),
  ]);

  const renderRow = (proc, state, actions) => h("div", {
        className: `tm-table-row ${state.selectedPid === proc.pid ? "selected" : ""}`,
        onclick: () => actions.select(proc.pid)
    }, [
        h("div", { className: "tm-col-name" }, [
            h("img", { src: proc.icon || fallbackIcon(core) }),
            h("span", {}, proc.title)
        ]),
        h("div", { className: "tm-col-pid" }, proc.pid),
        h("div", { className: "tm-col-status" }, "Running"),
        h("div", { className: "tm-col-action" }, [
            h(Button, {
                label: "End Task",
                onclick: (ev) => {
                    // Prevent row selection when clicking button
                    if(ev) ev.stopPropagation();
                    actions.kill(proc.pid);
                }
            })
        ])
  ]);

  const fallbackIcon = (core) => core.make("osjs/theme").icon("application-x-executable");

  const view = (state, actions) =>
    h("div", { className: "tm-window" }, [ // Replaced Box with div.tm-window
      h(Toolbar, {}, [
        h(Button, {
            onclick: () => actions.refresh(),
            label: "Refresh List"
        })
      ]),
      // Custom Table Container
      h("div", { className: "tm-table-container" }, [
          renderHeader(),
          h("div", { className: "tm-table-body" }, 
            state.rows.map(proc => renderRow(proc, state, actions))
          )
      ])
    ]);

  win = proc
    .createWindow({
      id: "osjs-taskmanager-window",
      title: metadata.title.en_EN,
      dimension: { width: 400, height: 500 },
      position: "center",
      attributes: {
          className: "osjs-taskmanager-window"
      }
    })
    .on("destroy", () => proc.destroy())
    .render(($content) => {
        const wiredActions = app(state, actions, view, $content);
        
        // Initial refresh
        wiredActions.refresh();

        // Auto-refresh every 2 seconds
        const refreshInterval = setInterval(() => {
            wiredActions.refresh();
        }, 2000);

        // Cleanup interval when process is destroyed
        proc.on('destroy', () => clearInterval(refreshInterval));
    });
   
  return proc;
};

OSjs.make("osjs/packages").register("osjs-taskmanager", register);
