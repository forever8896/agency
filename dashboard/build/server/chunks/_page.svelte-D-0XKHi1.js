import { c as create_ssr_component, v as validate_component, a as subscribe, b as each, e as escape, d as add_attribute } from './ssr-DLVJyBVA.js';
import { b as backlogStore, a as agentsStore, h as handoffsStore } from './dashboard-C_bUyMFn.js';
import './index-MYuNOitU.js';

const AGENT_CONFIG = {
  "product-owner": {
    emoji: "🎯",
    color: "#9333ea",
    label: "Product Owner",
    short: "PO"
  },
  "tech-lead": {
    emoji: "🏗️",
    color: "#3b82f6",
    label: "Tech Lead",
    short: "TL"
  },
  "dev-alpha": {
    emoji: "⚡",
    color: "#22c55e",
    label: "Dev Alpha",
    short: "α"
  },
  "dev-beta": {
    emoji: "🔧",
    color: "#22c55e",
    label: "Dev Beta",
    short: "β"
  },
  "dev-gamma": {
    emoji: "🛠️",
    color: "#22c55e",
    label: "Dev Gamma",
    short: "γ"
  },
  "qa": {
    emoji: "🔍",
    color: "#eab308",
    label: "QA",
    short: "QA"
  },
  "reviewer": {
    emoji: "📝",
    color: "#d946ef",
    label: "Reviewer",
    short: "REV"
  },
  "devops": {
    emoji: "🚀",
    color: "#06b6d4",
    label: "DevOps",
    short: "OPS"
  }
};
const STATUS_CONFIG = {
  "Idle": { color: "#6b7280", bgColor: "#f3f4f6" },
  "Working": { color: "#22c55e", bgColor: "#dcfce7" },
  "Blocked": { color: "#ef4444", bgColor: "#fef2f2" }
};
const PRIORITY_CONFIG = {
  0: { color: "#dc2626", bgColor: "#fef2f2", label: "P0" },
  1: { color: "#ea580c", bgColor: "#fff7ed", label: "P1" },
  2: { color: "#ca8a04", bgColor: "#fefce8", label: "P2" },
  3: { color: "#65a30d", bgColor: "#f7fee7", label: "P3" }
};
const Card = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let priority;
  let { task } = $$props;
  if ($$props.task === void 0 && $$bindings.task && task !== void 0) $$bindings.task(task);
  AGENT_CONFIG[task.assignee] || {
    label: task.assignee};
  priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[2];
  return `<div class="bg-white border-2 border-black p-3 mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-pointer"> <div class="flex justify-between items-start mb-2 border-b-2 border-gray-100 pb-2"><span class="font-mono text-xs font-bold px-2 py-0.5 border border-black uppercase" style="${"background-color: " + escape(priority.bgColor, true) + "; color: " + escape(priority.color, true)}">${escape(priority.label)}</span> <span class="font-mono text-xs text-gray-500">#${escape(task.id || "---")}</span></div>  <h4 class="text-sm font-bold text-black mb-2 leading-tight">${escape(task.title)}</h4> ${task.summary ? `<p class="text-xs font-mono text-gray-600 mb-3 leading-relaxed border-l-2 border-gray-300 pl-2">${escape(task.summary)}</p>` : ``}  <div class="flex items-end justify-between mt-2"> <div class="flex flex-wrap gap-1 max-w-[70%]">${task.files && task.files.length > 0 ? `${each(task.files.slice(0, 2), (file) => {
    return `<code class="text-[10px] bg-gray-100 text-black px-1 border border-black truncate max-w-full">${escape(file.split("/").pop())} </code>`;
  })} ${task.files.length > 2 ? `<span class="text-[10px] font-bold">+${escape(task.files.length - 2)}</span>` : ``}` : ``}</div>  <div class="flex items-center gap-1 bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">${escape(task.assignee.replace("dev-", ""))}</div></div></div>`;
});
const Column = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let displayName;
  let { status } = $$props;
  let { tasks = [] } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0) $$bindings.status(status);
  if ($$props.tasks === void 0 && $$bindings.tasks && tasks !== void 0) $$bindings.tasks(tasks);
  displayName = status.replace(/_/g, " ");
  return `<div class="flex flex-col w-80 min-w-80 flex-shrink-0 h-full max-h-full"> <div class="flex items-center justify-between px-4 py-3 border-2 border-black bg-white mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><div class="flex items-center gap-2"><h3 class="text-sm font-black uppercase tracking-tight text-black">${escape(displayName)}</h3></div> <span class="font-mono text-xs font-bold bg-black text-white px-2 py-0.5">${escape(tasks.length)}</span></div>  <div class="border-2 border-black bg-[#f8f8f8] p-2 overflow-y-auto flex-1 custom-scrollbar">${tasks.length ? each(tasks, (task) => {
    return `<div>${validate_component(Card, "Card").$$render($$result, { task }, {}, {})} </div>`;
  }) : `<div class="flex flex-col items-center justify-center h-24 opacity-40" data-svelte-h="svelte-y0hhnl"><div class="w-8 h-8 border-2 border-dashed border-black rounded-full mb-2"></div> </div>`}</div></div>`;
});
const Board = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $backlogStore, $$unsubscribe_backlogStore;
  $$unsubscribe_backlogStore = subscribe(backlogStore, (value) => $backlogStore = value);
  const columnOrder = ["READY", "IN_PROGRESS", "DONE", "QA_PASSED", "SHIPPED"];
  $$unsubscribe_backlogStore();
  return `<div class="h-full flex gap-4 overflow-x-auto pb-2 px-2 snap-x snap-mandatory">${each(columnOrder, (status) => {
    return `<div class="snap-start h-full pb-2">${validate_component(Column, "Column").$$render(
      $$result,
      {
        status,
        tasks: $backlogStore.columns[status] || []
      },
      {},
      {}
    )} </div>`;
  })}</div>`;
});
const AgentAvatar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let statusConfig;
  let isBlocked;
  let { agent } = $$props;
  const getInitials = (name) => name.split("-").map((p) => p[0]).join("").toUpperCase();
  if ($$props.agent === void 0 && $$bindings.agent && agent !== void 0) $$bindings.agent(agent);
  statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG["Idle"];
  agent.status === "Working";
  isBlocked = agent.status === "Blocked";
  return `<div class="neo-box p-3 flex items-start gap-3 hover-lift bg-white mb-3"> <div class="w-12 h-12 border-2 border-black flex items-center justify-center bg-black text-white font-mono font-bold text-lg shrink-0">${escape(getInitials(agent.name))}</div> <div class="flex-1 min-w-0"> <div class="flex items-center justify-between mb-1"><span class="font-bold text-lg leading-none">${escape(agent.name)}</span> <span class="neo-tag text-[10px]" style="${"background-color: " + escape(statusConfig.color, true) + "; color: " + escape(agent.status === "Idle" ? "black" : "white", true) + ";"}">${escape(agent.status.toUpperCase())}</span></div>  <div class="font-mono text-xs">${isBlocked ? `<div class="text-red-600 font-bold flex items-center gap-1 bg-red-100 p-1 border border-red-500 mt-1"><span data-svelte-h="svelte-12whj7n">!</span> BLOCKED: ${escape(agent.blockers)}</div>` : `${agent.workingOn !== "--" ? `<div class="text-gray-600 mt-1 truncate p-1 bg-gray-50 border border-gray-200"${add_attribute("title", agent.workingOn, 0)}><span class="font-bold text-black" data-svelte-h="svelte-1lbgyb7">&gt;</span> ${escape(agent.workingOn)}</div>` : `<div class="text-gray-400 italic mt-1 pl-1" data-svelte-h="svelte-oo7lgh">// System Idle</div>`}`}</div> ${agent.updated && agent.updated !== "--" ? `<div class="mt-2 pt-2 border-t-2 border-gray-100 flex justify-end"><span class="text-[10px] font-mono text-gray-500 uppercase">UPDATED: ${escape(agent.updated)}</span></div>` : ``}</div></div>`;
});
const AgentPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $agentsStore, $$unsubscribe_agentsStore;
  $$unsubscribe_agentsStore = subscribe(agentsStore, (value) => $agentsStore = value);
  $$unsubscribe_agentsStore();
  return `<aside class="w-80 flex-shrink-0 flex flex-col h-full overflow-hidden"><div class="bg-white border-2 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><h3 class="font-black text-xl uppercase flex justify-between items-center">OPERATIVES
            <span class="bg-black text-white px-2 py-0.5 text-sm font-mono">${escape($agentsStore.length)}</span></h3></div> <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">${$agentsStore.length ? each($agentsStore, (agent) => {
    return `${validate_component(AgentAvatar, "AgentAvatar").$$render($$result, { agent }, {}, {})}`;
  }) : `<div class="border-2 border-dashed border-gray-400 p-8 text-center text-gray-500 font-mono" data-svelte-h="svelte-w1fpx9">NO_ACTIVE_AGENTS_FOUND
            </div>`}</div></aside>`;
});
const centerX = 150;
const centerY = 150;
const radius = 110;
function getPosition(index, total) {
  const angle = index / total * 2 * Math.PI - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  };
}
const HandoffFlow = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let agentPositions;
  let recentHandoffs;
  let $handoffsStore, $$unsubscribe_handoffsStore;
  $$unsubscribe_handoffsStore = subscribe(handoffsStore, (value) => $handoffsStore = value);
  const agents = Object.keys(AGENT_CONFIG);
  agentPositions = agents.reduce(
    (acc, agent, i) => {
      acc[agent] = getPosition(i, agents.length);
      return acc;
    },
    {}
  );
  recentHandoffs = $handoffsStore.slice(0, 5);
  $$unsubscribe_handoffsStore();
  return `<div class="flex flex-col gap-4 mt-6"><div class="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" data-svelte-h="svelte-v9cw8x"><h3 class="font-black text-sm uppercase">DATA FLOW</h3></div>  <div class="bg-white border-2 border-black p-2 relative flex justify-center"><svg viewBox="0 0 300 300" class="w-full max-w-[300px] h-auto"><defs><marker id="arrow-black" markerWidth="10" markerHeight="10" refX="22" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#000"></path></marker></defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"></path></pattern><rect width="100%" height="100%" fill="url(#grid)"></rect>${each(recentHandoffs, (handoff) => {
    let from = agentPositions[handoff.from] || agentPositions["tech-lead"], to = agentPositions[handoff.to] || agentPositions["dev-alpha"];
    return `  <line${add_attribute("x1", from.x, 0)}${add_attribute("y1", from.y, 0)}${add_attribute("x2", to.x, 0)}${add_attribute("y2", to.y, 0)} stroke="black" stroke-width="2" marker-end="url(#arrow-black)"></line>`;
  })}${each(agents, (agent, i) => {
    let pos = agentPositions[agent];
    return `  <g transform="${"translate(" + escape(pos.x, true) + ", " + escape(pos.y, true) + ")"}"><circle r="16" fill="white" stroke="black" stroke-width="2"></circle><text text-anchor="middle" dy="0.35em" font-family="monospace" font-weight="bold" font-size="12">${escape(agent.replace("dev-", "").substring(0, 2).toUpperCase())}</text></g>`;
  })}</svg></div>  <div class="space-y-2">${each(recentHandoffs, (handoff) => {
    return `<div class="flex items-center gap-2 text-xs border-2 border-black bg-white p-2"><span class="font-bold">${escape(handoff.from)}</span> <span class="text-gray-400" data-svelte-h="svelte-pnuc2m">-&gt;</span> <span class="font-bold">${escape(handoff.to)}</span> <span class="font-mono text-gray-600 truncate flex-1 border-l border-gray-300 pl-2 ml-2">${escape(handoff.title)}</span> </div>`;
  })}</div></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `<!-- HEAD_svelte-1juw0uw_START -->${$$result.title = `<title>AGENCY_OPS</title>`, ""}<!-- HEAD_svelte-1juw0uw_END -->`, ""} <div class="flex gap-6 h-[calc(100vh-140px)]"> <div class="flex-1 flex flex-col min-w-0">${validate_component(Board, "Board").$$render($$result, {}, {}, {})}</div>  <div class="flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-4">${validate_component(AgentPanel, "AgentPanel").$$render($$result, {}, {}, {})} ${validate_component(HandoffFlow, "HandoffFlow").$$render($$result, {}, {}, {})}</div></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-D-0XKHi1.js.map
