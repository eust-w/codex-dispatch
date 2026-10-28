# Alpha Verification — 2026-10-29

## Verified locally

- Node 24 / macOS: 10 automated tests passed, including real SQLite files, REST CRUD, foreign Origin/Host rejection, worker-only completion states, database claim exclusion, fail-closed instance locking and shutdown with idle TCP connections.
- Two opt-in integration runs passed with official Codex CLI 0.165.0, authenticated through the user's existing account. No fake executable or model response was used.
- Each integration run verified real stdout, FIFO timestamps, overlapping independent sessions, recalling an earlier task output through Shadow Context, persisted results after restart, pending-task continuation, shutdown interruption, 100ms timeout failure and invalid-working-directory failure.
- SQLite integrity_check returned `ok`.
- Browser checks at 1440, 1024 and 390px passed: default Chinese, English switching, filters, unsaved task draft preservation, no document-width overflow and no page errors in isolated Chromium.
- `npm audit --audit-level=moderate`: zero known vulnerabilities at verification time.
- npm package allowlist excludes database, screenshots, credentials, tests and bulk media. Package creation and clean temporary installation succeeded.
- Staged source was scanned with gitleaks stdin; no leaks detected. This is not a guarantee that arbitrary future task output is safe to publish.

## Fixes made during verification

- Concurrent task claiming and duplicate server instances.
- Child-process group termination on timeout and graceful shutdown; explicit interruption rather than automatic replay.
- Prompt CLI-flag injection, task-state forgery and local HTTP boundary checks.
- Unsaved edits overwritten by polling; tablet-width overflow.
- Browser preconnected sockets blocking graceful shutdown.

## Boundaries

Real model integration was exercised locally on macOS, not on Windows or every Linux distribution. CI covers offline tests on Linux/macOS and Node 22/24; inspect the actual workflow status for its outcome.

A Chrome extension in the test environment injected an Origin header missing the local port and was correctly rejected. A clean browser rendered successfully; no security checks were weakened to accommodate the extension.

Hard crashes retain the instance lock and require an operator to inspect and stop orphan processes before removing it. Different sessions sharing a directory can conflict. No exactly-once filesystem guarantee, native Codex conversation resume, Desktop synchronization, npm registry publication or hosted multi-user support is claimed.

Detailed raw execution logs and browser artifacts remain local and ignored because they can contain machine paths and CLI configuration.
