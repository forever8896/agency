import { c as create_ssr_component, a as subscribe, o as onDestroy, e as escape } from "../../chunks/ssr.js";
import { c as connectionStore, l as lastUpdateStore, d as dashboardStore } from "../../chunks/dashboard.js";
function formatTime(timestamp) {
  if (!timestamp) return "--:--:--";
  return new Date(timestamp).toLocaleTimeString("en-US", { hour12: false });
}
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $connectionStore, $$unsubscribe_connectionStore;
  let $lastUpdateStore, $$unsubscribe_lastUpdateStore;
  $$unsubscribe_connectionStore = subscribe(connectionStore, (value) => $connectionStore = value);
  $$unsubscribe_lastUpdateStore = subscribe(lastUpdateStore, (value) => $lastUpdateStore = value);
  onDestroy(() => {
    dashboardStore.disconnect();
  });
  $$unsubscribe_connectionStore();
  $$unsubscribe_lastUpdateStore();
  return `<div class="min-h-screen flex flex-col"> <header class="bg-white border-b-4 border-black px-6 py-4 flex justify-between items-center sticky top-0 z-50"><div class="flex items-center gap-4" data-svelte-h="svelte-102hott"><div class="bg-black text-white px-3 py-1 font-black text-xl tracking-tighter transform -rotate-2">AGENCY</div> <h1 class="text-xl font-bold tracking-tight">OPERATIONS DASHBOARD</h1></div> <div class="flex items-center gap-6 font-mono text-sm"> <div class="flex items-center gap-3 border-2 border-black px-3 py-1 bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><span class="font-bold uppercase" data-svelte-h="svelte-m9sgfe">Status:</span> <span class="${[
    "font-bold",
    ($connectionStore ? "text-green-600" : "") + " " + (!$connectionStore ? "text-red-600" : "")
  ].join(" ").trim()}">${escape($connectionStore ? "CONNECTED" : "DISCONNECTED")}</span></div>  ${$lastUpdateStore ? `<div class="border-2 border-black px-3 py-1 bg-white"><span class="text-gray-500 mr-2" data-svelte-h="svelte-9tjsvn">LAST SYNC:</span> <span class="font-bold">${escape(formatTime($lastUpdateStore))}</span></div>` : ``}</div></header>  <main class="flex-1 p-6 bg-[#f0f0f0]">${slots.default ? slots.default({}) : ``}</main></div>`;
});
export {
  Layout as default
};
