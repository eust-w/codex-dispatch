const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createDatabase, recoverInterruptedTasks } = require('../db/database');
const { QueueManager } = require('../worker/runner');
const { createApp } = require('../server/app');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatch-test-'));
  const db = createDatabase(path.join(dir, 'db.sqlite'));
  db.prepare("INSERT INTO projects VALUES ('p','P','',?,'now','now')").run(dir);
  db.prepare("INSERT INTO sessions VALUES ('s','p','S',NULL,0,'now','now')").run();
  for (let n = 1; n <= 2; n++) db.prepare("INSERT INTO tasks (id,session_id,prompt,status,position,created_at,updated_at) VALUES (?,'s','test','pending',?,'now','now')").run(String(n), n);
  t.after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { dir, db };
}

test('two managers cannot claim tasks concurrently in one session', t => {
  const { db } = fixture(t);
  const a = new QueueManager(db), b = new QueueManager(db);
  assert.equal(a.claimPendingTask('s').id, '1');
  assert.equal(b.claimPendingTask('s'), null);
});

test('crash recovery preserves pending work but never automatically replays running work', t => {
  const { db } = fixture(t);
  new QueueManager(db).claimPendingTask('s');
  assert.equal(recoverInterruptedTasks(db), 1);
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id='1'").get().status, 'error');
  assert.equal(db.prepare("SELECT status FROM tasks WHERE id='2'").get().status, 'pending');
});

test('exclusive instance lock fails closed and releases explicitly', t => {
  const { dir } = fixture(t);
  const { acquireInstanceLock } = require('../core/instance-lock');
  const release = acquireInstanceLock(dir);
  try { assert.throws(() => acquireInstanceLock(dir), /locked/i); } finally { release(); }
  acquireInstanceLock(dir)();
});

test('HTTP boundary rejects cross origin, forged Host and forged completion', async t => {
  const { db } = fixture(t);
  const queueManager = new QueueManager(db);
  queueManager.stop();
  const server = http.createServer(createApp({ db, queueManager }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/projects', { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(base + '/', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 200);
  assert.equal((await fetch(base + '/api/projects', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  const forgedHostStatus = await new Promise((resolve, reject) => {
    http.get(base + '/api/projects', { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(forgedHostStatus, 403);
  const put = body => fetch(base + '/api/tasks/1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await put({ status: 'done' })).status, 400);
  assert.equal((await put({ status: 'running' })).status, 400);
  assert.equal((await put({ prompt: 'a\u0000b' })).status, 400);
  assert.equal((await fetch(base + '/api/missing')).status, 404);
});
