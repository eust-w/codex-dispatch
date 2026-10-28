#!/usr/bin/env node

const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { createDatabase, recoverInterruptedTasks } = require("../db/database");
const { createApp } = require("../server/app");
const { QueueManager } = require("../worker/runner");
const { acquireInstanceLock } = require('../core/instance-lock');

const DEFAULT_PORT = Number(process.env.CODEX_QUEUE_PORT || 3333);

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.on('error', error => console.warn(`Open the URL manually: ${error.message}`));
  child.unref();
}

function listen(app, startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = http.createServer(app);
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && port < startPort + 20) {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });
      server.listen(port, "127.0.0.1", () => {
        resolve({ server, port });
      });
    };
    tryPort(startPort);
  });
}

async function main() {
  if (process.platform === 'win32') throw new Error('Codex Dispatch Alpha supports macOS and Linux only.');
  if (!Number.isInteger(DEFAULT_PORT) || DEFAULT_PORT < 1 || DEFAULT_PORT > 65515) throw new Error('Invalid CODEX_QUEUE_PORT');
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, "data", "db.sqlite");
  const releaseLock = acquireInstanceLock(path.dirname(dbPath));
  const db = createDatabase(dbPath);
  const recovered = recoverInterruptedTasks(db);
  const queueManager = new QueueManager(db, { cwd: rootDir });
  const app = createApp({ db, queueManager });
  const { server, port } = await listen(app, DEFAULT_PORT);
  const url = `http://127.0.0.1:${port}`;

  queueManager.startAllPending();
  if (process.env.CODEX_QUEUE_NO_OPEN !== '1') openBrowser(url);

  console.log(`Codex Dispatch running at ${url}`);
  console.log(`SQLite database: ${dbPath}`);
  if (recovered > 0) {
    console.log(`Marked ${recovered} interrupted task(s) as error. Inspect project changes before retrying.`);
  }
  console.log("Press Ctrl+C to stop.");

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections();
    await queueManager.stop();
    await closed;
    db.close();
    releaseLock();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
