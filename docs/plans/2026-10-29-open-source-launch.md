# Codex Dispatch Launch Implementation Plan

**Goal:** Ship an independently maintained MIT-licensed Alpha, verify real Codex execution, then produce bilingual launch videos and attempt publication to X, Xiaohongshu, YouTube, Douyin and Bilibili.

**Architecture:** Keep the existing Express/SQLite/vanilla web app. Protect each database with a fail-closed exclusive instance lock, claim tasks transactionally, and drain/terminate owned children before shutdown. Do not auto-replay interrupted work with possible filesystem side effects.

**Tech Stack:** Node.js, better-sqlite3, Express, real Codex CLI, Playwright, FFmpeg.

## Approved Design

- Brand: Codex Dispatch; independent project, not affiliated with OpenAI.
- License: MIT for project-owned source; preserve dependency licenses.
- Release: public Alpha only after tests, audit and source secret scan pass.
- Media: real application capture with synthetic speech clearly disclosed, no fabricated execution results or popularity claims.
- Publication: record uploaded, review pending, publicly playable and blocked separately. User handles login and verification.

## Execution Checklist

1. Add failing tests in `test/safety.test.js` for API origin/host boundaries, task state forgery, exclusive lock and cross-manager claims.
2. Fix `server/app.js`, `worker/runner.js`, `db/database.js`, `bin/codex-queue.js` and add `core/instance-lock.js`. Run `npm test` after each patch. Preserve FIFO, reject unsupported Windows shell execution for this Alpha.
3. Upgrade vulnerable dependencies; run `npm audit`, real CLI success/error/timeout tests, pending-work restart and browser interactions in isolated directories. Never execute tests in private projects.
4. Add MIT license, bilingual docs, security/contribution policy, CI and npm package allowlist. Do not claim npm registry availability without publishing.
5. Scan staged files and history with gitleaks; review staged diff; commit, push, make existing repository public, create Alpha release; verify anonymously.
6. Capture the verified app, render English/Chinese landscape and Chinese portrait videos with captions and speech, inspect frames and audio metadata.
7. Open all five creator platforms, identify login/verification blockers, publish where authorized and feasible, save evidence and public links. Never bypass platform restrictions.

## Acceptance

No mock task execution in release evidence. Offline tests exercise SQLite and HTTP boundaries without claiming CLI execution. Runtime DBs, prompts, account state, secrets and bulky media remain excluded from Git/npm packages. Public claims distinguish prompt-history injection from native Codex conversation resume and local CLI usage from a hosted API.
