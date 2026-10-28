const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const STATUSES = new Set(["pending", "running", "done", "error"]);

function now() {
  return new Date().toISOString();
}

function createDatabase(dbPath = path.join(process.cwd(), "data", "db.sqlite")) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cwd TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      active_task_id TEXT,
      shadow_context_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'error')),
      result TEXT NOT NULL DEFAULT '',
      stdout TEXT NOT NULL DEFAULT '',
      stderr TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_session_queue ON tasks(session_id, status, position, created_at);
  `);
  const projectColumns = db.prepare("PRAGMA table_info(projects)").all().map((column) => column.name);
  if (!projectColumns.includes("cwd")) {
    db.exec("ALTER TABLE projects ADD COLUMN cwd TEXT NOT NULL DEFAULT ''");
  }
  db.prepare("UPDATE projects SET cwd = ? WHERE cwd = ''").run(process.cwd());

  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name);
  if (!sessionColumns.includes("shadow_context_enabled")) {
    db.exec("ALTER TABLE sessions ADD COLUMN shadow_context_enabled INTEGER NOT NULL DEFAULT 0");
  }
}

function recoverInterruptedTasks(db) {
  const timestamp = now();
  db.prepare("UPDATE sessions SET active_task_id = NULL, updated_at = ? WHERE active_task_id IS NOT NULL").run(timestamp);
  const result = db
    .prepare(
      "UPDATE tasks SET status = 'error', error_message = 'Interrupted; inspect project changes before explicitly retrying.', finished_at = ?, updated_at = ? WHERE status = 'running'"
    )
    .run(timestamp, timestamp);
  return result.changes;
}

module.exports = {
  STATUSES,
  createDatabase,
  migrate,
  now,
  recoverInterruptedTasks
};
