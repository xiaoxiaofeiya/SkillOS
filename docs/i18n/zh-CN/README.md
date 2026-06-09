# SkillOS 简体中文

**给你的编程智能体一个技能总控台。**

你的智能体可能已经会写代码、设计界面、打开浏览器测试、部署网站、检查安全、读文档、做数据分析、调用 MCP 工具。问题是：能力越多，越容易忘记在正确的时机使用正确的能力。

SkillOS 要解决的就是这个问题。

你不需要记住某个技能到底叫 `playwright`、`security-threat-model`、`vercel-deploy` 还是 `jupyter-notebook`。你只要说目标，比如“这个页面太丑，帮我改好并检查”，SkillOS 会帮助智能体判断这不是一个简单改色任务，而是设计、实现、浏览器验证、截图检查、交付总结组成的一条工作链。

## 一句话说明

SkillOS 不是普通安装器。它是一个本地优先的技能编排层，让智能体知道：

- 本机装了什么技能。
- 每个技能适合做什么。
- 当前任务真正需要什么能力。
- 哪些技能现在该用，哪些应该跳过。
- 哪些步骤有风险，需要确认。
- 完成前应该收集什么证据。

## 它为什么有用

很多人安装了很多 skills，但真正使用时还是要自己提醒智能体：

```text
用 playwright。
用 screenshot。
用 security review。
用 deploy skill。
```

这对普通用户很不友好。你想要的是直接说：

```text
我不会设计 UI，帮我把这个页面做得专业一点，并检查有没有问题。
```

SkillOS 帮智能体把这句话翻译成真正的执行思路：

```text
理解产品
  -> 规划界面
  -> 修改代码
  -> 打开浏览器
  -> 截图检查
  -> 修复错位和溢出
  -> 总结交付
```

这就是 SkillOS 的价值：让技能不再只是一个被动列表，而是变成智能体可以主动调度的工作系统。

## 适合谁

- 不懂 skill 名称，只想直接说需求的用户。
- 安装了很多技能，希望智能体自动判断何时使用的开发者。
- 同时使用 Codex、Claude Code、Cursor、Windsurf、OpenHands、OpenClaw 的团队。
- 想让新安装技能自动进入路由系统的 skill 作者。
- 需要本地日志、安全模式、MCP 工具和路由评测的 agent 开发者。

## 开始使用

安装 agent-facing skill：

```bash
npx skills add xiaoxiaofeiya/SkillOS -g
```

安装本地 runtime：

```powershell
irm https://raw.githubusercontent.com/xiaoxiaofeiya/SkillOS/main/scripts/install-from-github.ps1 | iex
```

然后运行：

```bash
skillos doctor
skillos setup --safety approve
skillos recommend "我不会设计 UI，帮我把这个页面做得专业一点并检查"
skillos explain --last
```

Windows PowerShell 如果拦截 npm 生成的 `.ps1` 命令，请使用：

```powershell
skillos.cmd doctor
```

更多内容：

- [产品概览](../../product-overview.md)
- [安装文档](../../installation.md)
- [市场背景](../../market-context.md)

## 在哪里安装

- Agent Skills / skills.sh：`npx skills add xiaoxiaofeiya/SkillOS -g`
- Claude Code：`/plugin marketplace add xiaoxiaofeiya/SkillOS`，然后 `/plugin install skillos`
- GitHub Release：下载 `v0.1.0-preview.1` 的 `skillos.zip`
- npm preview：发布后使用 `npm install -g @skillos/cli@preview`
- MCP server：发布后使用 `npx @skillos/mcp-server@preview`
- OpenClaw / ClawHub：查看 `docs/publishing-platforms.md`
