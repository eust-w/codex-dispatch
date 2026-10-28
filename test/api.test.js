const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { createDatabase } = require("../db/database");
const { createApp } = require("../server/app");

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function request(url, pathName, options = {}) {
  const response = await fetch(`${url}${pathName}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test("project and session REST CRUD persist to SQLite", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-queue-api-"));
  const db = createDatabase(path.join(dir, "data", "db.sqlite"));
  const app = createApp({
    db,
    queueManager: {
      startSession() {}
    }
  });
  const { server, url } = await listen(app);
  t.after(() => {
    server.close();
    db.close();
  });

  const createdProject = await request(url, "/api/projects", {
    method: "POST",
    body: JSON.stringify({ name: "Queue Project", description: "real sqlite" })
  });
  assert.equal(createdProject.response.status, 201);
  assert.equal(createdProject.body.name, "Queue Project");

  const listedProjects = await request(url, "/api/projects");
  assert.equal(listedProjects.body.length, 1);
  assert.equal(listedProjects.body[0].session_count, 0);

  const createdSession = await request(url, `/api/projects/${createdProject.body.id}/sessions`, {
    method: "POST",
    body: JSON.stringify({ name: "Main Session", shadow_context_enabled: true })
  });
  assert.equal(createdSession.response.status, 201);
  assert.equal(createdSession.body.project_id, createdProject.body.id);
  assert.equal(createdSession.body.shadow_context_enabled, 1);

  const listedSessions = await request(url, `/api/projects/${createdProject.body.id}/sessions`);
  assert.equal(listedSessions.body.length, 1);
  assert.equal(listedSessions.body[0].name, "Main Session");
  assert.equal(listedSessions.body[0].shadow_context_enabled, 1);

  const updatedSession = await request(url, `/api/sessions/${createdSession.body.id}`, {
    method: "PUT",
    body: JSON.stringify({ name: "Main Session", shadow_context_enabled: false })
  });
  assert.equal(updatedSession.response.status, 200);
  assert.equal(updatedSession.body.shadow_context_enabled, 0);

  const readSession = await request(url, `/api/sessions/${createdSession.body.id}`);
  assert.equal(readSession.response.status, 200);
  assert.equal(readSession.body.id, createdSession.body.id);
  assert.equal(readSession.body.task_count, 0);

  const updatedProject = await request(url, `/api/projects/${createdProject.body.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: "Queue Project Updated",
      description: "updated description",
      cwd: dir
    })
  });
  assert.equal(updatedProject.response.status, 200);
  assert.equal(updatedProject.body.name, "Queue Project Updated");
  assert.equal(updatedProject.body.description, "updated description");
  assert.equal(updatedProject.body.cwd, dir);

  const createdTaskA = await request(url, `/api/sessions/${createdSession.body.id}/tasks`, {
    method: "POST",
    body: JSON.stringify({ prompt: "first task" })
  });
  assert.equal(createdTaskA.response.status, 201);
  assert.equal(createdTaskA.body.position, 1);

  const createdTaskB = await request(url, `/api/sessions/${createdSession.body.id}/tasks`, {
    method: "POST",
    body: JSON.stringify({ prompt: "second task" })
  });
  assert.equal(createdTaskB.response.status, 201);
  assert.equal(createdTaskB.body.position, 2);

  const readTask = await request(url, `/api/tasks/${createdTaskA.body.id}`);
  assert.equal(readTask.response.status, 200);
  assert.equal(readTask.body.prompt, "first task");

  const updatedTask = await request(url, `/api/tasks/${createdTaskA.body.id}`, {
    method: "PUT",
    body: JSON.stringify({ prompt: "first task updated", status: "pending" })
  });
  assert.equal(updatedTask.response.status, 200);
  assert.equal(updatedTask.body.prompt, "first task updated");
  assert.equal(updatedTask.body.status, "pending");

  const duplicateReorder = await request(url, `/api/sessions/${createdSession.body.id}/tasks/reorder`, {
    method: "POST",
    body: JSON.stringify({ taskIds: [createdTaskB.body.id, createdTaskB.body.id] })
  });
  assert.equal(duplicateReorder.response.status, 400);

  const reorderedTasks = await request(url, `/api/sessions/${createdSession.body.id}/tasks/reorder`, {
    method: "POST",
    body: JSON.stringify({ taskIds: [createdTaskB.body.id, createdTaskA.body.id] })
  });
  assert.equal(reorderedTasks.response.status, 200);
  assert.deepEqual(
    reorderedTasks.body.map((task) => task.id),
    [createdTaskB.body.id, createdTaskA.body.id]
  );

  const deletedTask = await request(url, `/api/tasks/${createdTaskA.body.id}`, { method: "DELETE" });
  assert.equal(deletedTask.response.status, 204);
  const missingTask = await request(url, `/api/tasks/${createdTaskA.body.id}`);
  assert.equal(missingTask.response.status, 404);

  const deletedSession = await request(url, `/api/sessions/${createdSession.body.id}`, { method: "DELETE" });
  assert.equal(deletedSession.response.status, 204);
  const missingSession = await request(url, `/api/sessions/${createdSession.body.id}`);
  assert.equal(missingSession.response.status, 404);

  const deleteProject = await request(url, `/api/projects/${createdProject.body.id}`, { method: "DELETE" });
  assert.equal(deleteProject.response.status, 204);
  const missingProject = await request(url, `/api/projects/${createdProject.body.id}`);
  assert.equal(missingProject.response.status, 404);
});
