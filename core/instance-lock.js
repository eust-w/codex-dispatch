const fs = require('node:fs');
const path = require('node:path');

function acquireInstanceLock(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const lock = path.join(fs.realpathSync(dataDir), '.dispatch-lock');
  try { fs.mkdirSync(lock); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`Database locked: ${lock}. Stop its server first. After a crash, verify all owned Codex processes have exited before removing this lock directory.`);
  }
  try {
    fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });
  } catch (error) { fs.rmSync(lock, { recursive: true }); throw error; }
  let released = false;
  return () => { if (!released) { fs.rmSync(lock, { recursive: true }); released = true; } };
}

module.exports = { acquireInstanceLock };
