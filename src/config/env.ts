import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { getDefaultChromePath, getDefaultUserDataDir, isCdpAlive } from '../chrome/index.js'

// 尝试加载当前目录或上级目录的 .env
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' })
} else if (fs.existsSync(path.resolve('..', '.env'))) {
  dotenv.config({ path: path.resolve('..', '.env') })
} else if (fs.existsSync(path.resolve('../..', '.env'))) {
  dotenv.config({ path: path.resolve('../..', '.env') })
}

/**
 * 浏览器运行模式：
 * - `auto`: 自动探测 9222 CDP 端口，连接成功走 CDP，否则回退本地内核（推荐）
 * - `cdp`: 强制使用 CDP 远程调试协议直连本地已安装 Chrome，零内核下载
 * - `launch`: 每次启动全新的本地 Playwright 纯净沙箱环境
 * - `persistent`: 挂载独立 Profile 目录，保留扫码与登录态
 */
export type BrowserMode = 'auto' | 'cdp' | 'launch' | 'persistent'

/**
 * AI E2E 全局解析后配置对象
 */
export interface AiE2eConfig {
  browser: {
    mode: BrowserMode
    port: number
    host: string
    url: string
    useCdp: boolean
    autoLaunch: boolean
    profileName: string
    userDataDir: string
    headless: boolean
  }
  midscene: {
    baseUrl?: string
    apiKey?: string
    modelName?: string
    modelFamily?: string
  }
}

/**
 * 解析并获取当前环境变量中的 AI E2E 全局配置。
 *
 * @returns 结构化配置对象
 */
export function getAiE2eConfig(): AiE2eConfig {
  const host = process.env.CDP_HOST || '127.0.0.1'
  const port = Number(process.env.CDP_PORT || 9222)
  const url = process.env.CDP_URL || `http://${host}:${port}`

  // 模式决策：BROWSER_MODE 显式指定优先；其次兼容 USE_CDP
  let mode: BrowserMode = 'auto'
  if (process.env.BROWSER_MODE) {
    mode = process.env.BROWSER_MODE as BrowserMode
  } else if (process.env.USE_CDP === 'false') {
    mode = 'launch'
  }

  const useCdp = mode === 'cdp' || mode === 'auto'
  const autoLaunch = process.env.AUTO_LAUNCH_CHROME === 'true'
  const profileName =
    process.env.CHROME_PROFILE || process.env.CHROME_PROFILE_NAME || 'agent-profile-1'
  const userDataDir = process.env.USER_DATA_DIR || getDefaultUserDataDir(profileName)
  const headless = process.env.HEADLESS === 'true'

  const baseUrl =
    process.env.MIDSCENE_MODEL_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL
  const apiKey =
    process.env.MIDSCENE_MODEL_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.DASHSCOPE_API_KEY
  const modelName =
    process.env.MIDSCENE_MODEL_NAME || process.env.MIDSCENE_MODEL || 'gemini-2.5-flash'
  const modelFamily = process.env.MIDSCENE_MODEL_FAMILY || 'gemini'

  return {
    browser: {
      mode,
      port,
      host,
      url,
      useCdp,
      autoLaunch,
      profileName,
      userDataDir,
      headless,
    },
    midscene: {
      baseUrl,
      apiKey,
      modelName,
      modelFamily,
    },
  }
}

/**
 * 诊断检测报告对象
 */
export interface EnvironmentDiagnostic {
  nodeVersion: string
  browserMode: BrowserMode
  profileName: string
  userDataDir: string
  chromePath: string
  chromeExists: boolean
  cdpPort: number
  cdpAlive: boolean
  hasModelApiKey: boolean
  modelName: string
  allReady: boolean
}

/**
 * 诊断当前系统的运行环境、Node 版本、Chrome 安装路径、CDP 端口连通性及视觉大模型 Key 配置。
 *
 * @returns 环境诊断结果对象
 *
 * @example
 * ```ts
 * import { checkEnvironment } from '@lhvison/ai-e2e-base'
 * const diag = await checkEnvironment()
 * console.log('All Ready:', diag.allReady)
 * ```
 */
export async function checkEnvironment(): Promise<EnvironmentDiagnostic> {
  const cfg = getAiE2eConfig()
  const chromePath = getDefaultChromePath()
  const chromeExists = fs.existsSync(chromePath) || process.platform === 'linux'
  const cdpAlive = await isCdpAlive(cfg.browser.port, cfg.browser.host)
  const hasModelApiKey = Boolean(cfg.midscene.apiKey)

  return {
    nodeVersion: process.version,
    browserMode: cfg.browser.mode,
    profileName: cfg.browser.profileName,
    userDataDir: cfg.browser.userDataDir,
    chromePath,
    chromeExists,
    cdpPort: cfg.browser.port,
    cdpAlive,
    hasModelApiKey,
    modelName: cfg.midscene.modelName || 'gemini-2.5-flash',
    allReady: chromeExists && (cdpAlive || cfg.browser.mode !== 'cdp') && hasModelApiKey,
  }
}
