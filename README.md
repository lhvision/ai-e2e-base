# @lhvision/ai-e2e-base

> 🚀 **零内核下载、长效登录态持久化、极简回归测试看板、深度融合 Midscene 视觉大模型的下一代 AI E2E 自动化测试基础库与 SDK。**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62+-green.svg)](https://playwright.dev/)
[![Midscene](https://img.shields.io/badge/Midscene-1.10+-purple.svg)](https://midscenejs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 核心痛点与解决方案

在传统 Playwright / Midscene E2E 测试中，通常存在以下痛点：

1. **庞大的内核下载**：`playwright install` 动辄需下载 ~500MB 的专用 Chromium 内核。在受限网络、内网 CI 或普通开发机上常因网络超时或缺少系统依赖库（`libgbm` / `libasound`）而失败。
2. **复杂登录态与扫码认证难以自动化**：现代 Web 项目普遍采用微信扫码、手机验证码、企业 SSO 或 2FA，编写自动化模拟登录代码维护成本极高甚至不可行。
3. **老旧项目 Node 版本受限**：主业务工程可能锁定在老旧 Node 版本（< 24），无法直接安装现代 ESM / Playwright / Midscene 工具链。
4. **AI Coding Agent 缺乏自愈闭环**：代码助手在生成代码后无法直观知道界面是否符合预期、断言是否通过。

**`@lhvision/ai-e2e-base` 针对上述痛点提供一站式解决方案：**

- **⚡ 零内核下载**：基于 Chrome 远程调试协议（CDP），直连本地已安装的 Chrome / Edge，彻底免除内核下载；
- **🔐 长效登录态持久化**：支持指定独立隔离的 Profile 目录（如 `agent-profile-1`），人工在浏览器中扫码/登录一次，后续测试全自动复用；
- **🎯 4 种自适应浏览器模式**：智能识别 CDP、持久化 Profile 与纯净沙箱，零门槛平滑回退；
- **📦 智能隔离工作区 (Isolated Workspace)**：Node < 24 的老项目可一键在子目录（`e2e/`）初始化独立运行环境（Node 24+），零污染主项目；
- **📊 内置极简 Web 看板**：运行 `ai-e2e platform` 即刻启动 Vercel 风格 Web 测试看板，支持用例分组、一键触发、实时日志与 Midscene HTML 视觉报告回放；
- **🤖 专为 AI Agent 设计的自愈闭环**：开箱自带 `AGENTS.md`，规范 Agent 在编码完成后自动触发单条回归，查阅视觉报告自我修复。

---

## 🧭 何时用何种模式？（决策速查）

基础库提供 4 种运行模式（通过 `.env` 中的 `BROWSER_MODE` 或代码显式指定）：

| 运行模式 (`BROWSER_MODE`) | 外部 CDP 调试端口     | 浏览器内核来源                          | 登录态保存机制                              | 推荐使用场景                                                 |
| :------------------------ | :-------------------- | :-------------------------------------- | :------------------------------------------ | :----------------------------------------------------------- |
| **`auto`** _(默认推荐)_   | 优先探测 `9222`       | 有 CDP 走系统 Chrome；无 CDP 走本地内核 | 若连 CDP 则继承对应 Profile 登录态          | **日常本地开发与 AI 自动测试首选**，零配置自适应。           |
| **`cdp`**                 | **需要开启** (`9222`) | 本地系统 Google Chrome / Edge           | 永久持久化在 `~/.chrome-profiles/<profile>` | **受限环境无法下载内核**，或**人工扫码登录一次后长期跑测**。 |
| **`persistent`**          | **不需要**            | Playwright 本地内核                     | 永久持久化在 `~/.chrome-profiles/<profile>` | **已有内核环境，但测试需要复用登录态**（免去每次脚本登录）。 |
| **`launch`**              | **不需要**            | Playwright 本地内核                     | 每次都是纯净隔离沙箱（无登录态）            | **CI/CD 自动化流水线** 或需确保完全初始状态的用例。          |

---

## 🛠️ 快速上手

### 1. 一键初始化（推荐）

在项目根目录直接运行初始化向导：

```bash
npx @lhvision/ai-e2e-base init
```

向导将根据当前 Node 版本自动推荐并支持两种集成方式：

- **方式 A：根目录集成 (In-Tree - 适合 Node >= 24 项目)**
  - 在当前项目根目录增量创建 `e2e/` 目录；
  - 自动向根目录 `package.json` **增量注入便捷 scripts**：
    ```json
    "scripts": {
      "ai-e2e:doctor": "ai-e2e doctor",
      "ai-e2e:chrome": "ai-e2e chrome",
      "ai-e2e:platform": "ai-e2e platform",
      "ai-e2e:test": "playwright test"
    }
    ```
  - 自动生成 `e2e/fixture.ts`、`e2e/example.spec.ts`、`e2e/cases.json`、`playwright.config.ts` 与项目根目录的 `AGENTS.md`。

- **方式 B：独立隔离子目录 (Isolated Workspace - 适合 Node < 24 或老项目)**
  - 在 `e2e/` 子目录下创建独立的 `package.json`（锁定 `engines.node: ">=24.0.0"`）、`.nvmrc (24)`、`playwright.config.ts`；
  - 测试依赖完全隔离在 `e2e/` 内部，主业务构建环境零污染。

---

### 2. 配置环境变量 (`.env`)

在项目根目录创建 `.env` 文件：

```env
# 1. Midscene 视觉大模型配置（支持 Qwen-VL / Gemini / OpenAI / DashScope 等）
MIDSCENE_MODEL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MIDSCENE_MODEL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
MIDSCENE_MODEL_NAME=qwen-vl-max
MIDSCENE_MODEL_FAMILY=qwen

# 2. 浏览器与登录态配置 (可选: auto | cdp | persistent | launch，默认 auto)
BROWSER_MODE=auto

# 指定登录态隔离配置名称（默认保存在 ~/.chrome-profiles/agent-profile-1）
CHROME_PROFILE=agent-profile-1

# Chrome 调试端口（默认 9222）
CDP_PORT=9222
```

---

### 3. 环境健康自检 (Doctor)

```bash
npx ai-e2e doctor
```

输出示例：

```text
🔍 [ai-e2e] 检查 AI E2E 环境配置:

  • Node.js:          v24.19.0
  • 浏览器模式 (Mode): auto (可选: auto | cdp | persistent | launch)
  • 登录态 Profile:   agent-profile-1 (/home/miku/.chrome-profiles/agent-profile-1)
  • Chrome 可执行文件: google-chrome ✅
  • CDP 调试端口:     9222 ✅ (已就绪/已连接)
  • AI 视觉模型 Key:  ✅ (已配置)
  • AI 视觉模型名称:  gemini-2.5-flash

🎉 环境一切就绪，可直接执行 AI E2E 测试！
```

---

### 4. 启动 Web 回归测试看板 (Platform)

无需任何额外依赖，直接启动内置的 Vercel 风格 Web 看板：

```bash
npx ai-e2e platform
```

打开 `http://127.0.0.1:3000`：
- **左侧用例树**：读取 `.spec.ts` 结合 `cases.json` 自动呈现分组（`Core`、`Regression`）与优先级（`P0`/`P1`）；
- **一键执行**：支持单条用例、单个分组或全量一键执行；
- **实时输出**：流式展现终端控制台日志与耗时；
- **报告直达**：失败/通过用例自动关联并可点击查看 Midscene 视觉 HTML 回放报告。

---

## 🤖 AI Agent 协作与自愈闭环

本项目原生支持 AI Coding Agent（如 Cursor / Claude Code / Antigravity）：

1. **自动感知**：项目根目录生成的 `AGENTS.md` 会被 AI 自动识别为测试执行准则；
2. **闭环约定**：Agent 在完成业务开发或重构后，会自动编写或补充 `e2e/*.spec.ts`；
3. **单条回归**：Agent 主动执行 `pnpm exec playwright test e2e/<file>.spec.ts -g "用例名"`；
4. **视觉自愈**：若测试失败，Agent 主动读取控制台报错与 `midscene_run/report/*.html` 报告进行自我修复，直到 100% Passed。

---

## 🔐 场景指南：如何保留登录态（免去自动化登录脚本）

### 方案 A：零内核 + CDP 模式扫码登录（最推荐）

1. **在新终端启动调试 Chrome**：
   ```bash
   npx ai-e2e chrome
   ```
2. **人工登录一次**：在弹出的 Chrome 窗口中打开目标站点并完成登录（扫码/密码/SSO）。
3. **直接跑测**：所有 Cookie、Token 和 LocalStorage 均持久化在 `agent-profile-1` 中。后续测试直连 9222 端口，天然处于登录状态！

---

### 方案 B：本地已有内核 + 持久化 Profile 模式

无需启动额外的 Chrome 终端，仅需在 `.env` 中设置：

```env
BROWSER_MODE=persistent
CHROME_PROFILE=agent-profile-1
```

测试执行时底层会自动通过 `chromium.launchPersistentContext()` 直接挂载该目录，持续复用会话。

---

## 📝 编写测试用例

在项目 `e2e/fixture.ts` 中导出增强版 `test` 与 `expect`：

```ts
// e2e/fixture.ts
import {
  createAiFixture,
  expect,
  type PlayWrightAiFixtureType,
  type ExtendedAiFixtureType,
} from '@lhvision/ai-e2e-base'

export const test = createAiFixture({
  cacheId: 'my-suite-cache', // 启用 AI 定位规划缓存，大幅提升重复运行速度
})

export { expect }
export type { PlayWrightAiFixtureType, ExtendedAiFixtureType }
```

在测试文件中直接编写用例（支持深层路由秒级直达）：

```ts
// e2e/home.spec.ts
import { test, expect } from './fixture'

test('深层路由直达与智能视觉断言', async ({ gotoRoute, page, aiAssert, aiTap }) => {
  // 1. ⚡ 路由直达：直接打开被测深层页面（自动携带持久化登录态并等待网络空闲）
  await gotoRoute('/comic/jm/438696')

  // 2. 传统 Playwright 定位（可选）
  const card = page.locator('.comic-card, .detail-header').first()
  await expect(card).toBeVisible({ timeout: 10_000 })

  // 3. Midscene 智能视觉断言（无需复杂选择器）
  await aiAssert('当前视口中能看到漫画封面、标题以及开始阅读按钮')
})
```

---

## 📊 平台化 SDK 接口（构建自研测试平台）

如果正在开发自研测试看板或发布平台，可以直接引入核心 SDK：

```ts
import {
  parseSpecFile,
  runPlaywright,
  getMidsceneReports,
  startPlatformServer,
  ensureChromeRunning,
  checkEnvironment,
} from '@lhvision/ai-e2e-base'

// 1. 静态提取 spec 中的用例清单与行号
const cases = parseSpecFile('e2e/home.spec.ts')

// 2. 编程式触发测试，获取实时输出流与结构化结果
const runResult = await runPlaywright({
  grep: '首页加载',
  onLine: (line) => console.log('[Platform Stream]:', line),
})

// 3. 自动抓取 Midscene 视觉 HTML 报告
const reports = getMidsceneReports()

// 4. 编程式拉起内置 Web 看板
const { url } = await startPlatformServer({ port: 3000, testDir: 'e2e' })
```

---

## 🖥️ CLI 命令速查

```bash
# 查看环境诊断信息
npx ai-e2e doctor

# 启动 Web 回归测试看板
npx ai-e2e platform [--port 3000] [--dir e2e]

# 打印当前系统的 Chrome 启动命令（不拉起进程）
npx ai-e2e chrome --show

# 启动后台 Chrome 调试实例
npx ai-e2e chrome

# 运行测试并支持文件/标题过滤
npx ai-e2e run [file] [-g "用例名"]

# 执行独立 Midscene YAML 脚本
npx ai-e2e yaml <file.yaml>

# 查看帮助信息
npx ai-e2e -h
```

---

## 📄 License

MIT License © 2026 lhvision
