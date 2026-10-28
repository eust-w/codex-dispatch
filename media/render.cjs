// Render edited walkthroughs from reviewed, real UI captures. No simulated UI.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

const root = path.resolve(process.argv[2] || 'artifacts/launch');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const scenes = {
  en: [
    ['Your prompts. One queue.', 'en-overview.png', 'Codex Dispatch gives the real Codex command line a local task queue. Organize work by project, session, and prompt.', ['Project > Session > Task', 'Real Codex CLI. Local-first.']],
    ['A directory for every project', 'en-prompt.png', 'Choose the project directory, write a prompt, and enqueue it. Tasks in one session run in order. Different sessions can run in parallel.', ['FIFO within a session', 'Parallel across sessions']],
    ['Real processes. Real results.', 'en-running.png', 'Each task starts a real child process. The interface shows pending, running, done, or error. This is not a simulated execution.', ['child_process.exec', 'pending / running / done / error']],
    ['Keep the result', 'en-completed.png', 'Prompts and execution results are stored in a real SQLite file. Here, the command returned Queue verified. Pending work survives a restart.', ['SQLite persistence', 'Inspect output and working directory']],
    ['Context, with clear limits', 'en-result.png', 'Optional Shadow Context passes bounded earlier task output into the next prompt. It is not native Codex Desktop chat synchronization.', ['Bounded previous-task context', 'Not Desktop chat synchronization']],
    ['Open source. MIT licensed.', 'en-overview.png', 'Codex Dispatch is an independent alpha for macOS and Linux. Clone the repository to try it. Review permissions before running prompts. Feedback and contributions are welcome.', ['github.com/eust-w/codex-dispatch', 'Alpha / macOS + Linux / Node 22+']],
  ],
  zh: [
    ['把 Prompt 排成任务队列', 'zh-overview.png', '这是 Codex Dispatch，为真实的 Codex 命令行加上本地任务队列。按照项目、会话和任务，管理每一条指令。', ['项目 > 会话 > 任务', '真实执行，本地管理']],
    ['每个项目都有工作目录', 'zh-overview.png', '选好项目目录，输入指令，加入队列。同一个会话严格按顺序执行，不同会话可以并行运行。', ['会话内顺序执行', '不同会话可以并行']],
    ['不是模拟执行', 'en-running.png', '每条任务都会启动真实的子进程。界面可以查看等待、运行、完成和错误状态。这里展示的是实际运行界面。', ['真实 child_process.exec', '等待 / 运行 / 完成 / 错误']],
    ['执行结果，不再丢失', 'zh-completed.png', '指令和结果保存在真实的 SQLite 数据库里。这个任务已经返回 Queue verified。重启后，等待中的任务仍然保留。', ['SQLite 文件持久化', '查看输出、目录和退出码']],
    ['可选的历史任务上下文', 'zh-result.png', '开启 Shadow Context 后，后续任务会带上有限的历史任务输出。它不是 Codex 桌面应用的原生会话同步。', ['有界的历史任务上下文', '不是 Desktop 原生会话同步']],
    ['MIT 开源，现在可以试用', 'zh-overview.png', '项目已按 MIT 协议开源。目前是支持 macOS 和 Linux 的独立 Alpha 版本。使用前请检查本地权限，欢迎反馈问题和参与贡献。', ['github.com/eust-w/codex-dispatch', 'Alpha / macOS + Linux / Node 22+']],
  ],
};

function run(cmd, args) { execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); }
function duration(file) { return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim()); }
function text(x, y, size, value, color = '#edf7f4', weight = 400) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, PingFang SC, sans-serif" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

async function render(lang, portrait) {
  const id = `${lang}-${portrait ? 'portrait' : 'landscape'}`;
  const w = portrait ? 720 : 1280, h = portrait ? 1280 : 720;
  const segments = [];
  let timeline = 0;
  const subtitles = [];
  for (let i = 0; i < scenes[lang].length; i++) {
    const [heading, capture, narration, captions] = scenes[lang][i];
    const prefix = path.join(root, `${id}-${i}`);
    fs.writeFileSync(`${prefix}.txt`, narration);
    run('say', ['-v', lang === 'zh' ? 'Tingting' : 'Samantha', '-r', lang === 'zh' ? '205' : '175', '-f', `${prefix}.txt`, '-o', `${prefix}.aiff`]);
    const seconds = duration(`${prefix}.aiff`) + 0.8;
    const shot = sharp(path.join(root, capture));
    const closeup = i === 2 || i === 3 || i === 4;
    if (portrait) shot.extract(closeup ? { left: 655, top: 92, width: 615, height: 620 } : { left: 12, top: 12, width: 635, height: 696 });
    const shotW = portrait ? 660 : closeup ? 1040 : 936;
    const shotH = portrait ? 760 : 526;
    const pixels = await shot.resize(shotW, shotH, { fit: 'contain', background: '#e9eeee' }).png().toBuffer();
    const sx = (w - shotW) / 2, sy = portrait ? 228 : 94;
    const headingY = portrait ? 154 : 69;
    const captionY = portrait ? 1050 : 653;
    let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101819"/><rect x="0" y="0" width="${w}" height="7" fill="#35c5af"/>`;
    svg += text(30, portrait ? 65 : 30, portrait ? 28 : 20, 'CODEX DISPATCH', '#6edbc9', 700);
    svg += text(portrait ? 30 : 1080, portrait ? 102 : 30, portrait ? 18 : 16, 'MIT  /  ALPHA', '#e6bd6c');
    svg += text(30, headingY, portrait ? 36 : 30, heading, '#ffffff', 700);
    svg += text(30, captionY, portrait ? 28 : 23, captions[0], '#ffffff', 600);
    svg += text(30, captionY + (portrait ? 48 : 30), portrait ? 26 : 20, captions[1], '#8ee5d4');
    svg += text(30, h - 20, portrait ? 15 : 13, lang === 'zh' ? '真实界面剪辑 · 等待已缩短 · 合成旁白 · 非 OpenAI 官方项目' : 'Edited real UI captures / waits shortened / synthetic voice / not affiliated with OpenAI', '#a5b7b3');
    svg += `<rect x="0" y="${h - 5}" width="${w * (i + 1) / 6}" height="5" fill="#e6bd6c"/></svg>`;
    await sharp(Buffer.from(svg)).composite([{ input: pixels, left: sx, top: sy }]).png().toFile(`${prefix}.png`);
    run('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-framerate', '25', '-i', `${prefix}.png`, '-i', `${prefix}.aiff`, '-t', String(seconds), '-vf', 'fade=t=in:st=0:d=0.25', '-af', 'apad,loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', `${prefix}.mp4`]);
    segments.push(`${prefix}.mp4`);
    subtitles.push({ start: timeline, end: timeline + seconds, text: narration });
    timeline += seconds;
    console.log(`${id} scene ${i + 1}: ${seconds.toFixed(1)}s`);
  }
  const list = path.join(root, `${id}-concat.txt`);
  fs.writeFileSync(list, segments.map((file) => `file '${file}'`).join('\n'));
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(root, `codex-dispatch-${id}.mp4`)]);
  const stamp = (s) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace('.', ',');
  fs.writeFileSync(path.join(root, `${id}.srt`), subtitles.map((s, i) => `${i + 1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.text}\n`).join('\n'));
}

(async () => {
  fs.mkdirSync(root, { recursive: true });
  await render('en', false);
  await render('zh', false);
  await render('zh', true);
})().catch((error) => { console.error(error.message, error.stderr?.toString()); process.exitCode = 1; });
