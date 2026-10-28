const { exec } = require("node:child_process");
const { now } = require("../db/database");

const DEFAULT_MAX_BUFFER = 1024 * 1024 * 20;
const DEFAULT_SHADOW_CONTEXT_TASKS = 5;
const DEFAULT_SHADOW_CONTEXT_CHARS = 12000;

function shellQuote(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function codexCommand(prompt) {
  return `codex exec -- ${shellQuote(prompt)}`;
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...[truncated ${text.length - maxLength} chars]`;
}

function buildShadowPrompt(prompt, previousTasks, options = {}) {
  if (!previousTasks || previousTasks.length === 0) return prompt;
  const maxChars = Number(options.maxChars || process.env.CODEX_QUEUE_SHADOW_CONTEXT_CHARS || DEFAULT_SHADOW_CONTEXT_CHARS);
  const context = previousTasks
    .map((task) => {
      const output = task.stdout || task.stderr || task.error_message || task.result || "";
      return [
        `Task #${task.position} [${task.status}]`,
        `Prompt: ${truncateText(task.prompt, 1200)}`,
        `Output: ${truncateText(output, 2400)}`
      ].join("\n");
    })
    .join("\n\n---\n\n");
  const shadowBlock = truncateText(context, Number.isFinite(maxChars) && maxChars > 0 ? maxChars : DEFAULT_SHADOW_CONTEXT_CHARS);
  return [
    "You are continuing a Codex Queue session with Shadow Context enabled.",
    "Use the prior task context below as background. Do not repeat it unless relevant.",
    "",
    "<shadow_context>",
    shadowBlock,
    "</shadow_context>",
    "",
    "<current_task>",
    prompt,
    "</current_task>"
  ].join("\n");
}

function execCodex(prompt, options) {
  const command = codexCommand(prompt);
  const timeout = Number(process.env.CODEX_QUEUE_EXEC_TIMEOUT_MS || 0);
  let collectedStdout = "";
  let collectedStderr = "";
  let forcedError = '';
  let timer;
  let killTimer;
  let child;
  const killGroup = signal => {
    if (!child?.pid) return;
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
  };
  const cancel = reason => {
    forcedError = reason;
    killGroup('SIGTERM');
    killTimer = setTimeout(() => killGroup('SIGKILL'), 1000);
    killTimer.unref();
  };
  const onAbort = () => cancel('Interrupted by server shutdown; inspect project changes before retrying.');
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') throw new Error('This Alpha supports macOS and Linux only.');
      if (options.signal?.aborted) throw new Error('Execution aborted before launch');
      child = exec(
        command,
        {
          cwd: options.cwd,
          env: process.env,
          detached: true,
          maxBuffer: Number(process.env.CODEX_QUEUE_MAX_BUFFER || DEFAULT_MAX_BUFFER),
          timeout: 0
        },
        (error, stdout, stderr) => {
          clearTimeout(timer);
          clearTimeout(killTimer);
          options.signal?.removeEventListener('abort', onAbort);
          killGroup('SIGKILL');
          const finalStdout = stdout || collectedStdout;
          const finalStderr = stderr || collectedStderr;
          resolve({
            ok: !error && !forcedError,
            command,
            cwd: options.cwd,
            stdout: finalStdout,
            stderr: finalStderr,
            errorMessage: forcedError || (error
              ? error.killed && timeout > 0
                ? `codex exec timed out after ${timeout}ms`
                : error.message
              : ""),
            exitCode: forcedError ? null : error ? (Number.isInteger(error.code) ? error.code : null) : 0,
            signal: error && error.signal ? error.signal : ""
          });
        }
      );
      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (Number.isFinite(timeout) && timeout > 0) {
        timer = setTimeout(() => cancel(`codex exec timed out after ${timeout}ms`), timeout);
        timer.unref();
      }
      if (child.stdout) {
        child.stdout.on("data", (chunk) => {
          collectedStdout += chunk.toString();
          if (options.onOutput) options.onOutput(collectedStdout, collectedStderr);
        });
      }
      if (child.stderr) {
        child.stderr.on("data", (chunk) => {
          collectedStderr += chunk.toString();
          if (options.onOutput) options.onOutput(collectedStdout, collectedStderr);
        });
      }
      if (child.stdin) {
        child.stdin.end();
      }
    } catch (error) {
      resolve({
        ok: false,
        command,
        cwd: options.cwd,
        stdout: "",
        stderr: "",
        errorMessage: error.message,
        exitCode: 1,
        signal: ""
      });
    }
  });
}

class QueueManager {
  constructor(db, options = {}) {
    this.db = db;
    this.cwd = options.cwd || process.cwd();
    this.runningSessions = new Set();
    this.runners = new Set();
    this.controllers = new Set();
    this.stopped = false;
    this.claimPendingTask = this.db.transaction((sessionId) => {
      if (this.db.prepare("SELECT id FROM tasks WHERE session_id = ? AND status = 'running'").get(sessionId)) return null;
      const task = this.db
        .prepare(
          `SELECT t.*, p.cwd AS project_cwd, s.shadow_context_enabled
           FROM tasks t
           JOIN sessions s ON s.id = t.session_id
           JOIN projects p ON p.id = s.project_id
           WHERE t.session_id = ? AND t.status = 'pending'
           ORDER BY t.position ASC, t.created_at ASC
           LIMIT 1`
        )
        .get(sessionId);
      if (!task) return null;
      const timestamp = now();
      this.db
        .prepare(
          `UPDATE tasks
           SET status = 'running',
               started_at = ?,
               finished_at = NULL,
               result = '',
               stdout = '',
               stderr = '',
               error_message = '',
               updated_at = ?
           WHERE id = ? AND status = 'pending'`
        )
        .run(timestamp, timestamp, task.id);
      this.db
        .prepare("UPDATE sessions SET active_task_id = ?, updated_at = ? WHERE id = ?")
        .run(task.id, timestamp, sessionId);
      return this.db
        .prepare(
          `SELECT t.*, p.cwd AS project_cwd, s.shadow_context_enabled
           FROM tasks t
           JOIN sessions s ON s.id = t.session_id
           JOIN projects p ON p.id = s.project_id
           WHERE t.id = ?`
        )
        .get(task.id);
    });
  }

  startAllPending() {
    const sessions = this.db
      .prepare("SELECT DISTINCT session_id FROM tasks WHERE status = 'pending'")
      .all();
    for (const row of sessions) {
      this.startSession(row.session_id);
    }
  }

  startSession(sessionId) {
    if (this.stopped || this.runningSessions.has(sessionId)) return;
    this.runningSessions.add(sessionId);
    const runner = this.runSession(sessionId).catch(error => {
      console.error('Queue runner failed:', error.message);
    }).finally(() => {
      this.runningSessions.delete(sessionId);
      this.runners.delete(runner);
    });
    this.runners.add(runner);
  }

  stop() {
    this.stopped = true;
    for (const controller of this.controllers) controller.abort();
    return Promise.allSettled([...this.runners]);
  }

  async runSession(sessionId) {
    while (!this.stopped) {
      const task = this.claimPendingTask.immediate(sessionId);
      if (!task) {
        this.db
          .prepare("UPDATE sessions SET active_task_id = NULL, updated_at = ? WHERE id = ?")
          .run(now(), sessionId);
        return;
      }

      const shadowContextTasks = task.shadow_context_enabled
        ? this.db
            .prepare(
              `SELECT position, prompt, status, stdout, stderr, error_message, result
               FROM tasks
               WHERE session_id = ?
                 AND position < ?
                 AND status IN ('done', 'error')
               ORDER BY position DESC
               LIMIT ?`
            )
            .all(
              task.session_id,
              task.position,
              Number(process.env.CODEX_QUEUE_SHADOW_CONTEXT_TASKS || DEFAULT_SHADOW_CONTEXT_TASKS)
            )
            .reverse()
        : [];
      const effectivePrompt = buildShadowPrompt(task.prompt, shadowContextTasks);

      const controller = new AbortController();
      this.controllers.add(controller);
      const execution = await execCodex(effectivePrompt, {
        signal: controller.signal,
        cwd: task.project_cwd || this.cwd,
        onOutput: (stdout, stderr) => {
          const timestamp = now();
          const runningResult = JSON.stringify(
            {
              status: "running",
              command: codexCommand(effectivePrompt),
              cwd: task.project_cwd || this.cwd,
              shadowContextEnabled: !!task.shadow_context_enabled,
              shadowContextTaskCount: shadowContextTasks.length,
              originalPrompt: task.prompt,
              effectivePrompt,
              stdout,
              stderr,
              errorMessage: "",
              updatedAt: timestamp
            },
            null,
            2
          );
          this.db
            .prepare(
              `UPDATE tasks
               SET result = ?,
                   stdout = ?,
                   stderr = ?,
                   updated_at = ?
               WHERE id = ? AND status = 'running'`
            )
            .run(runningResult, stdout, stderr, timestamp, task.id);
        }
      });
      this.controllers.delete(controller);
      const timestamp = now();
      const status = execution.ok ? "done" : "error";
      const result = JSON.stringify(
        {
          status,
          command: execution.command,
          cwd: execution.cwd,
          shadowContextEnabled: !!task.shadow_context_enabled,
          shadowContextTaskCount: shadowContextTasks.length,
          originalPrompt: task.prompt,
          effectivePrompt,
          exitCode: execution.exitCode,
          signal: execution.signal,
          stdout: execution.stdout,
          stderr: execution.stderr,
          errorMessage: execution.errorMessage,
          finishedAt: timestamp
        },
        null,
        2
      );

      this.db
        .prepare(
          `UPDATE tasks
           SET status = ?,
               result = ?,
               stdout = ?,
               stderr = ?,
               error_message = ?,
               finished_at = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          status,
          result,
          execution.stdout,
          execution.stderr,
          execution.errorMessage,
          timestamp,
          timestamp,
          task.id
        );
    }
  }
}

module.exports = {
  QueueManager,
  buildShadowPrompt,
  codexCommand,
  execCodex,
  shellQuote
};
