import fs from 'node:fs'
import path from 'node:path'

/**
 * Midscene 视觉 HTML 报告信息
 */
export interface MidsceneReportInfo {
  /** 报告文件名 (如 merged-report.html) */
  filename: string
  /** 报告绝对路径 */
  fullPath: string
  /** 相对 URL 路径 (如 /midscene_run/report/merged-report.html) */
  relativeUrl: string
  /** 文件修改时间戳 (毫秒) */
  mtime: number
  /** 文件大小 (字节) */
  sizeBytes: number
}

/**
 * 单条测试用例执行结果（包含状态、耗时与 Midscene 视觉报告关联）
 */
export interface ParsedRunResult {
  /** 测试套件标题 (包含父级 describe) */
  suiteTitle: string
  /** 测试用例标题 */
  testTitle: string
  /** 最终执行状态 */
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'unknown'
  /** 运行耗时 (毫秒) */
  durationMs: number
  /** 错误堆栈/提示信息（若失败） */
  errorMessage?: string
  /** 关联的最新 Midscene 视觉 HTML 报告绝对路径 */
  midsceneReportPath?: string
  /** 关联的最新 Midscene 视觉 HTML 报告相对访问 URL */
  midsceneReportUrl?: string
}

interface PlaywrightJsonTestResult {
  status: string
  duration: number
  error?: { message?: string }
  errors?: Array<{ message?: string }>
}

interface PlaywrightJsonSpec {
  title: string
  tests?: Array<{
    results?: PlaywrightJsonTestResult[]
  }>
}

interface PlaywrightJsonSuite {
  title: string
  specs?: PlaywrightJsonSpec[]
  suites?: PlaywrightJsonSuite[]
}

interface PlaywrightJsonRoot {
  suites?: PlaywrightJsonSuite[]
}

/**
 * 扫描项目下的 `midscene_run/report/` 目录获取所有 Midscene HTML 视觉报告，按修改时间倒序排列。
 *
 * @param rootDir - 项目根目录路径 (默认 process.cwd())
 * @returns 报告元数据数组（最新报告排在首位）
 */
export function getMidsceneReports(rootDir = process.cwd()): MidsceneReportInfo[] {
  const reportDir = path.join(rootDir, 'midscene_run', 'report')
  if (!fs.existsSync(reportDir)) {
    return []
  }

  const files = fs.readdirSync(reportDir)
  const results: MidsceneReportInfo[] = []

  for (const file of files) {
    if (!file.endsWith('.html')) continue
    const fullPath = path.join(reportDir, file)
    const stat = fs.statSync(fullPath)
    results.push({
      filename: file,
      fullPath,
      relativeUrl: `/midscene_run/report/${file}`,
      mtime: stat.mtimeMs,
      sizeBytes: stat.size,
    })
  }

  return results.sort((a, b) => b.mtime - a.mtime)
}

/**
 * 获取最新生成的一份 Midscene HTML 视觉报告。
 *
 * @param rootDir - 项目根目录路径 (默认 process.cwd())
 * @returns 最新报告元数据，若无报告则返回 null
 */
export function getLatestMidsceneReport(rootDir = process.cwd()): MidsceneReportInfo | null {
  const list = getMidsceneReports(rootDir)
  return list[0] || null
}

/**
 * 将 Playwright 输出的 JSON 报告结构化并关联对应的 Midscene 视觉 HTML 回放报告。
 *
 * @param jsonReport - Playwright JSON 报告原始对象
 * @param rootDir - 项目根目录 (用于查找报告目录)
 * @returns 扁平结构化的用例结果数组
 */
export function parsePlaywrightJsonReport(
  jsonReport: unknown,
  rootDir = process.cwd(),
): ParsedRunResult[] {
  const root = jsonReport as PlaywrightJsonRoot
  if (!root || !Array.isArray(root.suites)) {
    return []
  }

  const results: ParsedRunResult[] = []
  const latestReport = getLatestMidsceneReport(rootDir)

  function walkSuite(suite: PlaywrightJsonSuite, parentTitle = '') {
    const suiteTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const testItem of spec.tests || []) {
          for (const result of testItem.results || []) {
            let status: ParsedRunResult['status'] = 'unknown'
            if (result.status === 'passed') status = 'passed'
            else if (result.status === 'failed') status = 'failed'
            else if (result.status === 'timedOut') status = 'timedOut'
            else if (result.status === 'skipped') status = 'skipped'

            let errorMessage = result.error?.message
            if (!errorMessage && result.errors?.length) {
              errorMessage = result.errors
                .map((e) => {
                  if (typeof e === 'object' && e !== null && 'message' in e) {
                    return String((e as { message: unknown }).message)
                  }
                  if (typeof e === 'string') {
                    return e
                  }
                  return JSON.stringify(e)
                })
                .join('\n')
            }

            results.push({
              suiteTitle: suiteTitle || spec.title,
              testTitle: spec.title,
              status,
              durationMs: result.duration || 0,
              errorMessage,
              midsceneReportPath: latestReport?.fullPath,
              midsceneReportUrl: latestReport?.relativeUrl,
            })
          }
        }
      }
    }

    if (suite.suites) {
      for (const child of suite.suites) {
        walkSuite(child, suiteTitle)
      }
    }
  }

  for (const rootSuite of root.suites) {
    walkSuite(rootSuite)
  }

  return results
}
