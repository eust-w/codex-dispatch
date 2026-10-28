# Codex Dispatch

**A local task queue for the real Codex CLI.** Organize prompts by project and session, inspect outputs, and persist work in SQLite.

[简体中文](README.zh-CN.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

Independent community project. Not affiliated with or endorsed by OpenAI. **Alpha: macOS/Linux, Node.js 22+.** Not a hosted multi-user service.

## Run from source

Install and authenticate Codex CLI separately. Verify `codex --version` and `codex login status`. Model access, usage costs and sandbox settings come from your own Codex configuration.

```bash
git clone https://github.com/eust-w/codex-dispatch.git
cd codex-dispatch
npm ci
npm start
```

The browser opens automatically. The server binds to `127.0.0.1:3333` and tries the next 20 ports if occupied. Choose an existing project directory trusted by Codex; a Git repository may be required.

For a locally installed command, run `npm install -g .`, then `codex-dispatch` (legacy alias: `codex-queue`). The npm registry package is **not published** by this release. Do not assume bare `npx codex-queue` installs this repository.

Runtime data is stored in `./data/db.sqlite` relative to the launch directory. Chinese is the default UI language; English is selectable.

Useful environment variables:

- `CODEX_QUEUE_PORT`: preferred web server port, defaults to `3333`.
- `CODEX_QUEUE_NO_OPEN`: set `1` to skip opening a browser.
- `CODEX_QUEUE_EXEC_TIMEOUT_MS`: optional per-task timeout for `codex exec`, disabled by default.
- `CODEX_QUEUE_MAX_BUFFER`: optional stdout/stderr buffer size, defaults to 20 MB.
- `CODEX_QUEUE_SHADOW_CONTEXT_TASKS`: number of prior tasks, default `5`.
- `CODEX_QUEUE_SHADOW_CONTEXT_CHARS`: historical context limit, default `12000` characters.

## Behavior

- Projects contain sessions.
- Sessions contain FIFO task queues.
- A session runs one task at a time.
- Different sessions can run in parallel.
- Every task is executed through a real system command using `child_process.exec`:

```bash
codex exec -- "<prompt>"
```

No mock execution or in-memory persistence is used.

The `--` prevents prompts from being parsed as CLI flags. Shadow Context optionally injects bounded earlier task prompts/output into a new prompt. It is **not native Codex session resume or Desktop chat synchronization**.

## Safety and recovery

- Prompts run with your local Codex permissions/configuration. This UI is not a security sandbox. Review prompts and project directories before enqueueing.
- A database-directory lock rejects a second server. Graceful shutdown terminates owned process groups and persists interrupted tasks as errors; queued tasks resume on the next start.
- Interrupted work is **not automatically replayed**. Inspect filesystem changes before explicitly retrying. There is no exactly-once side-effect guarantee.
- A hard crash leaves `data/.dispatch-lock`. Check its `owner.json`, stop any remaining owned server/Codex processes, then remove that lock directory. Never remove a live instance's lock.
- Different sessions in the same directory can conflict. Use separate worktrees/directories.
- Foreign Host/Origin requests are rejected. There is no remote authentication; never expose the port through a proxy or tunnel.
- SQLite stores prompts and output unencrypted. Protect/back up the data directory and never commit it.

## Verify

```bash
npm test
npm audit
npm pack --dry-run
# Opt-in: real tasks, consumes your Codex quota.
npm run test:live
```

Offline tests cover SQLite, HTTP CRUD, origin checks, locking and queue claims. Only `test:live` verifies model execution; no fake Codex binary is used.

## REST API

`POST/GET /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `POST/GET /api/projects/:projectId/sessions`, `GET/PUT/DELETE /api/sessions/:id`, `POST/GET /api/sessions/:sessionId/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `POST /api/sessions/:sessionId/tasks/reorder`.

Send JSON. Create tasks with `{ "prompt": "instruction" }`; reorder with `{ "taskIds": ["id", "id"] }`. Only the worker assigns running/done/error. PUT `status: "pending"` explicitly retries a task. Running tasks cannot be edited or deleted.

## License

[MIT](LICENSE) for project-owned source. Codex CLI is installed separately with its own license and service terms. See [third-party notices](THIRD_PARTY_NOTICES.md).
