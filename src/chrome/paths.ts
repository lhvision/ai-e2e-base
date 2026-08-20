import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * Chrome 启动命令生成选项
 */
export interface ChromeLaunchCommandOptions {
  /** 远程调试端口 (默认 9222) */
  port?: number
  /** 独立配置名 (默认 'agent-profile-1') */
  profileName?: string
  /** 是否以无头模式启动 */
  headless?: boolean
}

/**
 * 自动查找当前操作系统中已安装的 Google Chrome / Chromium / Edge / Brave 可执行文件绝对路径。
 *
 * @returns 探测到的浏览器可执行文件路径，若未探测到则返回默认命令名
 *
 * @example
 * ```ts
 * import { getDefaultChromePath } from '@lhvision/ai-e2e-base'
 * const chromePath = getDefaultChromePath()
 * console.log('Found Chrome at:', chromePath)
 * ```
 */
export function getDefaultChromePath(): string {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH
  }

  const platform = process.platform

  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ]
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p
    }
    return macPaths[0]
  }

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || ''
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const winPaths = [
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    ]
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p
    }
    return winPaths[0]
  }

  // Linux 平台
  const linuxPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/microsoft-edge',
    '/usr/bin/brave-browser',
  ]
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p
  }

  return 'google-chrome'
}

/**
 * 获取跨平台的独立 Chrome 登录态用户数据目录。
 *
 * @param profileName - 隔离配置名称 (默认 'agent-profile-1')
 * @returns 对应平台下的目录绝对路径 (如 ~/.chrome-profiles/agent-profile-1)
 */
export function getDefaultUserDataDir(profileName = 'agent-profile-1'): string {
  return path.join(os.homedir(), '.chrome-profiles', profileName)
}

/**
 * 生成 macOS / Windows / Linux 各平台下可直接复制执行的 Chrome 启动命令提示。
 *
 * @param options - 端口与配置参数
 * @returns 包含各平台及当前平台命令的对象
 */
export function getManualChromeCommands(options: ChromeLaunchCommandOptions = {}): {
  mac: string
  win: string
  linux: string
  current: string
} {
  const port = options.port ?? 9222
  const profile = options.profileName ?? 'agent-profile-1'

  const mac = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\\n  --remote-debugging-port=${port} \\\n  --user-data-dir="$HOME/.chrome-profiles/${profile}"`

  const win = `& "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \`\n  --remote-debugging-port=${port} \`\n  --user-data-dir="$env:USERPROFILE\\.chrome-profiles\\${profile}"`

  const linux = `google-chrome --remote-debugging-port=${port} --user-data-dir="$HOME/.chrome-profiles/${profile}"`

  let current = linux
  if (process.platform === 'darwin') {
    current = mac
  } else if (process.platform === 'win32') {
    current = win
  }

  return { mac, win, linux, current }
}
