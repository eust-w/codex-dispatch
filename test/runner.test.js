const test = require("node:test");
const assert = require("node:assert/strict");
const { buildShadowPrompt, codexCommand } = require("../worker/runner");

test("codex command uses child_process.exec-compatible shell quoting", () => {
  const command = codexCommand('say "hello" && echo $HOME && echo `date`');
  assert.equal(command, 'codex exec -- "say \\"hello\\" && echo \\$HOME && echo \\`date\\`"');
});

test("shadow context wraps prior task output without changing original prompt", () => {
  const prompt = "Continue the work";
  const effective = buildShadowPrompt(prompt, [
    {
      position: 1,
      status: "done",
      prompt: "Create a file",
      stdout: "created alpha.txt",
      stderr: "",
      error_message: "",
      result: ""
    }
  ]);
  assert.match(effective, /<shadow_context>/);
  assert.match(effective, /created alpha\.txt/);
  assert.equal(effective.includes("<current_task>\nContinue the work\n</current_task>"), true);
});

test('prompt cannot be interpreted as a CLI flag or subcommand', () => {
  assert.equal(codexCommand('--help'), 'codex exec -- "--help"');
  assert.equal(codexCommand('resume'), 'codex exec -- "resume"');
});
