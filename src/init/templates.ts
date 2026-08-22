export interface TemplateOptions {
  projectName?: string
  targetDir: string
  baseUrl: string
  devCommand: string
  isIsolated: boolean
  packageName?: string
  skipBrowserDownload?: boolean
}

/**
 * 专供 AI Agent 遵循的轻量级测试与自我修复约定
 */
export function getAgentsMdTemplate(options: TemplateOptions): string {
  const runCmd = options.isIsolated
    ? `cd ${options.targetDir} && pnpm test tests/example.spec.ts`
    : `pnpm ai-e2e:test ${options.targetDir}/tests/example.spec.ts`

  const chromeCmd = options.isIsolated
    ? `cd ${options.targetDir} && pnpm chrome`
    : `pnpm ai-e2e:chrome`

  const platformCmd = options.isIsolated
    ? `cd ${options.targetDir} && pnpm platform`
    : `pnpm ai-e2e:platform`

  const doctorCmd = options.isIsolated
    ? `cd ${options.targetDir} && pnpm doctor`
    : `pnpm ai-e2e:doctor`

  return `## 🧪 E2E 测试准则与 AI 协作规范

> 🎯 **核心原则**：小步快跑用原生 Playwright，阶段交付/关键视觉才用 Midscene AI。**编码开发中严禁边改边频繁触发慢速 E2E 测试**，避免打断工作流与浪费 Token。

### 1. 最终交付验收门禁（Definition of Done）
- **单条用例终验**：凡涉及页面渲染、交互按钮、数据渲染或深层路由，必须在功能全部写完后的**最终交付阶段**执行单条对应 E2E 用例：
  \`${runCmd} -g "用例名"\`
- **补齐用例规范**：若该功能尚无用例，必须在 \`${options.targetDir}/tests/\` 补齐对应 spec 文件；
- **断言分层范式**：日常断言优先使用原生 Playwright API（\`expect(locator)...\`，毫秒级 0 Token）；仅在复杂 UI 排版、Canvas/图片内容或阶段成果时使用 \`aiAssert\`；
- **路由秒级直达**：用例使用 \`gotoRoute('/path')\` 直达目标页，禁止从首页漫游点击；
- **自愈与报告排查**：若用例执行失败，查阅 \`midscene_run/report/\` 视觉报告定位修复，直至单条测试全绿才算交付完成。

### 2. 常用命令速查
- **跑单条用例（最终验收必跑）**：\`${runCmd} -g "用例名"\`
- **启动调试浏览器（扫码登录一次持久化）**：\`${chromeCmd}\`
- **Web 可视化看板**：\`${platformCmd}\`
- **环境自检**：\`${doctorCmd}\`
`
}

/**
 * 生成 fixture.ts 增强模板
 */
export function getFixtureTemplate(packageName = '@lhvision/ai-e2e-base'): string {
  return `import { createAiFixture } from '${packageName}'

// 创建支持 CDP 零内核直连、长效登录态持久化、深层路由直达与 Midscene AI 视觉能力的测试 Fixture
export const test = createAiFixture({
  cacheId: 'default-suite',
})

// 重新导出所有 Playwright 原生能力 (Page, Locator, expect, devices, defineConfig 等) 与 Midscene 方法/类型
export * from '${packageName}'
`
}

/**
 * 生成 playwright.config.ts 模板
 */
export function getPlaywrightConfigTemplate(options: TemplateOptions): string {
  const testDir = options.isIsolated ? './tests' : `./${options.targetDir}/tests`

  return `import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  testDir: '${testDir}',
  timeout: 90 * 1000,
  fullyParallel: false,
  workers: 1,
  // Midscene 报告器：跑完后在 midscene_run/report/ 下生成可视化回放报告
  reporter: [['list'], ['@midscene/web/playwright-reporter', { type: 'merged' }]],
  use: {
    baseURL: '${options.baseUrl}',
    viewport: { width: 1280, height: 900 },
    trace: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: '${options.devCommand}',
    url: '${options.baseUrl}',
    reuseExistingServer: true,
    timeout: 30 * 1000,
    ignoreHTTPSErrors: true,
  },
})
`
}

/**
 * 生成 .env.example 模板
 */
export function getEnvExampleTemplate(): string {
  return `# Midscene 视觉大模型配置 (可选，默认无需配置 Base URL)
MIDSCENE_MODEL_BASE_URL=
MIDSCENE_MODEL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
MIDSCENE_MODEL_NAME=
MIDSCENE_MODEL_FAMILY=

# 浏览器运行模式: auto | cdp | persistent | launch (默认 auto)
BROWSER_MODE=auto

# 是否以无头模式静默执行 (默认 true，设为 false 则弹出有头浏览器窗口)
HEADLESS=true

# 登录态 Profile 名称 (保存在 ~/.chrome-profiles/agent-profile-1)
CHROME_PROFILE=agent-profile-1

# Chrome 调试端口 (默认 9222)
CDP_PORT=9222

# 跳过 Playwright 自动下载浏览器内核 (零内核占用，直连本地 Chrome)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
`
}

/**
 * 生成 example.spec.ts 用例模板
 */
export function getExampleSpecTemplate(): string {
  return `import { test, expect } from './fixture'

test('首页能够正常加载并呈现主要内容', async ({ gotoRoute, page, aiAssert }) => {
  // 1. 使用 gotoRoute 路由秒级直达（智能等待网络或 DOM 就绪）
  await gotoRoute('/')

  // 2. ⚡ 日常断言：优先使用原生 Playwright（快、稳、零 Token 消耗）
  await expect(page).toHaveURL(/\\//)

  // 3. 🤖 关键视觉验收：必要时使用 Midscene AI 视觉断言
  await aiAssert('页面顶部有清晰的标题栏或导航栏，视口中展示了主要的内容或欢迎界面')
})
`
}

/**
 * 生成 Midscene YAML 脚本模板 (example.yaml)
 */
export function getYamlExampleTemplate(): string {
  return `# Midscene YAML 自动化脚本示例
# 运行命令: ai-e2e yaml <yaml文件路径>
target:
  url: https://www.bing.com

tasks:
  - name: 搜索并验证
    flow:
      - ai: 在搜索框中输入 "Midscene.js" 并回车
      - sleep: 2000
      - aiAssert: 页面上展示了关于 Midscene 的搜索结果列表
`
}

/**
 * 生成 .npmrc 模板 (跳过 Playwright 内核下载)
 */
export function getNpmrcTemplate(): string {
  return `playwright_skip_browser_download=1\n`
}

/**
 * 生成隔离工作区专属 package.json 模板
 */
export function getIsolatedPackageJsonTemplate(
  packageName = '@lhvision/ai-e2e-base',
  version = '^0.1.5',
): string {
  return `{
  "name": "project-ai-e2e",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "test": "ai-e2e run",
    "test:ui": "playwright test --ui",
    "yaml": "ai-e2e yaml",
    "platform": "ai-e2e platform",
    "doctor": "ai-e2e doctor",
    "chrome": "ai-e2e chrome",
    "install:no-browser": "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install"
  },
  "dependencies": {
    "${packageName}": "${version.startsWith('^') ? version : `^${version}`}",
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
