import { PlaywrightAiFixture, type PlayWrightAiFixtureType } from '@midscene/web/playwright'
import {
  test as base,
  chromium,
  type Page,
  type BrowserContext,
  type Browser,
} from '@playwright/test'
import { isCdpAlive, ensureChromeRunning, getDefaultUserDataDir } from '../chrome/index.js'
import { getAiE2eConfig, type BrowserMode } from '../config/env.js'

/**
 * 路由直达跳转辅助函数类型
 */
export type GotoRouteFn = (
  routePath: string,
  waitForState?: 'networkidle' | 'load' | 'domcontentloaded',
) => Promise<Page>

/**
 * 扩展 Fixture 导出的上下文类型
 */
export type ExtendedAiFixtureType = PlayWrightAiFixtureType & {
  /**
   * 路由直达跳转辅助方法（自动拼接 baseURL，并等待网络或 DOM 就绪）。
   * 适合深层页面（如 `/detail/123`）直接测试，无需从首页逐级漫游点击。
   *
   * @example
   * ```ts
   * test('详情页测试', async ({ gotoRoute, aiAssert }) => {
   *   await gotoRoute('/detail/comic-123')
   *   await aiAssert('页面展示章节列表和开始阅读按钮')
   * })
   * ```
   */
  gotoRoute: GotoRouteFn
}

/**
 * AI Fixture 创建配置选项
 */
export interface CreateAiFixtureOptions {
  /**
   * Midscene AI 规划缓存 ID。
   * 开启后，AI 对页面元素的定位与交互规划会被缓存，重复运行时接近原生执行速度。
   * （注：`aiAssert` 与 `aiQuery` 断言判断结果永远不会缓存，每次都会真实验证）。
   * @example 'user-admin-suite'
   */
  cacheId?: string

  /**
   * 浏览器运行模式：
   * - `auto`: 优先探测 CDP 端口，未连接则回退到本地内核（默认推荐）
   * - `cdp`: 直连系统 Chrome（9222 调试端口），零内核下载
   * - `persistent`: 挂载指定 Profile 目录，复用已保存的登录态
   * - `launch`: 每次启动全新的无状态隔离沙箱
   */
  browserMode?: BrowserMode

  /**
   * Chrome 隔离配置名称（默认 'agent-profile-1'）。
   * 数据持久化保存在 `~/.chrome-profiles/<profileName>`。
   */
  profileName?: string

  /**
   * 自定义用户数据目录绝对路径（若指定则优先级高于 profileName）。
   */
  userDataDir?: string

  /**
   * Chrome CDP 远程调试端口（默认 9222）。
   */
  cdpPort?: number

  /**
   * Chrome CDP 主机地址（默认 '127.0.0.1'）。
   */
  cdpHost?: string

  /**
   * 当处于 `auto` 模式且 CDP 端口未开启时，是否尝试自动在后台拉起 Chrome（默认 false）。
   */
  autoLaunchChrome?: boolean

  /**
   * 是否以无头模式运行（默认 true，遵循静默无头执行策略）。
   */
  headless?: boolean

  /**
   * 默认浏览器视口分辨率（默认 { width: 1280, height: 900 }）。
   */
  viewport?: { width: number; height: number }
}

/**
 * 创建融合 CDP 零内核直连、持久化登录态 Profile、标准沙箱与 Midscene AI 视觉能力的增强版 Playwright Fixture。
 *
 * @param options - 自定义 Fixture 配置选项
 * @returns 扩展后的 Playwright `test` 对象，支持解构 `gotoRoute`、`aiAssert`、`aiTap`、`aiInput` 等方法
 *
 * @example
 * ```ts
 * // e2e/fixture.ts
 * import { createAiFixture, expect } from '@lhvision/ai-e2e-base'
 *
 * export const test = createAiFixture({ cacheId: 'my-suite' })
 * export { expect }
 *
 * // e2e/detail.spec.ts
 * import { test, expect } from './fixture'
 *
 * test('详情页直接验证', async ({ gotoRoute, aiAssert }) => {
 *   await gotoRoute('/comic/123')
 *   await aiAssert('页面展示章节列表和开始阅读按钮')
 * })
 * ```
 */
export function createAiFixture(options: CreateAiFixtureOptions = {}) {
  const cfg = getAiE2eConfig()
  const mode = options.browserMode ?? cfg.browser.mode
  const port = options.cdpPort ?? cfg.browser.port
  const host = options.cdpHost ?? cfg.browser.host
  const cdpUrl = `http://${host}:${port}`
  const autoLaunch = options.autoLaunchChrome ?? cfg.browser.autoLaunch
  const profileName = options.profileName ?? cfg.browser.profileName
  const userDataDir =
    options.userDataDir ?? cfg.browser.userDataDir ?? getDefaultUserDataDir(profileName)
  const headless = options.headless ?? cfg.browser.headless
  const viewport = options.viewport ?? { width: 1280, height: 900 }

  // 1. 挂载 Midscene AI 扩展方法 (ai, aiAssert, aiQuery, aiWaitFor, agentForPage 等)
  const aiExtended = base.extend<ExtendedAiFixtureType>({
    ...PlaywrightAiFixture({
      cache: options.cacheId ? { id: options.cacheId } : undefined,
    }),

    // 2. 路由直达跳转辅助函数（智能等待页面加载与客户端路由稳定）
    gotoRoute: async ({ page }, use) => {
      const gotoFn: GotoRouteFn = async (
        routePath: string,
        waitForState: 'networkidle' | 'load' | 'domcontentloaded' = 'load',
      ) => {
        await page.goto(routePath, { waitUntil: 'load' })
        if (waitForState && waitForState !== 'load') {
          try {
            await page.waitForLoadState(waitForState, { timeout: 5000 })
          } catch {}
        }
        return page
      }
      await use(gotoFn)
    },

    // 3. 增强 page fixture：根据模式智能路由 (CDP 直连 / 持久化 Profile / 纯本地 Launch)
    page: async ({ playwright: _playwright }, use) => {
      let page: Page
      let cdpBrowser: Browser | null = null
      let persistentContext: BrowserContext | null = null
      let standardBrowser: Browser | null = null

      let effectiveMode: 'cdp' | 'persistent' | 'launch' = 'launch'

      if (mode === 'cdp') {
        effectiveMode = 'cdp'
      } else if (mode === 'persistent') {
        effectiveMode = 'persistent'
      } else if (mode === 'launch') {
        effectiveMode = 'launch'
      } else {
        // 'auto' 模式：优先探测 CDP 端口
        let isAlive = await isCdpAlive(port, host)
        if (!isAlive && autoLaunch) {
          try {
            await ensureChromeRunning({ port, host, profileName })
            isAlive = true
          } catch {
            // 自动拉起失败，继续走本地降级
          }
        }
        if (isAlive) {
          effectiveMode = 'cdp'
        } else if (options.profileName || options.userDataDir) {
          effectiveMode = 'persistent'
        } else {
          effectiveMode = 'launch'
        }
      }

      if (effectiveMode === 'cdp') {
        // 模式 A：CDP 直连模式（零内核下载，复用已运行 Chrome）
        cdpBrowser = await chromium.connectOverCDP(cdpUrl)
        const context = cdpBrowser.contexts()[0] || (await cdpBrowser.newContext({ viewport }))
        page = context.pages()[0] || (await context.newPage())
        await use(page)
      } else if (effectiveMode === 'persistent') {
        // 模式 B：持久化 Profile 模式（保留 Cookies / 登录态 / LocalStorage）
        persistentContext = await chromium.launchPersistentContext(userDataDir, {
          headless,
          viewport,
        })
        page = persistentContext.pages()[0] || (await persistentContext.newPage())
        try {
          await use(page)
        } finally {
          await persistentContext.close()
        }
      } else {
        // 模式 C：标准本地内核模式（Playwright 自带的隔离沙箱）
        standardBrowser = await chromium.launch({ headless })
        const context = await standardBrowser.newContext({ viewport })
        page = await context.newPage()
        try {
          await use(page)
        } finally {
          await context.close()
          await standardBrowser.close()
        }
      }
    },
  })

  return aiExtended
}

// 导出 Playwright 所有原生能力、断言与类型定义 (Page, Locator, expect, devices, defineConfig 等)
export * from '@playwright/test'

// 导出 Midscene 视觉大模型核心与 Playwright Fixture 类型
export * from '@midscene/web'
export * from '@midscene/web/playwright'

/** 默认开箱即用的 AI Fixture test 实例（内置 AI 视觉交互与深层路由直达） */
export const test = createAiFixture({ cacheId: 'default-suite' })
