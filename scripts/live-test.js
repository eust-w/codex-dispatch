// Opt-in integration test: spends real Codex quota; never substitutes a fake executable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: sleep } = require('node:timers/promises');
const { createDatabase } = require('../db/database');
const { execCodex } = require('../worker/runner');

async function main() {
  execFileSync('codex', ['--version']);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatch-live-'));
  execFileSync('git', ['init', root]);
  let child, base;
  async function start() {
    child = spawn(process.execPath, [path.resolve(__dirname, '../bin.js')], {
      cwd: root, env: { ...process.env, CODEX_QUEUE_NO_OPEN: '1', CODEX_QUEUE_PORT: '3470', CODEX_QUEUE_EXEC_TIMEOUT_MS: '120000' }, stdio: ['ignore','pipe','pipe']
    });
    base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timeout')), 10000);
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
      child.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.stderr.on('data', data => process.stderr.write(data));
    });
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  async function api(route, method = 'GET', body) {
    const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    assert.ok(r.ok, `${method} ${route}: ${r.status}`);
    return r.status === 204 ? null : r.json();
  }
  async function waitTasks(session, expected) {
    const until = Date.now() + 260000;
    while (Date.now() < until) {
      const rows = await api(`/api/sessions/${session}/tasks`);
      if (rows.length === expected && rows.every(t => ['done','error'].includes(t.status))) return rows;
      await sleep(500);
    }
    throw new Error('Real CLI tasks did not complete within deadline');
  }
  try {
    await start();
    const p = await api('/api/projects','POST',{ name:'Dispatch real verification', cwd:root });
    const a = await api(`/api/projects/${p.id}/sessions`,'POST',{ name:'FIFO + context', shadow_context_enabled:true });
    const b = await api(`/api/projects/${p.id}/sessions`,'POST',{ name:'Parallel session' });
    await api(`/api/sessions/${a.id}/tasks`,'POST',{ prompt:'Do not use tools or edit files. Reply exactly: DISPATCH_AMBER_731' });
    await api(`/api/sessions/${a.id}/tasks`,'POST',{ prompt:'Do not use tools or edit files. Reply with only the exact verification string from the previous task output provided in shadow_context.' });
    await api(`/api/sessions/${b.id}/tasks`,'POST',{ prompt:'Do not use tools or edit files. Reply exactly: DISPATCH_PARALLEL_OK' });
    const first = await waitTasks(a.id,2), parallel = await waitTasks(b.id,1);
    assert.deepEqual(first.map(t => t.status), ['done','done']);
    assert.equal(parallel[0].status,'done');
    assert.match(first[0].stdout,/DISPATCH_AMBER_731/);
    assert.match(first[1].stdout,/DISPATCH_AMBER_731/);
    assert.match(parallel[0].stdout,/DISPATCH_PARALLEL_OK/);
    assert.ok(first[1].started_at >= first[0].finished_at);
    assert.ok(parallel[0].started_at < first[0].finished_at);
    assert.equal(JSON.parse(first[1].result).shadowContextTaskCount,1);
    await stop();
    await start();
    assert.equal((await api(`/api/sessions/${a.id}/tasks`))[1].stdout, first[1].stdout);
    const c = await api(`/api/projects/${p.id}/sessions`,'POST',{name:'Restart recovery'});
    await api(`/api/sessions/${c.id}/tasks`,'POST',{prompt:'Do not use tools. Reply exactly: INTERRUPT_ME'});
    await api(`/api/sessions/${c.id}/tasks`,'POST',{prompt:'Do not use tools. Reply exactly: RESTART_PENDING_OK'});
    await stop();
    await start();
    const recovered = await waitTasks(c.id,2);
    assert.equal(recovered[0].status,'error');
    assert.equal(recovered[1].status,'done');
    assert.match(recovered[1].stdout,/RESTART_PENDING_OK/);
    await stop();
    const db = createDatabase(path.join(root,'data/db.sqlite'));
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    db.close();
    process.env.CODEX_QUEUE_EXEC_TIMEOUT_MS = '100';
    const timed = await execCodex('Reply exactly: TIMEOUT_TEST', {cwd:root});
    assert.equal(timed.ok,false);
    assert.equal(timed.exitCode,null);
    assert.match(timed.errorMessage,/timed out/);
    delete process.env.CODEX_QUEUE_EXEC_TIMEOUT_MS;
    const invalid = await execCodex('Reply exactly: NEVER', {cwd:path.join(root,'missing-directory')});
    assert.equal(invalid.ok,false);
    console.log(JSON.stringify({ status:'passed', realCli:true, fifo:true, parallel:true, shadowRecall:true, restartPending:true, shutdown:true, timeout:true, invalidCwd:true, sqliteIntegrity:'ok', root },null,2));
  } finally { await stop(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
