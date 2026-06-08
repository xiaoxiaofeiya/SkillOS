import type { EvalCase, EvalReport, SkillCapabilityCard, SkillDomain, TaskPhase } from "./types.js";
import { recommendSkillChain } from "./routing.js";

export function runRoutingEval(suite: string, cases: EvalCase[], cards: SkillCapabilityCard[]): EvalReport {
  const results = cases.map((testCase) => {
    const chain = recommendSkillChain({ task: testCase.task, cards, phase: testCase.phase });
    const selectedCards = new Set(
      chain.candidates
        .filter((candidate) => !candidate.skipped && candidate.score >= 0.3)
        .flatMap((candidate) => candidate.matchedDomains.length ? candidate.matchedDomains : cards.find((card) => card.id === candidate.skillId)?.domains ?? [])
    );
    const expected = new Set(testCase.expectedDomains);
    const missingDomains = [...expected].filter((domain) => !selectedCards.has(domain));
    const extraDomains = [...selectedCards].filter((domain) => !expected.has(domain) && domain !== "general");
    return {
      id: testCase.id,
      passed: missingDomains.length === 0,
      selected: chain.steps.flatMap((step) => step.skillIds),
      expectedDomains: [...expected],
      missingDomains,
      extraDomains
    };
  });

  const totalExpected = cases.reduce((count, testCase) => count + testCase.expectedDomains.length, 0);
  const totalMissing = results.reduce((count, result) => count + result.missingDomains.length, 0);
  const totalExtra = results.reduce((count, result) => count + result.extraDomains.length, 0);
  const selectedDomainCount = results.reduce(
    (count, result) =>
      count + result.expectedDomains.length - result.missingDomains.length + result.extraDomains.length,
    0
  );
  const truePositiveDomains = totalExpected - totalMissing;
  return {
    suite,
    total: cases.length,
    skillRecall: totalExpected ? round((totalExpected - totalMissing) / totalExpected) : 1,
    skillPrecision: selectedDomainCount ? round(truePositiveDomains / selectedDomainCount) : 1,
    falsePositiveRate: selectedDomainCount ? round(totalExtra / selectedDomainCount) : 0,
    cases: results
  };
}

export const defaultEvalCases: EvalCase[] = buildDefaultEvalCases();

function round(value: number): number {
  return Number(value.toFixed(3));
}

export function domainsFromNames(names: string[]): SkillDomain[] {
  return names as SkillDomain[];
}

function buildDefaultEvalCases(): EvalCase[] {
  const groups: Array<{
    prefix: string;
    expectedDomains: SkillDomain[];
    phase: TaskPhase;
    prompts: string[];
  }> = [
    {
      prefix: "ui",
      expectedDomains: ["ui", "design", "browser", "screenshot"],
      phase: "implementation",
      prompts: [
        "Make this dashboard look like a real product and check it in the browser.",
        "The page feels amateur; redesign the UI and capture screenshots after.",
        "I do not know frontend design, make this screen professional and verify the layout.",
        "Polish the settings page, then open localhost and inspect the visual result.",
        "Turn this rough web app into a compact tool UI and test the main flow.",
        "Create a visual direction for this interface before changing the code.",
        "The button spacing looks bad; fix the UI and compare screenshots.",
        "Make the mobile layout usable and run browser checks.",
        "Improve the form screen so it looks production-ready.",
        "Generate a UI reference for this admin panel and implement it.",
        "Use a browser to confirm the page is not overflowing.",
        "The app looks like a prototype; make it look finished.",
        "Design a better landing-free tool interface for this workflow.",
        "Open the app and verify the sidebar and controls line up.",
        "Redesign the table page for dense professional use.",
        "Make the editor screen feel polished and test it visually.",
        "Fix the ugly interface and take before-after screenshots.",
        "Make this UI easier to scan without turning it into a marketing page.",
        "Improve the responsive layout and test desktop plus mobile.",
        "Create a high-fidelity UI direction and use it to update the frontend.",
        "The page text overlaps; fix the layout and verify in browser.",
        "Make the upload flow screen look cleaner and more reliable.",
        "Improve the product dashboard visual hierarchy.",
        "Use screenshot QA to find what still looks wrong.",
        "Make the local app interface more like professional SaaS.",
        "Redesign the control panel and verify all buttons remain clickable.",
        "Make this view polished enough to ship.",
        "Create a visual target and implement the closest practical UI.",
        "The current UI is confusing; restructure it and browser-test the result.",
        "Improve the app shell, navigation, and spacing.",
        "我不会设计界面，帮我把这个页面做得专业一点并截图检查。",
        "这个前端看起来很粗糙，重做布局后用浏览器确认。",
        "帮我把仪表盘界面改成产品级，不要做营销页。"
      ]
    },
    {
      prefix: "deploy",
      expectedDomains: ["deployment"],
      phase: "deployment",
      prompts: [
        "Deploy this app and give me a live link.",
        "Push this site online with the best matching platform.",
        "Prepare a Vercel preview deployment for this frontend.",
        "Set this backend up on Render.",
        "Publish this Next.js app and check the deployment config.",
        "Make this service deployable and explain any missing credentials.",
        "Generate a render.yaml for this API.",
        "Help me host this app without changing unrelated files.",
        "Create deployment presets for Vercel and Render.",
        "The deploy failed; inspect the app and suggest the platform-specific fix.",
        "Make the current repo ready for a preview deployment.",
        "I want this web app live for testing.",
        "Prepare cloud deployment but do not send secrets.",
        "Set up hosting for the frontend and API.",
        "Detect if this should go to Vercel or Render.",
        "Create a deployment plan with approval gates.",
        "Publish a static site if this repo supports it.",
        "Prepare this app for cloud hosting.",
        "Check deployment readiness and missing environment variables.",
        "Make a safe deployment workflow for this project.",
        "The website needs to be put online.",
        "Create a deployable package and platform config.",
        "Troubleshoot why Render cannot start the service.",
        "Troubleshoot why Vercel cannot build the project.",
        "Deploy the app only after confirming risk.",
        "Create preview deployment instructions for a teammate.",
        "Make the server worker deployable.",
        "Generate deployment config and verify it matches the repo.",
        "Host this without leaking API keys.",
        "Prepare a public preview safely.",
        "帮我把这个项目部署上线，但不要泄露密钥。",
        "准备一个云端预览部署并检查环境变量。",
        "我想要一个可以发给别人看的 live link。"
      ]
    },
    {
      prefix: "security",
      expectedDomains: ["security"],
      phase: "security-review",
      prompts: [
        "Check whether the login and upload flow are safe.",
        "Threat model this API before we ship it.",
        "Look for places where secrets could leak.",
        "Review auth boundaries for this admin feature.",
        "Tell me what attackers could abuse in this workflow.",
        "Do a security review of the file upload code.",
        "Check whether user data can be exposed.",
        "Find risky token handling in this repo.",
        "Model threats around payments and callbacks.",
        "Inspect public API abuse paths.",
        "Make sure this code is secure by default.",
        "Review the app for privacy risks.",
        "Check if the backend trusts client input too much.",
        "Look for unsafe redirects or credential leaks.",
        "Threat model this OpenClaw plugin integration.",
        "Review security before deploying.",
        "Check the admin panel for access-control bugs.",
        "Find dangerous file path handling.",
        "Assess whether this feature needs rate limiting.",
        "Review how this app stores API keys.",
        "Check if uploaded files can execute code.",
        "Find data exposure risks in logs.",
        "Review webhook validation.",
        "Check session handling and auth cookies.",
        "Threat model MCP tool access.",
        "Review this automation for destructive actions.",
        "Check if external calls can leak private data.",
        "Analyze abuse cases for the public endpoint.",
        "Review secure defaults for TypeScript code.",
        "Check the app before sharing it with users.",
        "帮我检查登录和上传流程有没有安全问题。",
        "这个接口会不会泄露 token，帮我做安全检查。",
        "上线前先威胁建模一下 MCP 工具访问。"
      ]
    },
    {
      prefix: "data",
      expectedDomains: ["data"],
      phase: "planning",
      prompts: [
        "Analyze this CSV and chart anomalies.",
        "Turn these logs into a short notebook report.",
        "Find outliers in this dataset.",
        "Create a Jupyter notebook for this experiment.",
        "Summarize the data and make charts.",
        "Compare these two result files.",
        "Analyze performance logs and show trends.",
        "Make a reproducible data exploration.",
        "Create notebook cells for this analysis.",
        "Find the most common failure in these logs.",
        "Plot the daily counts from this CSV.",
        "Clean this dataset and explain missing values.",
        "Make a tutorial notebook from this script.",
        "Turn the analysis into charts and tables.",
        "Investigate why metrics changed.",
        "Analyze benchmark results.",
        "Create an experiment notebook for model outputs.",
        "Summarize usage data.",
        "Find correlations in the spreadsheet.",
        "Use Python analysis for this report.",
        "Analyze telemetry locally without uploading it.",
        "Create a notebook from these logs.",
        "Build a chart showing error rates.",
        "Find suspicious rows in the CSV.",
        "Compare before and after measurements.",
        "Create a reproducible exploration workflow.",
        "Summarize this data file for a decision.",
        "Find which input cases failed most.",
        "Analyze routing eval results.",
        "Make a small notebook for validating assumptions.",
        "分析这个 CSV，做图表并找异常值。",
        "把这些日志整理成一个 notebook 报告。",
        "看一下指标为什么变化，给我本地分析结论。"
      ]
    },
    {
      prefix: "document",
      expectedDomains: ["document"],
      phase: "planning",
      prompts: [
        "Read this PDF and extract the requirements.",
        "Summarize this contract and flag action items.",
        "Turn the manual into a development checklist.",
        "Extract tables from this document.",
        "Create a report from these notes.",
        "Analyze this DOCX and preserve structure.",
        "Review this specification document.",
        "Convert the PDF contents into tasks.",
        "Summarize the installation guide.",
        "Extract form fields from this PDF.",
        "Compare two documents and summarize differences.",
        "Make a clean spreadsheet-ready summary.",
        "Create a presentation outline from this report.",
        "Read the product document and identify missing info.",
        "Pull citations from the research document.",
        "Summarize this legal text carefully.",
        "Turn meeting notes into documentation.",
        "Extract API details from the manual.",
        "Read this document and prepare implementation notes.",
        "Create a structured brief from PDFs.",
        "Analyze document requirements before coding.",
        "Find contradictions in this spec.",
        "Extract all deadlines from the contract.",
        "Summarize a technical paper.",
        "Turn a PDF into acceptance criteria.",
        "Build a report from document evidence.",
        "Create a concise requirements doc.",
        "Review the user guide for missing steps.",
        "Extract numbered requirements.",
        "Use document processing for this file.",
        "读取这份 PDF 合同并提取行动项。",
        "把这个需求文档整理成开发 checklist。",
        "总结这份说明书里的安装步骤。"
      ]
    },
    {
      prefix: "cli",
      expectedDomains: ["cli"],
      phase: "implementation",
      prompts: [
        "Build me a command line tool for batch image processing.",
        "Create a CLI that wraps this API.",
        "Make a terminal tool that returns JSON.",
        "Turn this script into a reusable CLI.",
        "Create commands for listing, reading, and updating records.",
        "Build a CLI with auth and config handling.",
        "Make a batch file processor.",
        "Create a developer tool from these curl examples.",
        "Expose this local service as command-line commands.",
        "Package this script for use from any repo.",
        "Create a CLI with stable machine-readable output.",
        "Build a terminal workflow for this admin task.",
        "Make a command for importing files.",
        "Create a CLI companion for this skill.",
        "Convert the manual operation into a scriptable tool.",
        "Build a command-line checker.",
        "Create a small automation CLI.",
        "Make a cross-platform command tool.",
        "Add subcommands for this workflow.",
        "Build a CLI that can be used by agents.",
        "Create command help and examples.",
        "Make this API easy to call from terminal.",
        "Create a JSON-first command line interface.",
        "Build a CLI for repeated deployment checks.",
        "Turn a local script into a safe tool.",
        "Create a CLI that manages credentials carefully.",
        "Make a command-line report generator.",
        "Build terminal commands for data cleanup.",
        "Create a CLI from an OpenAPI spec.",
        "Make this batch task repeatable.",
        "做一个命令行工具，输出稳定 JSON。",
        "把这个脚本封装成可以反复用的 CLI。",
        "给这个批处理任务加子命令。"
      ]
    },
    {
      prefix: "windows",
      expectedDomains: ["windows-app"],
      phase: "implementation",
      prompts: [
        "Build a WinUI desktop app shell.",
        "Create a Windows app with native navigation.",
        "Fix this XAML layout.",
        "Make a WinUI settings page.",
        "Bootstrap a Windows App SDK project.",
        "Review the WinUI controls and accessibility.",
        "Create a native desktop window for this tool.",
        "Troubleshoot the WinUI build.",
        "Make a responsive Windows app layout.",
        "Add theming to a WinUI app.",
        "Set up a C# desktop app.",
        "Improve the Windows native UI.",
        "Create a WinUI navigation view.",
        "Make the desktop app installer-ready.",
        "Review Windows App SDK usage.",
        "Build a native windowing feature.",
        "Fix WinUI performance issues.",
        "Create a modern Windows desktop form.",
        "Add accessibility to this WinUI screen.",
        "Prepare a machine for WinUI development.",
        "Create a XAML control layout.",
        "Review a Windows desktop app project.",
        "Add a settings flyout to WinUI.",
        "Build a native Windows tool UI.",
        "Troubleshoot C# app startup.",
        "Create a desktop app navigation pattern.",
        "Make the WinUI app look modern.",
        "Fix Windows app responsiveness.",
        "Use Windows App SDK samples.",
        "Create a native desktop workflow.",
        "创建一个 WinUI 3 桌面应用外壳。",
        "修一下这个 XAML 布局。",
        "做一个原生 Windows 工具界面。"
      ]
    },
    {
      prefix: "github",
      expectedDomains: ["github"],
      phase: "verification",
      prompts: [
        "GitHub Actions failed; help me fix CI.",
        "Address all pull request review comments.",
        "Analyze this failing build log.",
        "Fix the workflow YAML.",
        "Check why the PR checks are red.",
        "Summarize GitHub review comments into tasks.",
        "Repair the CI job for tests.",
        "Find the failing step in Actions.",
        "Update code based on PR feedback.",
        "Make the GitHub workflow pass.",
        "Investigate a failed deployment action.",
        "Review the pull request comments.",
        "Fix a CI cache problem.",
        "Create a GitHub Actions workflow.",
        "Check the PR status and suggest fixes.",
        "Handle reviewer feedback.",
        "Debug Actions environment variables.",
        "Fix lint errors from CI.",
        "Make tests pass in GitHub Actions.",
        "Analyze CI logs for root cause.",
        "Update workflow permissions.",
        "Respond to review comments with code changes.",
        "Fix the release workflow.",
        "Check branch protection related failures.",
        "Make the pull request green.",
        "Debug a CI-only failure.",
        "Fix GitHub Actions matrix setup.",
        "Review action logs for missing dependency.",
        "Create a summary of CI failures.",
        "Address requested changes in PR.",
        "GitHub Actions 红了，帮我看 CI 日志。",
        "处理 PR 里的 review comments。",
        "修复 workflow yaml 让检查通过。"
      ]
    },
    {
      prefix: "openai",
      expectedDomains: ["openai"],
      phase: "planning",
      prompts: [
        "Check the latest OpenAI docs for this API.",
        "Which OpenAI model should this app use?",
        "Use official docs to wire the Responses API.",
        "Update this code to the current OpenAI image API.",
        "Look up Codex customization docs.",
        "Find the official Agents SDK guidance.",
        "Check current model migration advice.",
        "Use OpenAI docs before changing this integration.",
        "Explain the latest model selection from official docs.",
        "Build this feature against OpenAI API docs.",
        "Verify the current Codex skills documentation.",
        "Find official docs for tool calling.",
        "Check OpenAI audio API guidance.",
        "Use official docs for GPT image generation.",
        "Look up current Responses API schema.",
        "Migrate prompts using official guidance.",
        "Check whether this model name is current.",
        "Find Codex MCP setup docs.",
        "Use docs for OpenAI auth setup.",
        "Verify official parameters for this endpoint.",
        "Find model upgrade guidance.",
        "Check Codex plugin documentation.",
        "Use current docs for structured outputs.",
        "Find official docs before choosing a model.",
        "Check OpenAI realtime API docs.",
        "Use docs to avoid stale API advice.",
        "Confirm current SDK usage.",
        "Check official OpenAI examples.",
        "Find Codex AGENTS.md guidance.",
        "Use OpenAI docs for this integration.",
        "查 OpenAI 官方文档确认这个模型还能不能用。",
        "根据最新官方文档接 Responses API。",
        "确认 GPT image API 的当前参数。"
      ]
    },
    {
      prefix: "mcp-openclaw",
      expectedDomains: ["mcp", "openclaw"],
      phase: "implementation",
      prompts: [
        "Create an OpenClaw plugin and ACP adapter.",
        "Support an OpenClaw-like variant with a manifest.",
        "Build an MCP server for skill routing.",
        "Map SkillOS chains into OpenClaw Gateway workflows.",
        "Detect OpenClaw plugins, hooks, skills, and MCP servers.",
        "Create an openclaw-like manifest for this client.",
        "Expose search_skills as an MCP tool.",
        "Add ACP harness support.",
        "Make a native OpenClaw plugin preset.",
        "Probe a Claw variant without hardcoding its name.",
        "Create MCP config for OpenClaw.",
        "Map workflow phases to OpenClaw execution.",
        "Inspect an OpenClaw runtime directory.",
        "Support OpenClaw hooks in the adapter.",
        "Create plugin metadata for a Claw-like client.",
        "Build progressive discovery through MCP.",
        "Expose render_skill_context over MCP.",
        "Record decisions from MCP calls.",
        "Detect Gateway capability in an OpenClaw variant.",
        "Create an MCP tool schema for recommend_skill_chain.",
        "Support OpenClaw native skills.",
        "Support OpenClaw variant capability probing.",
        "Build a generic Claw adapter protocol.",
        "Create an MCP server with JSON-RPC tools.",
        "Use ACP agent signals in routing.",
        "Generate OpenClaw workflow hints.",
        "Support ClawHub-style plugin packaging.",
        "Inspect OpenClaw plugin manifests.",
        "Create a Gateway runtime preset.",
        "Make MCP progressive discovery work for skills.",
        "给 OpenClaw 变体做 manifest 和 MCP 配置。",
        "把 SkillOS 链路映射成 OpenClaw Gateway workflow。",
        "支持 ClawHub 风格插件打包。"
      ]
    },
    {
      prefix: "negative",
      expectedDomains: [],
      phase: "planning",
      prompts: [
        "Do not deploy anything; only explain what files exist.",
        "不要部署，也不要打开浏览器，只总结目录结构。",
        "Skip security review for now and only list package names.",
        "Do not use Figma or UI design; just print the current version.",
        "不要调用 OpenClaw，只检查普通 README。",
        "No browser test is needed; only show the package scripts.",
        "不要写文件，不要执行部署，只给我当前配置摘要。",
        "Do not use OpenAI docs; summarize local README only.",
        "暂不做截图，只列出 skills 名称。",
        "Avoid CLI creation; just inspect this existing command."
      ]
    }
  ];

  return groups.flatMap((group) =>
    group.prompts.map((task, index) => ({
      id: `${group.prefix}-${String(index + 1).padStart(3, "0")}`,
      task,
      expectedDomains: group.expectedDomains,
      phase: group.phase
    }))
  );
}
