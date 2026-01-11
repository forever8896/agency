import { d as derived, w as writable } from './index-MYuNOitU.js';

function createDashboardStore() {
  const { subscribe, set, update } = writable({
    backlog: { columns: {} },
    agents: [],
    handoffs: [],
    connected: false,
    lastUpdate: 0,
    recentEvents: []
  });
  let eventSource = null;
  let reconnectTimer = null;
  function connect() {
    if (typeof window === "undefined") return;
    const sseUrl = `/api/events/stream`;
    console.log("[Store] Connecting via SSE to", sseUrl);
    eventSource = new EventSource(sseUrl);
    eventSource.onopen = () => {
      console.log("[Store] SSE Connected");
      update((state) => ({ ...state, connected: true }));
    };
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[Store] Event:", message.type, message.agent || "");
        if (message.type === "initial" || message.type === "file_change" || message.type === "refresh") {
          if (message.data) {
            update((state) => ({
              ...state,
              ...message.data,
              lastUpdate: message.serverTimestamp || Date.now()
            }));
          }
        }
        if (message.agent) {
          update((state) => ({
            ...state,
            lastUpdate: message.serverTimestamp || Date.now(),
            // Keep last 20 events
            recentEvents: [message, ...state.recentEvents].slice(0, 20)
          }));
        }
      } catch (e) {
        console.error("[Store] Parse error:", e);
      }
    };
    eventSource.onerror = (error) => {
      console.error("[Store] SSE Error:", error);
      update((state) => ({ ...state, connected: false }));
      eventSource?.close();
      eventSource = null;
      reconnectTimer = setTimeout(connect, 2e3);
    };
  }
  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    eventSource?.close();
    eventSource = null;
  }
  async function refresh() {
    try {
      await fetch("/api/refresh", { method: "POST" });
    } catch (e) {
      console.error("[Store] Refresh error:", e);
    }
  }
  return {
    subscribe,
    connect,
    disconnect,
    refresh
  };
}
const dashboardStore = createDashboardStore();
const backlogStore = derived(dashboardStore, ($d) => $d.backlog);
const agentsStore = derived(dashboardStore, ($d) => $d.agents);
const handoffsStore = derived(dashboardStore, ($d) => $d.handoffs);
const connectionStore = derived(dashboardStore, ($d) => $d.connected);
const lastUpdateStore = derived(dashboardStore, ($d) => $d.lastUpdate);
derived(dashboardStore, ($d) => $d.recentEvents);

export { agentsStore as a, backlogStore as b, connectionStore as c, dashboardStore as d, handoffsStore as h, lastUpdateStore as l };
//# sourceMappingURL=dashboard-C_bUyMFn.js.map
