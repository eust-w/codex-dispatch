const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createDatabase } = require("../db/database");

test("creates a real SQLite file with required tables", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-queue-db-"));
  const dbPath = path.join(dir, "data", "db.sqlite");
  const db = createDatabase(dbPath);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.equal(fs.existsSync(dbPath), true);
  assert.deepEqual(tables.filter((name) => ["projects", "sessions", "tasks"].includes(name)), [
    "projects",
    "sessions",
    "tasks"
  ]);
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name);
  assert.equal(sessionColumns.includes("shadow_context_enabled"), true);

  db.close();
});
