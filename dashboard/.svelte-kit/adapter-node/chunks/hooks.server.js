import { g as building } from "./environment.js";
import chokidar from "chokidar";
import path from "path";
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
const VALID_STATUSES = [
  "READY",
  "IN_PROGRESS",
  "DONE",
  "QA_TESTING",
  "QA_PASSED",
  "QA_FAILED",
  "REVIEWING",
  "REVIEWED",
  "SHIPPED"
];
async function parseBacklog(filePath) {
  const columns = {};
  for (const status of VALID_STATUSES) {
    columns[status] = [];
  }
  if (!existsSync(filePath)) {
    return { columns };
  }
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  let currentTask = null;
  for (const line of lines) {
    const headerMatch = line.match(/^## (READY|IN_PROGRESS|DONE|QA_TESTING|QA_PASSED|QA_FAILED|REVIEWING|REVIEWED|SHIPPED):\s*(?:\[P(\d)\])?\s*(.+?)(?:\s+@(\S+))?$/);
    if (headerMatch) {
      if (currentTask && currentTask.status && currentTask.title) {
        const status2 = currentTask.status;
        columns[status2]?.push(currentTask);
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
      if (filesMatch) {
        currentTask.files = filesMatch[1].split(",").map((f) => f.trim());
        continue;
      }
      const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)$/);
      if (summaryMatch) {
        currentTask.summary = summaryMatch[1];
        continue;
      }
      const testedMatch = line.match(/^\*\*Tested:\*\*\s*(.+)$/);
      if (testedMatch) {
        currentTask.tested = testedMatch[1];
        continue;
      }
    }
  }
  if (currentTask && currentTask.status && currentTask.title) {
    const status = currentTask.status;
    columns[status]?.push(currentTask);
  }
  return { columns };
}
async function parseStandup(filePath) {
  const agents = [];
  if (!existsSync(filePath)) {
    return agents;
  }
  const content = await readFile(filePath, "utf-8");
  const agentNames = ["product-owner", "tech-lead", "dev-alpha", "dev-beta", "dev-gamma", "qa", "reviewer", "devops"];
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
      if (rawStatus.toUpperCase().includes("BLOCKED")) {
        status = "Blocked";
      } else if (rawStatus !== "Idle" && rawStatus !== "--") {
        status = "Working";
      }
      agents.push({
        name,
        status,
        workingOn: workingMatch?.[1] || "--",
        completed: completedMatch?.[1] || "--",
        blockers: blockersMatch?.[1] || "None",
        next: nextMatch?.[1] || "--",
        updated: updatedMatch?.[1] || "--"
      });
    } else {
      agents.push({
        name,
        status: "Idle",
        workingOn: "--",
        completed: "--",
        blockers: "None",
        next: "--",
        updated: "--"
      });
    }
  }
  return agents;
}
async function parseHandoffs(dirPath) {
  const handoffs = [];
  if (!existsSync(dirPath)) {
    return handoffs;
  }
  const files = await readdir(dirPath);
  for (const file of files) {
    if (!file.endsWith(".md") || file === ".gitkeep") continue;
    try {
      const content = await readFile(path.join(dirPath, file), "utf-8");
      const titleMatch = content.match(/^# (.+)/m);
      const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
      const filenameMatch = file.match(/^(\w+)-to-([\w-]+)/);
      let from = "unknown";
      let to = "unknown";
      if (filenameMatch) {
        from = filenameMatch[1] === "tl" ? "tech-lead" : filenameMatch[1];
        to = filenameMatch[2];
      }
      handoffs.push({
        id: file.replace(".md", ""),
        filename: file,
        title: titleMatch?.[1] || file.replace(".md", ""),
        from,
        to,
        date: dateMatch?.[1] || ""
      });
    } catch (e) {
      console.error(`Error parsing handoff ${file}:`, e);
    }
  }
  return handoffs;
}
const DATA_DIR = process.env.AGENCY_DATA_DIR || path.resolve(process.cwd(), "../agency/data");
class FileWatcher {
  watcher = null;
  callbacks = /* @__PURE__ */ new Set();
  currentState = {
    backlog: { columns: {} },
    agents: [],
    handoffs: []
  };
  debounceTimer = null;
  async start() {
    console.log(`[FileWatcher] Watching: ${DATA_DIR}`);
    const watchPaths = [
      path.join(DATA_DIR, "backlog.md"),
      path.join(DATA_DIR, "standup.md"),
      path.join(DATA_DIR, "handoffs")
    ];
    await this.parseAll();
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    this.watcher.on("add", (filePath) => this.handleChange(filePath)).on("change", (filePath) => this.handleChange(filePath)).on("unlink", (filePath) => this.handleChange(filePath));
    console.log("[FileWatcher] Started");
  }
  async parseAll() {
    try {
      const [backlog, agents, handoffs] = await Promise.all([
        parseBacklog(path.join(DATA_DIR, "backlog.md")),
        parseStandup(path.join(DATA_DIR, "standup.md")),
        parseHandoffs(path.join(DATA_DIR, "handoffs"))
      ]);
      this.currentState = { backlog, agents, handoffs };
    } catch (e) {
      console.error("[FileWatcher] Parse error:", e);
    }
  }
  handleChange(filePath) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      console.log(`[FileWatcher] Change detected: ${path.basename(filePath)}`);
      await this.parseAll();
      this.notifySubscribers();
    }, 200);
  }
  notifySubscribers() {
    for (const callback of this.callbacks) {
      try {
        callback(this.currentState);
      } catch (e) {
        console.error("[FileWatcher] Callback error:", e);
      }
    }
  }
  subscribe(callback) {
    this.callbacks.add(callback);
    callback(this.currentState);
    return () => this.callbacks.delete(callback);
  }
  getState() {
    return this.currentState;
  }
  stop() {
    this.watcher?.close();
    console.log("[FileWatcher] Stopped");
  }
}
const fileWatcher = new FileWatcher();
if (!building) {
  fileWatcher.start().catch(console.error);
  console.log("[Hooks] File watcher started");
}
