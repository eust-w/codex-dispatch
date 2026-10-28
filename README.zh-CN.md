# Codex Dispatch

**真实 Codex CLI 的本地任务队列。** 按项目和会话组织 Prompt，查看输出，让任务按顺序执行。

[English](README.md) · [安全边界](SECURITY.md) · [参与贡献](CONTRIBUTING.md)

独立社区项目，非 OpenAI 官方产品，不代表 OpenAI 背书。目前为 **Alpha**，支持 macOS / Linux，不是可直接暴露到公网的多人服务。

![Codex Dispatch 真实任务界面](https://github.com/eust-w/codex-dispatch/releases/download/v0.1.0-alpha.1/zh-overview.png)

[中文介绍视频](https://www.douyin.com/video/7701821691978124554) · [英文介绍视频](https://x.com/eustancewu/status/2115544507274182907) · [版本与视频下载](https://github.com/eust-w/codex-dispatch/releases/tag/v0.1.0-alpha.1) · [真实测试记录](docs/verification-2026-10-29.md)

视频采用真实界面剪辑和合成旁白，等待已缩短，不是模拟执行。制作脚本见 [media](media/README.md)。

## 能力

- 项目工作目录 → 会话 → FIFO 队列；同一会话串行，不同会话可并发。
- 真实调用 `child_process.exec` 执行 `codex exec -- "<prompt>"`，没有模拟结果。`--` 防止 Prompt 被解析成 CLI 参数。
- SQLite 文件持久化，保存真实标准输出、错误日志、执行目录与结果。
- 可选 Shadow Context 将前序任务内容以有限长度加入下一条 Prompt。它不是 Codex 原生会话续聊，也不与 Desktop 聊天同步。
- 默认中文，可切换英文。

## 启动

需要 Node.js 22+、npm、Git，以及已安装并登录的 Codex CLI。先确认 `codex --version` 和 `codex login status` 可用。模型权限、账号及使用费用由你的 Codex 配置决定。

```bash
git clone https://github.com/eust-w/codex-dispatch.git
cd codex-dispatch
npm ci
npm start
```

启动后自动打开浏览器，默认地址为 `http://127.0.0.1:3333`；端口占用时向后尝试 20 个端口。项目目录必须真实存在，并满足 Codex 的信任和 Git 检查。

也可以安装当前源码为本地命令：

```bash
npm install -g .
codex-dispatch
```

保留 `codex-queue` 命令别名。此版本**尚未发布 npm registry**，不要假定裸命令 `npx codex-queue` 对应本仓库。

## 数据和恢复

数据库位于启动目录的 `./data/db.sqlite`。同一数据库只允许一个服务实例；正常退出会终止其拥有的 CLI 进程，中断任务记为错误，待执行任务在下次启动继续执行。

中断任务不会自动重跑，需先检查项目文件改动，再手动重试。不能保证文件系统操作 exactly-once。硬崩溃后的 `data/.dispatch-lock` 不会自动删除：查看 `owner.json` 并确认服务及其 Codex 子进程全部停止，再删除该锁目录。

不要把 HTTP 服务暴露到公网，不要把数据库、Prompt 日志、凭据提交到 Git。不同会话操作同一目录仍可能发生文件冲突，建议使用独立工作目录或 worktree。

完整环境变量和 REST API 见 [English README](README.md)。

## 测试

```bash
npm test
npm audit
npm pack --dry-run
npm run test:live
```

最后一条会真实调用 Codex、消耗你配置的账号额度。普通测试验证 SQLite、API 与队列边界，不代表真实模型执行已经通过。

## 开源协议

本项目源码采用 [MIT](LICENSE)。Codex CLI 单独安装，其许可及服务条款独立适用。
