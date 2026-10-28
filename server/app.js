const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const { randomUUID } = require("node:crypto");
const { STATUSES, now } = require("../db/database");

function getString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function getBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}

function notFound(res, label) {
  return res.status(404).json({ error: `${label} not found` });
}

function serializeProject(row) {
  return row;
}

function normalizeProjectCwd(value) {
  const cwd = getString(value, process.cwd()) || process.cwd();
  const resolved = path.resolve(cwd);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    const error = new Error("project cwd must be an existing directory");
    error.statusCode = 400;
    throw error;
  }
  return resolved;
}

function serializeSession(row) {
  return row;
}

function serializeTask(row) {
  return row;
}

function createApp({ db, queueManager }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) ||
        (req.headers.origin && req.headers.origin !== `http://${host}`) ||
        (req.path.startsWith('/api') && req.headers['sec-fetch-site'] === 'cross-site')) {
      return res.status(403).json({ error: 'Only same-origin localhost requests are allowed' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && (!req.is('application/json') || !req.body || Array.isArray(req.body))) {
      return res.status(400).json({ error: 'A JSON object is required' });
    }
    if (typeof req.body?.prompt === 'string' && (req.body.prompt.includes('\0') || req.body.prompt.length > 24000)) {
      return res.status(400).json({ error: 'prompt must be at most 24000 characters without NUL bytes' });
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/projects", (req, res) => {
    const name = getString(req.body.name);
    if (!name) return res.status(400).json({ error: "name is required" });
    let cwd;
    try {
      cwd = normalizeProjectCwd(req.body.cwd);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
    const timestamp = now();
    const project = {
      id: randomUUID(),
      name,
      description: getString(req.body.description),
      cwd,
      created_at: timestamp,
      updated_at: timestamp
    };
    db.prepare(
      "INSERT INTO projects (id, name, description, cwd, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(project.id, project.name, project.description, project.cwd, project.created_at, project.updated_at);
    res.status(201).json(serializeProject(project));
  });

  app.get("/api/projects", (req, res) => {
    const projects = db
      .prepare(
        `SELECT p.*,
                COUNT(DISTINCT s.id) AS session_count,
                COUNT(t.id) AS task_count
         FROM projects p
         LEFT JOIN sessions s ON s.project_id = p.id
         LEFT JOIN tasks t ON t.session_id = s.id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      )
      .all();
    res.json(projects.map(serializeProject));
  });

  app.get("/api/projects/:id", (req, res) => {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) return notFound(res, "project");
    res.json(serializeProject(project));
  });

  app.put("/api/projects/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!existing) return notFound(res, "project");
    const name = getString(req.body.name, existing.name);
    if (!name) return res.status(400).json({ error: "name is required" });
    const description =
      typeof req.body.description === "string" ? req.body.description.trim() : existing.description;
    let cwd;
    try {
      cwd = normalizeProjectCwd(typeof req.body.cwd === "string" ? req.body.cwd : existing.cwd);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
    const timestamp = now();
    db.prepare("UPDATE projects SET name = ?, description = ?, cwd = ?, updated_at = ? WHERE id = ?").run(
      name,
      description,
      cwd,
      timestamp,
      existing.id
    );
    res.json(db.prepare("SELECT * FROM projects WHERE id = ?").get(existing.id));
  });

  app.delete("/api/projects/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!existing) return notFound(res, "project");
    const running = db
      .prepare(
        `SELECT t.id
         FROM tasks t
         JOIN sessions s ON s.id = t.session_id
         WHERE s.project_id = ? AND t.status = 'running'
         LIMIT 1`
      )
      .get(existing.id);
    if (running) return res.status(409).json({ error: "cannot delete a project with a running task" });
    db.prepare("DELETE FROM projects WHERE id = ?").run(existing.id);
    res.status(204).end();
  });

  app.post("/api/projects/:projectId/sessions", (req, res) => {
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.projectId);
    if (!project) return notFound(res, "project");
    const name = getString(req.body.name);
    if (!name) return res.status(400).json({ error: "name is required" });
    const timestamp = now();
    const session = {
      id: randomUUID(),
      project_id: project.id,
      name,
      active_task_id: null,
      shadow_context_enabled: getBoolean(req.body.shadow_context_enabled) ? 1 : 0,
      created_at: timestamp,
      updated_at: timestamp
    };
    db.prepare(
      `INSERT INTO sessions
       (id, project_id, name, active_task_id, shadow_context_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      session.id,
      session.project_id,
      session.name,
      session.active_task_id,
      session.shadow_context_enabled,
      session.created_at,
      session.updated_at
    );
    res.status(201).json(serializeSession(session));
  });

  app.get("/api/projects/:projectId/sessions", (req, res) => {
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.projectId);
    if (!project) return notFound(res, "project");
    const sessions = db
      .prepare(
        `SELECT s.*,
                COUNT(t.id) AS task_count,
                SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END) AS running_count
         FROM sessions s
         LEFT JOIN tasks t ON t.session_id = s.id
         WHERE s.project_id = ?
         GROUP BY s.id
         ORDER BY s.created_at DESC`
      )
      .all(project.id);
    res.json(sessions.map(serializeSession));
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = db
      .prepare(
        `SELECT s.*,
                COUNT(t.id) AS task_count,
                SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END) AS running_count
         FROM sessions s
         LEFT JOIN tasks t ON t.session_id = s.id
         WHERE s.id = ?
         GROUP BY s.id`
      )
      .get(req.params.id);
    if (!session) return notFound(res, "session");
    res.json(serializeSession(session));
  });

  app.put("/api/sessions/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
    if (!existing) return notFound(res, "session");
    const name = typeof req.body.name === "string" ? req.body.name.trim() : existing.name;
    if (!name) return res.status(400).json({ error: "name is required" });
    const shadowContextEnabled =
      req.body.shadow_context_enabled === undefined
        ? existing.shadow_context_enabled
        : getBoolean(req.body.shadow_context_enabled)
          ? 1
          : 0;
    const timestamp = now();
    db.prepare(
      `UPDATE sessions
       SET name = ?,
           shadow_context_enabled = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(name, shadowContextEnabled, timestamp, existing.id);
    res.json(db.prepare("SELECT * FROM sessions WHERE id = ?").get(existing.id));
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
    if (!existing) return notFound(res, "session");
    const running = db
      .prepare("SELECT id FROM tasks WHERE session_id = ? AND status = 'running'")
      .get(existing.id);
    if (running) return res.status(409).json({ error: "cannot delete a session with a running task" });
    db.prepare("DELETE FROM sessions WHERE id = ?").run(existing.id);
    res.status(204).end();
  });

  app.post("/api/sessions/:sessionId/tasks", (req, res) => {
    const session = db.prepare("SELECT id FROM sessions WHERE id = ?").get(req.params.sessionId);
    if (!session) return notFound(res, "session");
    const prompt = getString(req.body.prompt);
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const maxPosition = db
      .prepare("SELECT COALESCE(MAX(position), 0) AS max_position FROM tasks WHERE session_id = ?")
      .get(session.id);
    const timestamp = now();
    const task = {
      id: randomUUID(),
      session_id: session.id,
      prompt,
      status: "pending",
      result: "",
      stdout: "",
      stderr: "",
      error_message: "",
      position: maxPosition.max_position + 1,
      started_at: null,
      finished_at: null,
      created_at: timestamp,
      updated_at: timestamp
    };
    db.prepare(
      `INSERT INTO tasks
       (id, session_id, prompt, status, result, stdout, stderr, error_message, position, started_at, finished_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      task.id,
      task.session_id,
      task.prompt,
      task.status,
      task.result,
      task.stdout,
      task.stderr,
      task.error_message,
      task.position,
      task.started_at,
      task.finished_at,
      task.created_at,
      task.updated_at
    );
    queueManager.startSession(session.id);
    res.status(201).json(serializeTask(task));
  });

  app.get("/api/sessions/:sessionId/tasks", (req, res) => {
    const session = db.prepare("SELECT id FROM sessions WHERE id = ?").get(req.params.sessionId);
    if (!session) return notFound(res, "session");
    const tasks = db
      .prepare(
        `SELECT * FROM tasks
         WHERE session_id = ?
         ORDER BY position ASC, created_at ASC`
      )
      .all(session.id);
    res.json(tasks.map(serializeTask));
  });

  app.get("/api/tasks/:id", (req, res) => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) return notFound(res, "task");
    res.json(serializeTask(task));
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) return notFound(res, "task");
    if (task.status === "running") return res.status(409).json({ error: "cannot delete a running task" });
    db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
    res.status(204).end();
  });

  app.put("/api/tasks/:id", (req, res) => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) return notFound(res, "task");
    if (task.status === "running") return res.status(409).json({ error: "cannot edit a running task" });

    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : task.prompt;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const status = typeof req.body.status === "string" ? req.body.status : task.status;
    if (!STATUSES.has(status) || (status !== task.status && status !== 'pending')) {
      return res.status(400).json({ error: "Only the worker can mark tasks running, done or error" });
    }

    const timestamp = now();
    const resetExecution = status === "pending";
    db.prepare(
      `UPDATE tasks
       SET prompt = ?,
           status = ?,
           result = CASE WHEN ? THEN '' ELSE result END,
           stdout = CASE WHEN ? THEN '' ELSE stdout END,
           stderr = CASE WHEN ? THEN '' ELSE stderr END,
           error_message = CASE WHEN ? THEN '' ELSE error_message END,
           started_at = CASE WHEN ? THEN NULL ELSE started_at END,
           finished_at = CASE WHEN ? THEN NULL ELSE finished_at END,
           updated_at = ?
       WHERE id = ?`
    ).run(
      prompt,
      status,
      resetExecution ? 1 : 0,
      resetExecution ? 1 : 0,
      resetExecution ? 1 : 0,
      resetExecution ? 1 : 0,
      resetExecution ? 1 : 0,
      resetExecution ? 1 : 0,
      timestamp,
      task.id
    );
    if (status === "pending") queueManager.startSession(task.session_id);
    res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id));
  });

  app.post("/api/sessions/:sessionId/tasks/reorder", (req, res) => {
    const session = db.prepare("SELECT id FROM sessions WHERE id = ?").get(req.params.sessionId);
    if (!session) return notFound(res, "session");
    const taskIds = Array.isArray(req.body.taskIds) ? req.body.taskIds : req.body.orderedTaskIds;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds is required" });
    }
    if (new Set(taskIds).size !== taskIds.length) {
      return res.status(400).json({ error: "taskIds must be unique" });
    }

    const current = db
      .prepare("SELECT id FROM tasks WHERE session_id = ? ORDER BY position ASC, created_at ASC")
      .all(session.id)
      .map((row) => row.id);
    const currentSet = new Set(current);
    if (taskIds.some((id) => !currentSet.has(id))) {
      return res.status(400).json({ error: "all taskIds must belong to the session" });
    }

    const merged = [...taskIds, ...current.filter((id) => !taskIds.includes(id))];
    const timestamp = now();
    const updatePositions = db.transaction(() => {
      merged.forEach((id, index) => {
        db.prepare("UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?").run(
          index + 1,
          timestamp,
          id
        );
      });
    });
    updatePositions();
    const tasks = db
      .prepare("SELECT * FROM tasks WHERE session_id = ? ORDER BY position ASC, created_at ASC")
      .all(session.id);
    res.json(tasks.map(serializeTask));
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
  app.use(express.static(path.join(__dirname, "..", "web")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "web", "index.html"));
  });

  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({ error: error.status && error.status < 500 ? error.message : 'Internal server error' });
  });
  return app;
}

module.exports = {
  createApp
};
