export interface TemplateOptions {
  projectName?: string
  targetDir: string
  baseUrl: string
  devCommand: string
  isIsolated: boolean
  packageName?: string
}

/**
 * 专供 AI Agent 遵循的轻量级测试与自我修复约定
 */
export function getAgentsMdTemplate(options: TemplateOptions): string {
  const runCmd = options.isIsolated
    ? 'cd ' + options.targetDir + ' && pnpm exec playwright test'
    : 'pnpm exec playwright test'

  return `# AI E2E 自动化测试与自我修复约定

> 目标：指导 AI Agent 在交付带 UI 的新功能或修复 Bug 后，必须为核心交互补齐视觉回归用例，并通过【单条跑测 -> 查阅 Midscene 报告 -> 自我修复】实现闭环交付。

## 🤖 核心闭环与执行约定
1. **交付带 UI 新功能必须补测**：新增或修改核心交互时，必须在 \`${options.targetDir}/\` 补齐对应 Midscene 用例，保证测试 100% 全部通过；
2. **严禁全量跑测（Focused Execution Only）**：仅执行本次改动的单条用例（使用 \`-g "用例名"\` 精确匹配）；
3. **路由秒级直达（Deep-Link First）**：开发深层路由（如 \`/detail/123\`）时，使用 \`gotoRoute('/detail/123')\` 直接直达，严禁从首页漫游点击；
4. **视觉断言优先**：优先使用 \`aiAssert\` 自然语言断言关键视觉呈现与业务状态，避免维护脆弱的 CSS 选择器；
5. **失败自愈闭环**：UI 回归测试若有失败，报告在 \`midscene_run/report/\` 下，逐个定位修复，修完重新跑 E2E 测试，直到全绿为止；
6. **长效登录态复用**：保持 \`BROWSER_MODE=auto\` 直连 Chrome 9222 端口，人工扫码一次后长期复用，免去冗长的模拟登录脚本。

## 📝 用例编写范式
\`\`\`ts
import { test, expect } from './fixture'

test('功能验证与路由直达', async ({ gotoRoute, aiAssert, aiTap, aiInput, aiWaitFor }) => {
  // ⚡ 直接直达被测深层路由（带登录态）
  await gotoRoute('/comic/123')
  await aiAssert('页面顶部展示导航栏，主要区域展示内容卡片且有操作按钮')
})
\`\`\`

## ⚡ 常用命令速查
- **跑单条用例**：\`${runCmd} ${options.isIsolated ? 'example.spec.ts' : options.targetDir + '/example.spec.ts'} -g "用例名"\`
- **跑 Midscene YAML 脚本**：\`${options.isIsolated ? 'cd ' + options.targetDir + ' && pnpm yaml yaml/test.yaml' : 'pnpm ai-e2e:yaml ' + options.targetDir + '/yaml/test.yaml'}\`
- **启动 Chrome 调试实例（扫码登录一次）**：\`${options.isIsolated ? 'cd ' + options.targetDir + ' && pnpm chrome' : 'pnpm ai-e2e:chrome'}\`
- **启动 Web 回归看板**：\`${options.isIsolated ? 'cd ' + options.targetDir + ' && pnpm platform' : 'pnpm ai-e2e:platform'}\`
- **环境健康自检**：\`${options.isIsolated ? 'cd ' + options.targetDir + ' && pnpm doctor' : 'pnpm ai-e2e:doctor'}\`
`
}

/**
 * 生成 fixture.ts 增强模板
 */
export function getFixtureTemplate(packageName = '@lhvision/ai-e2e-base'): string {
  return `import { createAiFixture, expect, type PlayWrightAiFixtureType, type ExtendedAiFixtureType } from '${packageName}'

// 创建支持 CDP 零内核直连、长效登录态持久化、深层路由直达与 Midscene AI 视觉能力的测试 Fixture
export const test = createAiFixture({
  cacheId: 'default-suite',
})

export { expect }
export type { PlayWrightAiFixtureType, ExtendedAiFixtureType }
`
}

/**
 * 生成 playwright.config.ts 模板
 */
export function getPlaywrightConfigTemplate(options: TemplateOptions): string {
  return `import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  testDir: './${options.targetDir}',
  timeout: 90 * 1000,
  fullyParallel: false,
  workers: 1,
  // Midscene 报告器：跑完后在 midscene_run/report/ 下生成可视化回放报告
  reporter: [['list'], ['@midscene/web/playwright-reporter', { type: 'merged' }]],
  use: {
    baseURL: '${options.baseUrl}',
    viewport: { width: 1280, height: 900 },
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: '${options.devCommand}',
    url: '${options.baseUrl}',
    reuseExistingServer: true,
    timeout: 30 * 1000,
  },
})
`
}

/**
 * 生成 .env.example 模板
 */
export function getEnvExampleTemplate(): string {
  return `# Midscene 视觉大模型配置 (支持 Qwen-VL / Gemini / OpenAI / DashScope 等)
MIDSCENE_MODEL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MIDSCENE_MODEL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
MIDSCENE_MODEL_NAME=qwen-vl-max
MIDSCENE_MODEL_FAMILY=qwen

# 浏览器运行模式: auto | cdp | persistent | launch (默认 auto)
BROWSER_MODE=auto

# 登录态 Profile 名称 (保存在 ~/.chrome-profiles/agent-profile-1)
CHROME_PROFILE=agent-profile-1

# Chrome 调试端口 (默认 9222)
CDP_PORT=9222
`
}

/**
 * 生成 example.spec.ts 用例模板
 */
export function getExampleSpecTemplate(): string {
  return `import { test, expect } from './fixture'

test('首页能够正常加载并呈现主要内容', async ({ gotoRoute, aiAssert }) => {
  // 1. 使用 gotoRoute 路由直达并智能等待网络就绪
  const page = await gotoRoute('/')

  // 2. 基础页面断言
  await expect(page).toHaveURL(/\\//)

  // 3. Midscene 视觉大模型智能断言
  await aiAssert('页面顶部有清晰的标题栏或导航栏，视口中展示了主要的内容或欢迎界面')
})
`
}

/**
 * 生成隔离工作区专属 package.json 模板
 */
export function getIsolatedPackageJsonTemplate(packageName = '@lhvision/ai-e2e-base'): string {
  return `{
  "name": "project-ai-e2e",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "yaml": "ai-e2e yaml",
    "platform": "ai-e2e platform",
    "doctor": "ai-e2e doctor",
    "chrome": "ai-e2e chrome"
  },
  "dependencies": {
    "${packageName}": "^0.1.0",
    "@midscene/web": "^1.10.12",
    "@playwright/test": "^1.62.1",
    "dotenv": "^16.4.7"
  }
}
`
}

/**
 * 生成 cases.json 用例分组与优先级配置模板
 */
export function getCasesJsonTemplate(): string {
  return `{
  "首页能够正常加载并呈现主要内容": {
    "group": "核心流程",
    "priority": "P0"
  }
}
`
}
