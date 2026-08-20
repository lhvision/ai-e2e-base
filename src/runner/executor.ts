import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import { parsePlaywrightJsonReport, type ParsedRunResult } from './reporter.js'

/**
 * 编程式运行 Playwright 的配置选项
 */
export interface RunPlaywrightOptions {
  /** 执行测试的目标项目根目录 (默认 process.cwd()) */
  projectDir?: string
  /** 用例标题/分组过滤正则 (-g 参数) */
  grep?: string
  /** 指定执行的 spec 文件列表 */
  specFiles?: string[]
  /** 自定义环境变量注入 */
  env?: Record<string, string>
  /** 标准输出分块回调 */
  onStdout?: (chunk: string) => void
  /** 标准错误分块回调 */
  onStderr?: (chunk: string) => void
  /** 按行实时输出回调（适合流式日志看板） */
  onLine?: (line: string) => void
}

/**
 * Playwright 测试执行结果
 */
export interface RunPlaywrightResult {
  /** 子进程退出码 (0 为全通过) */
  code: number
  /** 是否全部用例执行成功 */
  success: boolean
  /** 总执行耗时 (毫秒) */
  durationMs: number
  /** 解析后的结构化用例列表与结果 */
  results: ParsedRunResult[]
  /** 终端原始文本输出 */
  rawOutput: string
  /** Playwright 原始 JSON 报告对象 */
  rawJson?: unknown
}

/**
 * 运行 Midscene YAML 脚本配置选项
 */
export interface RunMidsceneYamlOptions {
  /** 执行测试的目标项目根目录 (默认 process.cwd()) */
  projectDir?: string
  /** 自定义环境变量注入 */
  env?: Record<string, string>
  /** 标准输出分块回调 */
  onStdout?: (chunk: string) => void
  /** 标准错误分块回调 */
  onStderr?: (chunk: string) => void
  /** 按行实时输出回调 */
  onLine?: (line: string) => void
}

/**
 * Midscene YAML 测试执行结果
 */
export interface RunMidsceneYamlResult {
  /** 退出码 (0 为成功) */
  code: number
  /** 是否执行成功 */
  success: boolean
  /** 总耗时 (毫秒) */
  durationMs: number
  /** 终端原始文本输出 */
  rawOutput: string
  /** 执行的 YAML 文件路径 */
  yamlFile: string
}

/**
 * 编程式执行 Playwright + Midscene 测试用例。
 *
 * @param options - 执行参数（支持过滤、流式输出、目录指定）
 * @returns 包含结构化结果、耗时和 Midscene 报告路径的执行结果 Promise
 *
 * @example
 * ```ts
 * import { runPlaywright } from '@lhvison/ai-e2e-base'
 *
 * const res = await runPlaywright({
 *   grep: '用户登录',
 *   onLine: (line) => console.log('[Log]', line)
 * })
 * console.log('Passed:', res.success, 'Duration:', res.durationMs)
 * ```
 */
export async function runPlaywright(
  options: RunPlaywrightOptions = {},
): Promise<RunPlaywrightResult> {
  const projectDir = options.projectDir || process.cwd()
  const startTime = Date.now()

  // 智能选择包管理器执行工具
  const hasPnpmLock = fs.existsSync(`${projectDir}/pnpm-lock.yaml`)
  const cmd = hasPnpmLock ? 'pnpm' : 'npx'
  const baseArgs = hasPnpmLock ? ['exec', 'playwright', 'test'] : ['playwright', 'test']

  const args = [...baseArgs, '--reporter=json,list']

  if (options.grep) {
    args.push('-g', options.grep)
  }

  if (options.specFiles && options.specFiles.length > 0) {
    for (const f of options.specFiles) {
      args.push(f)
    }
  }

  const customEnv = {
    ...process.env,
    ...options.env,
  }

  return new Promise((resolve) => {
    const cp: ChildProcess = spawn(cmd, args, {
      cwd: projectDir,
      env: customEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''
    let lineRemainder = ''

    cp.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      stdoutBuffer += text
      options.onStdout?.(text)

      // 按行切分回调
      const lines = (lineRemainder + text).split('\n')
      lineRemainder = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) {
          options.onLine?.(line)
        }
      }
    })

    cp.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      stderrBuffer += text
      options.onStderr?.(text)
    })

    cp.on('close', (code) => {
      const durationMs = Date.now() - startTime
      let parsedJson: unknown = null

      // 从输出中截取 JSON 报告（Playwright JSON 报告以 {"config": 开头）
      const jsonStartIndex = stdoutBuffer.indexOf('{"config":')
      if (jsonStartIndex !== -1) {
        try {
          const jsonStr = stdoutBuffer.slice(jsonStartIndex)
          parsedJson = JSON.parse(jsonStr)
        } catch {
          const lastOpen = stdoutBuffer.lastIndexOf('{"config":')
          const lastClose = stdoutBuffer.lastIndexOf('}')
          if (lastOpen !== -1 && lastClose > lastOpen) {
            try {
              parsedJson = JSON.parse(stdoutBuffer.slice(lastOpen, lastClose + 1))
            } catch {}
          }
        }
      }

      const results = parsedJson ? parsePlaywrightJsonReport(parsedJson, projectDir) : []

      resolve({
        code: code ?? 1,
        success: code === 0,
        durationMs,
        results,
        rawOutput: stdoutBuffer + '\n' + stderrBuffer,
        rawJson: parsedJson,
      })
    })
  })
}

/**
 * 编程式执行 Midscene YAML 自动化脚本（如 `midscene ./e2e/yaml/panel-not-covered.yaml`）。
 *
 * @param yamlPath - YAML 文件路径
 * @param options - 执行参数
 * @returns 包含状态与耗时的执行结果 Promise
 *
 * @example
 * ```ts
 * import { runMidsceneYaml } from '@lhvison/ai-e2e-base'
 *
 * const res = await runMidsceneYaml('e2e/yaml/test.yaml', {
 *   onLine: (line) => console.log(line)
 * })
 * ```
 */
export async function runMidsceneYaml(
  yamlPath: string,
  options: RunMidsceneYamlOptions = {},
): Promise<RunMidsceneYamlResult> {
  const projectDir = options.projectDir || process.cwd()
  const startTime = Date.now()

  const hasPnpmLock = fs.existsSync(`${projectDir}/pnpm-lock.yaml`)
  const cmd = hasPnpmLock ? 'pnpm' : 'npx'
  const args = hasPnpmLock ? ['exec', 'midscene', yamlPath] : ['midscene', yamlPath]

  const customEnv = {
    ...process.env,
    ...options.env,
  }

  return new Promise((resolve) => {
    const cp: ChildProcess = spawn(cmd, args, {
      cwd: projectDir,
      env: customEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''
    let lineRemainder = ''

    cp.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      stdoutBuffer += text
      options.onStdout?.(text)

      const lines = (lineRemainder + text).split('\n')
      lineRemainder = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) {
          options.onLine?.(line)
        }
      }
    })

    cp.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      stderrBuffer += text
      options.onStderr?.(text)
    })

    cp.on('close', (code) => {
      resolve({
        code: code ?? 1,
        success: code === 0,
        durationMs: Date.now() - startTime,
        rawOutput: stdoutBuffer + '\n' + stderrBuffer,
        yamlFile: yamlPath,
      })
    })
  })
}
