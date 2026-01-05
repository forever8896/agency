// vite.config.ts
import { sveltekit } from "file:///home/deepseek/autonomous_opencode_Builder/dashboard/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///home/deepseek/autonomous_opencode_Builder/dashboard/node_modules/vite/dist/node/index.js";
import { WebSocketServer, WebSocket } from "file:///home/deepseek/autonomous_opencode_Builder/dashboard/node_modules/ws/wrapper.mjs";
import chokidar from "file:///home/deepseek/autonomous_opencode_Builder/dashboard/node_modules/chokidar/index.js";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
async function parseBacklog(filePath) {
  const columns = {};
  const statuses = ["READY", "IN_PROGRESS", "DONE", "QA_TESTING", "QA_PASSED", "QA_FAILED", "REVIEWING", "REVIEWED", "SHIPPED"];
  statuses.forEach((s) => columns[s] = []);
  if (!existsSync(filePath)) return { columns };
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  let currentTask = null;
  for (const line of lines) {
    const headerMatch = line.match(/^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*(?:\[P(\d)\])?\s*(.+?)(?:\s+@(\S+))?$/);
    if (headerMatch) {
      if (currentTask?.status && currentTask?.title) {
        columns[currentTask.status].push(currentTask);
      }
      const [, status, priority, title, assignee] = headerMatch;
      currentTask = {
        id: `${status}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status,
        priority: priority ? parseInt(priority) : 2,
        title: title.trim(),
        assignee: assignee || "unassigned"
      };
      continue;
    }
    if (currentTask) {
      const filesMatch = line.match(/^\*\*Files:\*\*\s*(.+)$/);
      if (filesMatch) currentTask.files = filesMatch[1].split(",").map((f) => f.trim());
      const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)$/);
      if (summaryMatch) currentTask.summary = summaryMatch[1];
    }
  }
  if (currentTask?.status && currentTask?.title) {
    columns[currentTask.status].push(currentTask);
  }
  return { columns };
}
async function parseStandup(filePath) {
  const agents = [];
  const agentNames = ["product-owner", "tech-lead", "dev-alpha", "dev-beta", "dev-gamma", "qa", "reviewer", "devops"];
  if (!existsSync(filePath)) {
    return agentNames.map((name) => ({ name, status: "Idle", workingOn: "--", completed: "--", blockers: "None", next: "--", updated: "--" }));
  }
  const content = await readFile(filePath, "utf-8");
  for (const name of agentNames) {
    const sectionRegex = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
    const match = content.match(sectionRegex);
    if (match) {
      const section = match[1];
      const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/);
      const workingMatch = section.match(/\*\*Working on:\*\*\s*(.+)/);
      const completedMatch = section.match(/\*\*Completed:\*\*\s*(.+)/);
      const blockersMatch = section.match(/\*\*Blockers:\*\*\s*(.+)/);
      const nextMatch = section.match(/\*\*Next:\*\*\s*(.+)/);
      const updatedMatch = section.match(/\*Updated:\s*(.+?)\*/);
      const rawStatus = statusMatch?.[1] || "Idle";
      let status = "Idle";
      if (rawStatus.toUpperCase().includes("BLOCKED")) status = "Blocked";
      else if (rawStatus !== "Idle" && rawStatus !== "--") status = "Working";
      agents.push({ name, status, workingOn: workingMatch?.[1] || "--", completed: completedMatch?.[1] || "--", blockers: blockersMatch?.[1] || "None", next: nextMatch?.[1] || "--", updated: updatedMatch?.[1] || "--" });
    } else {
      agents.push({ name, status: "Idle", workingOn: "--", completed: "--", blockers: "None", next: "--", updated: "--" });
    }
  }
  return agents;
}
async function parseHandoffs(dirPath) {
  const handoffs = [];
  if (!existsSync(dirPath)) return handoffs;
  const files = await readdir(dirPath);
  for (const file of files) {
    if (!file.endsWith(".md") || file === ".gitkeep") continue;
    try {
      const content = await readFile(path.join(dirPath, file), "utf-8");
      const titleMatch = content.match(/^# (.+)/m);
      const filenameMatch = file.match(/^(\w+)-to-([\w-]+)/);
      let from = "unknown", to = "unknown";
      if (filenameMatch) {
        from = filenameMatch[1] === "tl" ? "tech-lead" : filenameMatch[1];
        to = filenameMatch[2];
      }
      handoffs.push({ id: file.replace(".md", ""), filename: file, title: titleMatch?.[1] || file.replace(".md", ""), from, to, date: "" });
    } catch (e) {
    }
  }
  return handoffs;
}
function webSocketPlugin() {
  let wss = null;
  let currentState = { backlog: { columns: {} }, agents: [], handoffs: [] };
  const DATA_DIR = path.resolve(process.cwd(), "../agency/data");
  async function parseAll() {
    const [backlog, agents, handoffs] = await Promise.all([
      parseBacklog(path.join(DATA_DIR, "backlog.md")),
      parseStandup(path.join(DATA_DIR, "standup.md")),
      parseHandoffs(path.join(DATA_DIR, "handoffs"))
    ]);
    currentState = { backlog, agents, handoffs };
  }
  function broadcast() {
    if (!wss) return;
    const message = JSON.stringify({ type: "update", data: currentState, timestamp: Date.now() });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  }
  return {
    name: "websocket-plugin",
    configureServer(server) {
      wss = new WebSocketServer({ server: server.httpServer, path: "/ws" });
      wss.on("connection", (ws) => {
        console.log("[Dev WS] Client connected");
        ws.send(JSON.stringify({ type: "initial", data: currentState, timestamp: Date.now() }));
        ws.on("close", () => console.log("[Dev WS] Client disconnected"));
      });
      let debounce = null;
      chokidar.watch([
        path.join(DATA_DIR, "backlog.md"),
        path.join(DATA_DIR, "standup.md"),
        path.join(DATA_DIR, "handoffs")
      ], { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300 } }).on("all", () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(async () => {
          await parseAll();
          broadcast();
        }, 200);
      });
      parseAll().then(() => console.log(`[Dev WS] Watching ${DATA_DIR}`));
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [sveltekit(), webSocketPlugin()],
  server: {
    port: 3e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kZWVwc2Vlay9hdXRvbm9tb3VzX29wZW5jb2RlX0J1aWxkZXIvZGFzaGJvYXJkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9kZWVwc2Vlay9hdXRvbm9tb3VzX29wZW5jb2RlX0J1aWxkZXIvZGFzaGJvYXJkL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2RlZXBzZWVrL2F1dG9ub21vdXNfb3BlbmNvZGVfQnVpbGRlci9kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyBXZWJTb2NrZXRTZXJ2ZXIsIFdlYlNvY2tldCB9IGZyb20gJ3dzJztcbmltcG9ydCBjaG9raWRhciBmcm9tICdjaG9raWRhcic7XG5pbXBvcnQgeyByZWFkRmlsZSwgcmVhZGRpciB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW5saW5lIHBhcnNlciBmb3IgZGV2IG1vZGVcbmFzeW5jIGZ1bmN0aW9uIHBhcnNlQmFja2xvZyhmaWxlUGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IGNvbHVtbnM6IFJlY29yZDxzdHJpbmcsIGFueVtdPiA9IHt9O1xuXHRjb25zdCBzdGF0dXNlcyA9IFsnUkVBRFknLCAnSU5fUFJPR1JFU1MnLCAnRE9ORScsICdRQV9URVNUSU5HJywgJ1FBX1BBU1NFRCcsICdRQV9GQUlMRUQnLCAnUkVWSUVXSU5HJywgJ1JFVklFV0VEJywgJ1NISVBQRUQnXTtcblx0c3RhdHVzZXMuZm9yRWFjaChzID0+IGNvbHVtbnNbc10gPSBbXSk7XG5cblx0aWYgKCFleGlzdHNTeW5jKGZpbGVQYXRoKSkgcmV0dXJuIHsgY29sdW1ucyB9O1xuXG5cdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShmaWxlUGF0aCwgJ3V0Zi04Jyk7XG5cdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG5cdGxldCBjdXJyZW50VGFzazogYW55ID0gbnVsbDtcblxuXHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRjb25zdCBoZWFkZXJNYXRjaCA9IGxpbmUubWF0Y2goL14jIyAoUkVBRFl8SU5fUFJPR1JFU1N8RE9ORXxRQV9URVNUSU5HfFFBX1BBU1NFRHxRQV9GQUlMRUR8UkVWSUVXSU5HfFJFVklFV0VEfFNISVBQRUQpOlxccyooPzpcXFtQKFxcZClcXF0pP1xccyooLis/KSg/OlxccytAKFxcUyspKT8kLyk7XG5cblx0XHRpZiAoaGVhZGVyTWF0Y2gpIHtcblx0XHRcdGlmIChjdXJyZW50VGFzaz8uc3RhdHVzICYmIGN1cnJlbnRUYXNrPy50aXRsZSkge1xuXHRcdFx0XHRjb2x1bW5zW2N1cnJlbnRUYXNrLnN0YXR1c10ucHVzaChjdXJyZW50VGFzayk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBbLCBzdGF0dXMsIHByaW9yaXR5LCB0aXRsZSwgYXNzaWduZWVdID0gaGVhZGVyTWF0Y2g7XG5cdFx0XHRjdXJyZW50VGFzayA9IHtcblx0XHRcdFx0aWQ6IGAke3N0YXR1c30tJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gLFxuXHRcdFx0XHRzdGF0dXMsXG5cdFx0XHRcdHByaW9yaXR5OiBwcmlvcml0eSA/IHBhcnNlSW50KHByaW9yaXR5KSA6IDIsXG5cdFx0XHRcdHRpdGxlOiB0aXRsZS50cmltKCksXG5cdFx0XHRcdGFzc2lnbmVlOiBhc3NpZ25lZSB8fCAndW5hc3NpZ25lZCdcblx0XHRcdH07XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRpZiAoY3VycmVudFRhc2spIHtcblx0XHRcdGNvbnN0IGZpbGVzTWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFwqXFwqRmlsZXM6XFwqXFwqXFxzKiguKykkLyk7XG5cdFx0XHRpZiAoZmlsZXNNYXRjaCkgY3VycmVudFRhc2suZmlsZXMgPSBmaWxlc01hdGNoWzFdLnNwbGl0KCcsJykubWFwKChmOiBzdHJpbmcpID0+IGYudHJpbSgpKTtcblxuXHRcdFx0Y29uc3Qgc3VtbWFyeU1hdGNoID0gbGluZS5tYXRjaCgvXlxcKlxcKlN1bW1hcnk6XFwqXFwqXFxzKiguKykkLyk7XG5cdFx0XHRpZiAoc3VtbWFyeU1hdGNoKSBjdXJyZW50VGFzay5zdW1tYXJ5ID0gc3VtbWFyeU1hdGNoWzFdO1xuXHRcdH1cblx0fVxuXG5cdGlmIChjdXJyZW50VGFzaz8uc3RhdHVzICYmIGN1cnJlbnRUYXNrPy50aXRsZSkge1xuXHRcdGNvbHVtbnNbY3VycmVudFRhc2suc3RhdHVzXS5wdXNoKGN1cnJlbnRUYXNrKTtcblx0fVxuXG5cdHJldHVybiB7IGNvbHVtbnMgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VTdGFuZHVwKGZpbGVQYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgYWdlbnRzOiBhbnlbXSA9IFtdO1xuXHRjb25zdCBhZ2VudE5hbWVzID0gWydwcm9kdWN0LW93bmVyJywgJ3RlY2gtbGVhZCcsICdkZXYtYWxwaGEnLCAnZGV2LWJldGEnLCAnZGV2LWdhbW1hJywgJ3FhJywgJ3Jldmlld2VyJywgJ2Rldm9wcyddO1xuXG5cdGlmICghZXhpc3RzU3luYyhmaWxlUGF0aCkpIHtcblx0XHRyZXR1cm4gYWdlbnROYW1lcy5tYXAobmFtZSA9PiAoeyBuYW1lLCBzdGF0dXM6ICdJZGxlJywgd29ya2luZ09uOiAnLS0nLCBjb21wbGV0ZWQ6ICctLScsIGJsb2NrZXJzOiAnTm9uZScsIG5leHQ6ICctLScsIHVwZGF0ZWQ6ICctLScgfSkpO1xuXHR9XG5cblx0Y29uc3QgY29udGVudCA9IGF3YWl0IHJlYWRGaWxlKGZpbGVQYXRoLCAndXRmLTgnKTtcblxuXHRmb3IgKGNvbnN0IG5hbWUgb2YgYWdlbnROYW1lcykge1xuXHRcdGNvbnN0IHNlY3Rpb25SZWdleCA9IG5ldyBSZWdFeHAoYCMjICR7bmFtZX1cXFxcbihbXFxcXHNcXFxcU10qPykoPz1cXFxcbiMjIHwkKWAsICdpJyk7XG5cdFx0Y29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKHNlY3Rpb25SZWdleCk7XG5cblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdGNvbnN0IHNlY3Rpb24gPSBtYXRjaFsxXTtcblx0XHRcdGNvbnN0IHN0YXR1c01hdGNoID0gc2VjdGlvbi5tYXRjaCgvXFwqXFwqU3RhdHVzOlxcKlxcKlxccyooLispLyk7XG5cdFx0XHRjb25zdCB3b3JraW5nTWF0Y2ggPSBzZWN0aW9uLm1hdGNoKC9cXCpcXCpXb3JraW5nIG9uOlxcKlxcKlxccyooLispLyk7XG5cdFx0XHRjb25zdCBjb21wbGV0ZWRNYXRjaCA9IHNlY3Rpb24ubWF0Y2goL1xcKlxcKkNvbXBsZXRlZDpcXCpcXCpcXHMqKC4rKS8pO1xuXHRcdFx0Y29uc3QgYmxvY2tlcnNNYXRjaCA9IHNlY3Rpb24ubWF0Y2goL1xcKlxcKkJsb2NrZXJzOlxcKlxcKlxccyooLispLyk7XG5cdFx0XHRjb25zdCBuZXh0TWF0Y2ggPSBzZWN0aW9uLm1hdGNoKC9cXCpcXCpOZXh0OlxcKlxcKlxccyooLispLyk7XG5cdFx0XHRjb25zdCB1cGRhdGVkTWF0Y2ggPSBzZWN0aW9uLm1hdGNoKC9cXCpVcGRhdGVkOlxccyooLis/KVxcKi8pO1xuXG5cdFx0XHRjb25zdCByYXdTdGF0dXMgPSBzdGF0dXNNYXRjaD8uWzFdIHx8ICdJZGxlJztcblx0XHRcdGxldCBzdGF0dXMgPSAnSWRsZSc7XG5cdFx0XHRpZiAocmF3U3RhdHVzLnRvVXBwZXJDYXNlKCkuaW5jbHVkZXMoJ0JMT0NLRUQnKSkgc3RhdHVzID0gJ0Jsb2NrZWQnO1xuXHRcdFx0ZWxzZSBpZiAocmF3U3RhdHVzICE9PSAnSWRsZScgJiYgcmF3U3RhdHVzICE9PSAnLS0nKSBzdGF0dXMgPSAnV29ya2luZyc7XG5cblx0XHRcdGFnZW50cy5wdXNoKHsgbmFtZSwgc3RhdHVzLCB3b3JraW5nT246IHdvcmtpbmdNYXRjaD8uWzFdIHx8ICctLScsIGNvbXBsZXRlZDogY29tcGxldGVkTWF0Y2g/LlsxXSB8fCAnLS0nLCBibG9ja2VyczogYmxvY2tlcnNNYXRjaD8uWzFdIHx8ICdOb25lJywgbmV4dDogbmV4dE1hdGNoPy5bMV0gfHwgJy0tJywgdXBkYXRlZDogdXBkYXRlZE1hdGNoPy5bMV0gfHwgJy0tJyB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YWdlbnRzLnB1c2goeyBuYW1lLCBzdGF0dXM6ICdJZGxlJywgd29ya2luZ09uOiAnLS0nLCBjb21wbGV0ZWQ6ICctLScsIGJsb2NrZXJzOiAnTm9uZScsIG5leHQ6ICctLScsIHVwZGF0ZWQ6ICctLScgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGFnZW50cztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VIYW5kb2ZmcyhkaXJQYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgaGFuZG9mZnM6IGFueVtdID0gW107XG5cdGlmICghZXhpc3RzU3luYyhkaXJQYXRoKSkgcmV0dXJuIGhhbmRvZmZzO1xuXG5cdGNvbnN0IGZpbGVzID0gYXdhaXQgcmVhZGRpcihkaXJQYXRoKTtcblxuXHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5tZCcpIHx8IGZpbGUgPT09ICcuZ2l0a2VlcCcpIGNvbnRpbnVlO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShwYXRoLmpvaW4oZGlyUGF0aCwgZmlsZSksICd1dGYtOCcpO1xuXHRcdFx0Y29uc3QgdGl0bGVNYXRjaCA9IGNvbnRlbnQubWF0Y2goL14jICguKykvbSk7XG5cdFx0XHRjb25zdCBmaWxlbmFtZU1hdGNoID0gZmlsZS5tYXRjaCgvXihcXHcrKS10by0oW1xcdy1dKykvKTtcblxuXHRcdFx0bGV0IGZyb20gPSAndW5rbm93bicsIHRvID0gJ3Vua25vd24nO1xuXHRcdFx0aWYgKGZpbGVuYW1lTWF0Y2gpIHtcblx0XHRcdFx0ZnJvbSA9IGZpbGVuYW1lTWF0Y2hbMV0gPT09ICd0bCcgPyAndGVjaC1sZWFkJyA6IGZpbGVuYW1lTWF0Y2hbMV07XG5cdFx0XHRcdHRvID0gZmlsZW5hbWVNYXRjaFsyXTtcblx0XHRcdH1cblxuXHRcdFx0aGFuZG9mZnMucHVzaCh7IGlkOiBmaWxlLnJlcGxhY2UoJy5tZCcsICcnKSwgZmlsZW5hbWU6IGZpbGUsIHRpdGxlOiB0aXRsZU1hdGNoPy5bMV0gfHwgZmlsZS5yZXBsYWNlKCcubWQnLCAnJyksIGZyb20sIHRvLCBkYXRlOiAnJyB9KTtcblx0XHR9IGNhdGNoIChlKSB7IC8qIHNraXAgKi8gfVxuXHR9XG5cblx0cmV0dXJuIGhhbmRvZmZzO1xufVxuXG4vLyBXZWJTb2NrZXQgcGx1Z2luIGZvciBkZXYgbW9kZVxuZnVuY3Rpb24gd2ViU29ja2V0UGx1Z2luKCkge1xuXHRsZXQgd3NzOiBXZWJTb2NrZXRTZXJ2ZXIgfCBudWxsID0gbnVsbDtcblx0bGV0IGN1cnJlbnRTdGF0ZSA9IHsgYmFja2xvZzogeyBjb2x1bW5zOiB7fSB9LCBhZ2VudHM6IFtdIGFzIGFueVtdLCBoYW5kb2ZmczogW10gYXMgYW55W10gfTtcblx0Y29uc3QgREFUQV9ESVIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy4uL2FnZW5jeS9kYXRhJyk7XG5cblx0YXN5bmMgZnVuY3Rpb24gcGFyc2VBbGwoKSB7XG5cdFx0Y29uc3QgW2JhY2tsb2csIGFnZW50cywgaGFuZG9mZnNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuXHRcdFx0cGFyc2VCYWNrbG9nKHBhdGguam9pbihEQVRBX0RJUiwgJ2JhY2tsb2cubWQnKSksXG5cdFx0XHRwYXJzZVN0YW5kdXAocGF0aC5qb2luKERBVEFfRElSLCAnc3RhbmR1cC5tZCcpKSxcblx0XHRcdHBhcnNlSGFuZG9mZnMocGF0aC5qb2luKERBVEFfRElSLCAnaGFuZG9mZnMnKSlcblx0XHRdKTtcblx0XHRjdXJyZW50U3RhdGUgPSB7IGJhY2tsb2csIGFnZW50cywgaGFuZG9mZnMgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGJyb2FkY2FzdCgpIHtcblx0XHRpZiAoIXdzcykgcmV0dXJuO1xuXHRcdGNvbnN0IG1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICd1cGRhdGUnLCBkYXRhOiBjdXJyZW50U3RhdGUsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KTtcblx0XHR3c3MuY2xpZW50cy5mb3JFYWNoKGNsaWVudCA9PiB7XG5cdFx0XHRpZiAoY2xpZW50LnJlYWR5U3RhdGUgPT09IFdlYlNvY2tldC5PUEVOKSBjbGllbnQuc2VuZChtZXNzYWdlKTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bmFtZTogJ3dlYnNvY2tldC1wbHVnaW4nLFxuXHRcdGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXI6IGFueSkge1xuXHRcdFx0d3NzID0gbmV3IFdlYlNvY2tldFNlcnZlcih7IHNlcnZlcjogc2VydmVyLmh0dHBTZXJ2ZXIsIHBhdGg6ICcvd3MnIH0pO1xuXG5cdFx0XHR3c3Mub24oJ2Nvbm5lY3Rpb24nLCAod3MpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1tEZXYgV1NdIENsaWVudCBjb25uZWN0ZWQnKTtcblx0XHRcdFx0d3Muc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0aWFsJywgZGF0YTogY3VycmVudFN0YXRlLCB0aW1lc3RhbXA6IERhdGUubm93KCkgfSkpO1xuXHRcdFx0XHR3cy5vbignY2xvc2UnLCAoKSA9PiBjb25zb2xlLmxvZygnW0RldiBXU10gQ2xpZW50IGRpc2Nvbm5lY3RlZCcpKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBGaWxlIHdhdGNoZXJcblx0XHRcdGxldCBkZWJvdW5jZTogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcblx0XHRcdGNob2tpZGFyLndhdGNoKFtcblx0XHRcdFx0cGF0aC5qb2luKERBVEFfRElSLCAnYmFja2xvZy5tZCcpLFxuXHRcdFx0XHRwYXRoLmpvaW4oREFUQV9ESVIsICdzdGFuZHVwLm1kJyksXG5cdFx0XHRcdHBhdGguam9pbihEQVRBX0RJUiwgJ2hhbmRvZmZzJylcblx0XHRcdF0sIHsgaWdub3JlSW5pdGlhbDogdHJ1ZSwgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDMwMCB9IH0pXG5cdFx0XHQub24oJ2FsbCcsICgpID0+IHtcblx0XHRcdFx0aWYgKGRlYm91bmNlKSBjbGVhclRpbWVvdXQoZGVib3VuY2UpO1xuXHRcdFx0XHRkZWJvdW5jZSA9IHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRcdGF3YWl0IHBhcnNlQWxsKCk7XG5cdFx0XHRcdFx0YnJvYWRjYXN0KCk7XG5cdFx0XHRcdH0sIDIwMCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gSW5pdGlhbCBwYXJzZVxuXHRcdFx0cGFyc2VBbGwoKS50aGVuKCgpID0+IGNvbnNvbGUubG9nKGBbRGV2IFdTXSBXYXRjaGluZyAke0RBVEFfRElSfWApKTtcblx0XHR9XG5cdH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFtzdmVsdGVraXQoKSwgd2ViU29ja2V0UGx1Z2luKCldLFxuXHRzZXJ2ZXI6IHtcblx0XHRwb3J0OiAzMDAwXG5cdH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4VSxTQUFTLGlCQUFpQjtBQUN4VyxTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGlCQUFpQixpQkFBaUI7QUFDM0MsT0FBTyxjQUFjO0FBQ3JCLFNBQVMsVUFBVSxlQUFlO0FBQ2xDLFNBQVMsa0JBQWtCO0FBQzNCLE9BQU8sVUFBVTtBQUdqQixl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
