import { spawn, type ChildProcess } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import {
  getDefaultChromePath,
  getDefaultUserDataDir,
  getManualChromeCommands,
  type ChromeLaunchCommandOptions,
} from './paths.js'

/**
 * Chrome CDP 协议返回的版本信息
 */
export interface CdpVersionInfo {
  Browser?: string
  'Protocol-Version'?: string
  'User-Agent'?: string
  'V8-Version'?: string
  'WebKit-Version'?: string
  webSocketDebuggerUrl?: string
}

/**
 * ensureChromeRunning 启动或复用结果
 */
export interface EnsureChromeResult {
  /** 调试端口 */
  port: number
  /** 主机地址 */
  host: string
  /** CDP 连接基础 URL (如 http://127.0.0.1:9222) */
  cdpUrl: string
  /** 是否复用了已存在的 Chrome 实例 (true 为复用，false 为新拉起) */
  reused: boolean
  /** 若为新拉起的进程，则包含对应 ChildProcess 句柄 */
  process?: ChildProcess
  /** Chrome 版本元数据 */
  versionInfo?: CdpVersionInfo
}

/**
 * 探测指定主机和端口上的 Chrome CDP 远程调试服务是否处于可用状态。
 *
 * @param port - CDP 调试端口 (默认 9222)
 * @param host - CDP 主机地址 (默认 '127.0.0.1')
 * @returns 是否可正常连接
 */
export async function isCdpAlive(port = 9222, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/json/version`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * 获取 Chrome CDP 远程调试 `/json/version` 接口的详细信息。
 *
 * @param port - CDP 调试端口 (默认 9222)
 * @param host - CDP 主机地址 (默认 '127.0.0.1')
 * @returns 版本信息对象，连接失败返回 null
 */
export async function getCdpVersionInfo(
  port = 9222,
  host = '127.0.0.1',
): Promise<CdpVersionInfo | null> {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/json/version`, { timeout: 1000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null)
        return
      }
      let raw = ''
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw))
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
  })
}

/**
 * 确保 Chrome 在指定端口处于运行状态（若已有进程正在监听则直接复用；未启动则自动拉起后台进程并轮询等待端口就绪）。
 *
 * @param options - 端口、配置名、超时时间等选项
 * @returns 包含连接地址与实例信息的 Promise
 *
 * @example
 * ```ts
 * import { ensureChromeRunning } from '@lhvision/ai-e2e-base'
 *
 * const res = await ensureChromeRunning({ port: 9222, profileName: 'agent-profile-1' })
 * console.log('CDP Ready at:', res.cdpUrl, 'Reused:', res.reused)
 * ```
 */
export async function ensureChromeRunning(
  options: ChromeLaunchCommandOptions & {
    host?: string
    timeoutMs?: number
    chromePath?: string
  } = {},
): Promise<EnsureChromeResult> {
  const port = options.port ?? 9222
  const host = options.host ?? '127.0.0.1'
  const profileName = options.profileName ?? 'agent-profile-1'
  const timeoutMs = options.timeoutMs ?? 10_000
  const cdpUrl = `http://${host}:${port}`

  const alive = await isCdpAlive(port, host)
  if (alive) {
    const versionInfo = (await getCdpVersionInfo(port, host)) || undefined
    return { port, host, cdpUrl, reused: true, versionInfo }
  }

  const chromePath = options.chromePath || getDefaultChromePath()
  const userDataDir = getDefaultUserDataDir(profileName)
  fs.mkdirSync(userDataDir, { recursive: true })

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]

  if (options.headless) {
    args.push('--headless=new')
  }

  let cp: ChildProcess | undefined
  try {
    cp = spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore',
    })
    cp.unref()
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err)
    const commands = getManualChromeCommands({ port, profileName })
    throw new Error(
      `无法自动启动 Chrome: ${errMessage}\n` +
        `请使用以下命令在终端手动启动 Chrome：\n\n${commands.current}\n`,
    )
  }

  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 200))
    if (await isCdpAlive(port, host)) {
      const versionInfo = (await getCdpVersionInfo(port, host)) || undefined
      return {
        port,
        host,
        cdpUrl,
        reused: false,
        process: cp,
        versionInfo,
      }
    }
  }

  const commands = getManualChromeCommands({ port, profileName })
  throw new Error(
    `等待 Chrome CDP 端口 (${port}) 就绪超时 (${timeoutMs}ms)。\n` +
      `建议手动启动 Chrome：\n\n${commands.current}\n`,
  )
}
