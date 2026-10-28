const translations = {
  "zh-CN": {
    appSubtitle: "真实 Codex CLI 任务队列控制台",
    projects: "项目",
    projectsHint: "工作目录与会话入口",
    sessions: "会话",
    taskQueue: "任务队列",
    refresh: "刷新",
    newProjectName: "新项目名称",
    projectDirectory: "项目目录",
    projectDirectoryPlaceholder: "项目目录，默认当前启动目录",
    description: "描述",
    createProject: "创建项目",
    selectProject: "选择一个项目",
    newSessionName: "新会话名称",
    enableShadowContext: "启用 Shadow Context",
    shadowContext: "Shadow Context",
    shadowOn: "上下文开启",
    shadowOff: "上下文关闭",
    shadowContextHint: "后续任务会自动带入前面已完成任务的精简上下文。",
    toggleShadowOn: "开启上下文",
    toggleShadowOff: "关闭上下文",
    shadowUsed: "使用了 Shadow Context · {count} 个前置任务",
    createSession: "创建会话",
    selectSession: "选择一个会话",
    taskPromptPlaceholder: '将通过 codex exec "prompt" 执行的 Prompt',
    enqueueTask: "加入队列",
    noProjects: "还没有项目。",
    noProjectSelected: "选择一个项目以查看会话。",
    noSessions: "该项目下还没有会话。",
    noSessionSelected: "选择一个会话以查看 FIFO 队列。",
    noTasks: "该会话下还没有任务。",
    sessionCount: "{count} 个会话",
    taskCount: "{count} 个任务",
    pendingCount: "{count} 个等待中",
    runningCount: "{count} 个运行中",
    queueSummary: "{pending} 等待中 · {running} 运行中",
    globalStats: "{projects} 项目 · {sessions} 会话 · {tasks} 任务",
    filterAll: "全部",
    copyOutput: "复制结果",
    copied: "已复制到剪贴板",
    rename: "重命名",
    editProject: "编辑项目",
    delete: "删除",
    save: "保存",
    runAgain: "重新运行",
    moveUp: "上移",
    moveDown: "下移",
    projectNamePrompt: "项目名称",
    confirmDeleteProject: '删除项目 "{name}" 以及所有会话和任务？',
    confirmDeleteSession: '删除会话 "{name}" 以及所有任务？',
    confirmDeleteTask: "删除这个任务？",
    created: "创建于",
    started: "开始于",
    finished: "完成于",
    resultTitle: "执行结果",
    resultStdout: "标准输出",
    resultStderr: "错误输出 / 运行日志",
    resultCommand: "执行命令",
    resultFullLog: "完整 JSON 日志",
    resultExit: "退出码 {code}",
    resultRunning: "正在执行 codex exec，结果会在子进程返回后写入 SQLite。",
    resultPending: "等待执行，FIFO 前面的任务完成后会开始。",
    resultEmpty: "暂无输出。",
    requestFailed: "请求失败",
    status: {
      pending: "等待中",
      running: "运行中",
      done: "完成",
      error: "错误"
    }
  },
  en: {
    appSubtitle: "Real Codex CLI task queue console",
    projects: "Projects",
    projectsHint: "Working directories and sessions",
    sessions: "Sessions",
    taskQueue: "Task Queue",
    refresh: "Refresh",
    newProjectName: "New project name",
    projectDirectory: "Project directory",
    projectDirectoryPlaceholder: "Project directory, defaults to launch directory",
    description: "Description",
    createProject: "Create Project",
    selectProject: "Select a project",
    newSessionName: "New session name",
    enableShadowContext: "Enable Shadow Context",
    shadowContext: "Shadow Context",
    shadowOn: "context on",
    shadowOff: "context off",
    shadowContextHint: "Later tasks receive compact context from previously completed tasks.",
    toggleShadowOn: "Turn context on",
    toggleShadowOff: "Turn context off",
    shadowUsed: "Shadow Context used · {count} previous tasks",
    createSession: "Create Session",
    selectSession: "Select a session",
    taskPromptPlaceholder: 'Prompt to run with: codex exec "prompt"',
    enqueueTask: "Enqueue Task",
    noProjects: "No projects yet.",
    noProjectSelected: "Select a project to view sessions.",
    noSessions: "No sessions in this project.",
    noSessionSelected: "Select a session to view the FIFO queue.",
    noTasks: "No tasks queued for this session.",
    sessionCount: "{count} sessions",
    taskCount: "{count} tasks",
    pendingCount: "{count} pending",
    runningCount: "{count} running",
    queueSummary: "{pending} pending · {running} running",
    globalStats: "{projects} projects · {sessions} sessions · {tasks} tasks",
    filterAll: "All",
    copyOutput: "Copy output",
    copied: "Copied to clipboard",
    rename: "Rename",
    editProject: "Edit Project",
    delete: "Delete",
    save: "Save",
    runAgain: "Run Again",
    moveUp: "Up",
    moveDown: "Down",
    projectNamePrompt: "Project name",
    confirmDeleteProject: 'Delete project "{name}" and all sessions/tasks?',
    confirmDeleteSession: 'Delete session "{name}" and all tasks?',
    confirmDeleteTask: "Delete this task?",
    created: "created",
    started: "started",
    finished: "finished",
    resultTitle: "Execution result",
    resultStdout: "stdout",
    resultStderr: "stderr / run log",
    resultCommand: "Command",
    resultFullLog: "Full JSON log",
    resultExit: "exit {code}",
    resultRunning: "codex exec is running. Output is persisted to SQLite when the child process returns.",
    resultPending: "Pending. This task starts after earlier FIFO tasks finish.",
    resultEmpty: "No output yet.",
    requestFailed: "Request failed",
    status: {
      pending: "pending",
      running: "running",
      done: "done",
      error: "error"
    }
  }
};

function getInitialLanguage() {
  const saved = localStorage.getItem("codexQueue.language");
  if (saved && translations[saved]) return saved;
  return "zh-CN";
}

const state = {
  projects: [],
  sessions: [],
  tasks: [],
  selectedProjectId: localStorage.getItem("codexQueue.projectId") || "",
  selectedSessionId: localStorage.getItem("codexQueue.sessionId") || "",
  taskFilter: localStorage.getItem("codexQueue.taskFilter") || "all",
  language: getInitialLanguage()
};

const el = {
  projects: document.getElementById("projects"),
  sessions: document.getElementById("sessions"),
  tasks: document.getElementById("tasks"),
  projectForm: document.getElementById("projectForm"),
  sessionForm: document.getElementById("sessionForm"),
  taskForm: document.getElementById("taskForm"),
  refreshButton: document.getElementById("refreshButton"),
  languageSelect: document.getElementById("languageSelect"),
  globalStats: document.getElementById("globalStats"),
  taskFilters: document.getElementById("taskFilters"),
  selectedProjectName: document.getElementById("selectedProjectName"),
  selectedSessionName: document.getElementById("selectedSessionName"),
  queueSummary: document.getElementById("queueSummary"),
  toast: document.getElementById("toast")
};

function t(key, params = {}) {
  const parts = key.split(".");
  let value = translations[state.language];
  for (const part of parts) {
    value = value ? value[part] : undefined;
  }
  if (typeof value !== "string") value = key;
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

function applyI18n() {
  document.documentElement.lang = state.language;
  el.languageSelect.value = state.language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `${t("requestFailed")}: ${response.status}`);
  }
  return payload;
}

function showToast(message, type = "error") {
  el.toast.hidden = false;
  el.toast.className = `toast ${type}`;
  el.toast.textContent = message;
  setTimeout(() => {
    el.toast.hidden = true;
  }, 5000);
}

function showError(error) {
  showToast(error.message || String(error), "error");
}

function button(labelKey, className = "secondary") {
  return `<button type="button" class="${className}" data-action="${labelKey}">${t(labelKey)}</button>`;
}

function statusBadge(status) {
  return `<span class="status ${status}">${t(`status.${status}`)}</span>`;
}

function parseTaskResult(task) {
  if (!task.result) {
    return {
      status: task.status,
      command: "",
      cwd: "",
      exitCode: "",
      stdout: task.stdout || "",
      stderr: task.stderr || "",
      raw: ""
    };
  }
  try {
    const parsed = JSON.parse(task.result);
    return {
      status: parsed.status || task.status,
      command: parsed.command || "",
      cwd: parsed.cwd || "",
    exitCode: parsed.exitCode ?? "",
      shadowContextEnabled: !!parsed.shadowContextEnabled,
      shadowContextTaskCount: Number(parsed.shadowContextTaskCount || 0),
      stdout: parsed.stdout || task.stdout || "",
      stderr: parsed.stderr || task.stderr || "",
      raw: task.result
    };
  } catch {
    return {
      status: task.status,
      command: "",
      cwd: "",
      exitCode: "",
      shadowContextEnabled: false,
      shadowContextTaskCount: 0,
      stdout: task.stdout || "",
      stderr: task.stderr || "",
      raw: task.result
    };
  }
}

function taskResultBlock(task) {
  const parsed = parseTaskResult(task);
  const primaryOutput = parsed.stdout || parsed.stderr || task.error_message || parsed.raw;
  if (primaryOutput) {
    const outputLabel = parsed.stdout ? t("resultStdout") : t("resultStderr");
    return `
      <div class="result-shell">
        <div class="result-head">
          <span>${t("resultTitle")}</span>
          <div class="result-actions">
            ${parsed.exitCode !== "" ? `<span class="result-exit">${t("resultExit", { code: parsed.exitCode })}</span>` : ""}
            <button type="button" class="secondary tiny" data-action="copyResult">${t("copyOutput")}</button>
          </div>
        </div>
        ${
          parsed.shadowContextEnabled
            ? `<div class="shadow-note">${t("shadowUsed", { count: parsed.shadowContextTaskCount })}</div>`
            : ""
        }
        ${
          parsed.command
            ? `<div class="result-command"><span>${t("resultCommand")}</span><code>${escapeHtml(parsed.command)}</code></div>`
            : ""
        }
        ${parsed.cwd ? `<div class="result-cwd">${escapeHtml(parsed.cwd)}</div>` : ""}
        <div class="result-label">${outputLabel}</div>
        <pre class="result">${escapeHtml(primaryOutput)}</pre>
        ${
          parsed.raw
            ? `<details class="result-details"><summary>${t("resultFullLog")}</summary><pre>${escapeHtml(parsed.raw)}</pre></details>`
            : ""
        }
      </div>`;
  }
  const message =
    task.status === "running"
      ? t("resultRunning")
      : task.status === "pending"
        ? t("resultPending")
        : t("resultEmpty");
  return `
    <div class="result-shell">
      <div class="result-label">${t("resultTitle")}</div>
      <div class="result-placeholder">${message}</div>
    </div>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}


function renderProjects() {
  if (state.projects.length === 0) {
    el.projects.innerHTML = `<div class="empty">${t("noProjects")}</div>`;
    return;
  }
  el.projects.innerHTML = state.projects
    .map(
      (project) => `
      <article class="row ${project.id === state.selectedProjectId ? "selected" : ""}" data-project-id="${project.id}">
        <div class="row-title">
          <span>${escapeHtml(project.name)}</span>
        </div>
        <div class="row-meta">
          <span>${t("sessionCount", { count: Number(project.session_count || 0) })}</span>
          <span>${t("taskCount", { count: Number(project.task_count || 0) })}</span>
        </div>
        <div class="row-path">${escapeHtml(project.cwd || "")}</div>
        ${project.description ? `<p class="row-meta">${escapeHtml(project.description)}</p>` : ""}
        <div class="row-actions">
          ${button("editProject")}
          ${button("delete", "danger")}
        </div>
      </article>`
    )
    .join("");
}

function renderGlobalStats() {
  const sessionCount = state.projects.reduce((sum, project) => sum + Number(project.session_count || 0), 0);
  const taskCount = state.projects.reduce((sum, project) => sum + Number(project.task_count || 0), 0);
  el.globalStats.innerHTML = `
    <span>${t("globalStats", {
      projects: state.projects.length,
      sessions: sessionCount,
      tasks: taskCount
    })}</span>
  `;
}

function renderTaskFilters(counts) {
  const filters = [
    ["all", t("filterAll"), state.tasks.length],
    ["pending", t("status.pending"), counts.pending || 0],
    ["running", t("status.running"), counts.running || 0],
    ["done", t("status.done"), counts.done || 0],
    ["error", t("status.error"), counts.error || 0]
  ];
  el.taskFilters.innerHTML = filters
    .map(
      ([key, label, count]) =>
        `<button type="button" class="filter-chip ${state.taskFilter === key ? "active" : ""}" data-filter="${key}">${label}<span>${count}</span></button>`
    )
    .join("");
}

function renderSessions() {
  const project = state.projects.find((item) => item.id === state.selectedProjectId);
  el.selectedProjectName.textContent = project ? `${project.name} · ${project.cwd || ""}` : t("selectProject");
  el.sessionForm.querySelector("button").disabled = !project;
  el.sessionForm.querySelector("input").disabled = !project;

  if (!project) {
    el.sessions.innerHTML = `<div class="empty">${t("noProjectSelected")}</div>`;
    return;
  }
  if (state.sessions.length === 0) {
    el.sessions.innerHTML = `<div class="empty">${t("noSessions")}</div>`;
    return;
  }
  el.sessions.innerHTML = state.sessions
    .map(
      (session) => `
      <article class="row ${session.id === state.selectedSessionId ? "selected" : ""}" data-session-id="${session.id}">
        <div class="row-title">
          <span>${escapeHtml(session.name)}</span>
          <span class="context-badge ${session.shadow_context_enabled ? "on" : ""}">${
            session.shadow_context_enabled ? t("shadowOn") : t("shadowOff")
          }</span>
        </div>
        <div class="row-meta">
          <span>${t("taskCount", { count: Number(session.task_count || 0) })}</span>
          <span>${t("pendingCount", { count: Number(session.pending_count || 0) })}</span>
          <span>${t("runningCount", { count: Number(session.running_count || 0) })}</span>
        </div>
        ${
          session.shadow_context_enabled
            ? `<div class="row-hint">${t("shadowContextHint")}</div>`
            : ""
        }
        <div class="row-actions">
          ${button(session.shadow_context_enabled ? "toggleShadowOff" : "toggleShadowOn")}
          ${button("rename")}
          ${button("delete", "danger")}
        </div>
      </article>`
    )
    .join("");
}

const taskDrafts = new Map();

function renderTasks() {
  if (el.tasks.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA') return;
  const session = state.sessions.find((item) => item.id === state.selectedSessionId);
  el.selectedSessionName.textContent = session ? session.name : t("selectSession");
  el.taskForm.querySelector("button").disabled = !session;
  el.taskForm.querySelector("textarea").disabled = !session;

  if (!session) {
    el.queueSummary.textContent = "";
    el.taskFilters.innerHTML = "";
    el.tasks.innerHTML = `<div class="empty">${t("noSessionSelected")}</div>`;
    return;
  }

  const counts = state.tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
  renderTaskFilters(counts);
  el.queueSummary.textContent = t("queueSummary", {
    pending: counts.pending || 0,
    running: counts.running || 0
  });

  const visibleTasks =
    state.taskFilter === "all" ? state.tasks : state.tasks.filter((task) => task.status === state.taskFilter);

  if (state.tasks.length === 0) {
    el.tasks.innerHTML = `<div class="empty">${t("noTasks")}</div>`;
    return;
  }

  if (visibleTasks.length === 0) {
    el.tasks.innerHTML = `<div class="empty">${t("noTasks")}</div>`;
    return;
  }

  el.tasks.innerHTML = visibleTasks
    .map((task) => {
      const isRunning = task.status === "running";
      const fullIndex = state.tasks.findIndex((item) => item.id === task.id);
      return `
        <article class="task" data-task-id="${task.id}">
          <div class="task-title">
            <span>#${task.position}</span>
            ${statusBadge(task.status)}
          </div>
          <textarea ${isRunning ? "disabled" : ""}>${escapeHtml(taskDrafts.get(task.id) ?? task.prompt)}</textarea>
          <div class="task-meta">
            <span>${t("created")} ${escapeHtml(task.created_at)}</span>
            ${task.started_at ? `<span>${t("started")} ${escapeHtml(task.started_at)}</span>` : ""}
            ${task.finished_at ? `<span>${t("finished")} ${escapeHtml(task.finished_at)}</span>` : ""}
          </div>
          <div class="task-actions">
            ${button("save")}
            ${button("runAgain")}
            <button type="button" class="secondary move-up" data-action="moveUp" ${fullIndex === 0 ? "disabled" : ""}>${t("moveUp")}</button>
            <button type="button" class="secondary move-down" data-action="moveDown" ${fullIndex === state.tasks.length - 1 ? "disabled" : ""}>${t("moveDown")}</button>
            ${button("delete", "danger")}
          </div>
          ${taskResultBlock(task)}
        </article>`;
    })
    .join("");
}

function render() {
  applyI18n();
  renderGlobalStats();
  renderProjects();
  renderSessions();
  renderTasks();
}

async function refresh() {
  state.projects = await api("/api/projects");
  if (!state.projects.some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0] ? state.projects[0].id : "";
    localStorage.setItem("codexQueue.projectId", state.selectedProjectId);
  }

  if (state.selectedProjectId) {
    state.sessions = await api(`/api/projects/${state.selectedProjectId}/sessions`);
  } else {
    state.sessions = [];
  }

  if (!state.sessions.some((session) => session.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0] ? state.sessions[0].id : "";
    localStorage.setItem("codexQueue.sessionId", state.selectedSessionId);
  }

  if (state.selectedSessionId) {
    state.tasks = await api(`/api/sessions/${state.selectedSessionId}/tasks`);
  } else {
    state.tasks = [];
  }

  render();
}

el.projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.projectForm);
  try {
    const project = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        cwd: form.get("cwd"),
        description: form.get("description")
      })
    });
    state.selectedProjectId = project.id;
    localStorage.setItem("codexQueue.projectId", project.id);
    el.projectForm.reset();
    await refresh();
  } catch (error) {
    showError(error);
  }
});

el.sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedProjectId) return;
  const form = new FormData(el.sessionForm);
  try {
    const session = await api(`/api/projects/${state.selectedProjectId}/sessions`, {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        shadow_context_enabled: form.get("shadow_context_enabled") === "on"
      })
    });
    state.selectedSessionId = session.id;
    localStorage.setItem("codexQueue.sessionId", session.id);
    el.sessionForm.reset();
    await refresh();
  } catch (error) {
    showError(error);
  }
});

el.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedSessionId) return;
  const form = new FormData(el.taskForm);
  try {
    await api(`/api/sessions/${state.selectedSessionId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ prompt: form.get("prompt") })
    });
    el.taskForm.reset();
    await refresh();
  } catch (error) {
    showError(error);
  }
});

el.projects.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-project-id]");
  if (!row) return;
  const projectId = row.dataset.projectId;
  const project = state.projects.find((item) => item.id === projectId);
  try {
    if (event.target.dataset.action === "delete") {
      if (confirm(t("confirmDeleteProject", { name: project.name }))) {
        await api(`/api/projects/${projectId}`, { method: "DELETE" });
        await refresh();
      }
      return;
    }
    if (event.target.dataset.action === "editProject") {
      const name = prompt(t("projectNamePrompt"), project.name);
      if (name) {
        const cwd = prompt(t("projectDirectory"), project.cwd || "");
        if (!cwd) return;
        await api(`/api/projects/${projectId}`, {
          method: "PUT",
          body: JSON.stringify({ name, cwd, description: project.description || "" })
        });
        await refresh();
      }
      return;
    }
    state.selectedProjectId = projectId;
    state.selectedSessionId = "";
    localStorage.setItem("codexQueue.projectId", projectId);
    localStorage.removeItem("codexQueue.sessionId");
    await refresh();
  } catch (error) {
    showError(error);
  }
});

el.sessions.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-session-id]");
  if (!row) return;
  const sessionId = row.dataset.sessionId;
  const session = state.sessions.find((item) => item.id === sessionId);
  try {
    if (event.target.dataset.action === "delete") {
      if (confirm(t("confirmDeleteSession", { name: session.name }))) {
        await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
        await refresh();
      }
      return;
    }
    if (event.target.dataset.action === "toggleShadowOn" || event.target.dataset.action === "toggleShadowOff") {
      await api(`/api/sessions/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: session.name,
          shadow_context_enabled: !session.shadow_context_enabled
        })
      });
      await refresh();
      return;
    }
    if (event.target.dataset.action === "rename") {
      const name = prompt(t("newSessionName"), session.name);
      if (!name) return;
      await api(`/api/sessions/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          shadow_context_enabled: session.shadow_context_enabled
        })
      });
      await refresh();
      return;
    }
    state.selectedSessionId = sessionId;
    localStorage.setItem("codexQueue.sessionId", sessionId);
    await refresh();
  } catch (error) {
    showError(error);
  }
});

el.tasks.addEventListener('input', event => {
  if (event.target.tagName === 'TEXTAREA') taskDrafts.set(event.target.closest('[data-task-id]').dataset.taskId, event.target.value);
});

el.tasks.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-task-id]");
  if (!row) return;
  const taskId = row.dataset.taskId;
  const task = state.tasks.find((item) => item.id === taskId);
  const promptValue = row.querySelector("textarea").value;
  const action = event.target.dataset.action;
  try {
    if (action === "delete") {
      if (confirm(t("confirmDeleteTask"))) {
        await api(`/api/tasks/${taskId}`, { method: "DELETE" });
        taskDrafts.delete(taskId);
        await refresh();
      }
      return;
    }
    if (action === "save") {
      await api(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ prompt: promptValue, status: task.status })
      });
      taskDrafts.delete(taskId);
      await refresh();
      return;
    }
    if (action === "runAgain") {
      await api(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ prompt: promptValue, status: "pending" })
      });
      await refresh();
      return;
    }
    if (action === "copyResult") {
      const parsed = parseTaskResult(task);
      const output = parsed.stdout || parsed.stderr || task.error_message || parsed.raw || "";
      await copyText(output);
      showToast(t("copied"), "info");
      return;
    }
    if (action === "moveUp" || action === "moveDown") {
      const ids = state.tasks.map((item) => item.id);
      const index = ids.indexOf(taskId);
      const direction = action === "moveUp" ? -1 : 1;
      const target = index + direction;
      if (target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      await api(`/api/sessions/${state.selectedSessionId}/tasks/reorder`, {
        method: "POST",
        body: JSON.stringify({ taskIds: ids })
      });
      await refresh();
    }
  } catch (error) {
    showError(error);
  }
});

el.taskFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.taskFilter = button.dataset.filter;
  localStorage.setItem("codexQueue.taskFilter", state.taskFilter);
  renderTasks();
});

el.languageSelect.addEventListener("change", () => {
  state.language = el.languageSelect.value;
  localStorage.setItem("codexQueue.language", state.language);
  render();
});

el.refreshButton.addEventListener("click", () => {
  refresh().catch(showError);
});

applyI18n();
refresh().catch(showError);
setInterval(() => {
  refresh().catch(showError);
}, 2000);
