# Contributing

Use Node.js 22 or newer on macOS/Linux. Run `npm ci`, `npm test`, and `npm audit`.
Add a failing regression test before changing queue behavior. Tests must use real SQLite files.
Use `npm run test:live` only with your own authenticated CLI in isolated directories; it consumes quota.
Never add a mock execution mode to the app or publish fabricated task results.
Keep Chinese and English labels in sync. Include desktop/mobile screenshots for UI changes, with paths and private content removed.
Do not commit runtime databases, credentials, raw CLI logs or bulk media. Describe limitations honestly.
By submitting a contribution you agree to license it under the project's MIT license.
