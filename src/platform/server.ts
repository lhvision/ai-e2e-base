import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { parseSpecFile, mergeCasesWithMetadata, type ParsedTestCase } from '../runner/parser.js'
import { runPlaywright, type RunPlaywrightResult } from '../runner/executor.js'
import { getPlatformUiHtml } from './ui.js'

export interface PlatformServerOptions {
  /** 监听端口 (默认 3000) */
  port?: number
  /** 监听主机 (默认 '127.0.0.1') */
  host?: string
  /** 测试用例所在目录 (默认 'e2e') */
  testDir?: string
  /** 用例元数据配置文件路径 (默认查找 testDir/cases.json 或 cases.json) */
  casesJsonPath?: string
  /** 执行历史记录保存路径 (默认 runs.json) */
  runsJsonPath?: string
  /** 项目根目录 (默认 process.cwd()) */
  rootDir?: string
}

export interface StoredRunRecord {
  id: string
  timestamp: number
  grep?: string
  specFiles?: string[]
  success: boolean
  durationMs: number
  results: RunPlaywrightResult['results']
}

/**
 * 递归查找目录下的所有 .spec.ts / .spec.js 测试文件
 */
function findSpecFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const files: string[] = []
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== 'dist' && item.name !== '.git') {
        files.push(...findSpecFiles(full))
      }
    } else if (item.isFile() && /\.spec\.(ts|js|mjs|mts)$/.test(item.name)) {
      files.push(full)
    }
  }
  return files
}

/**
 * 启动最小化零依赖 UI 回归测试平台 HTTP 服务
 */
export function startPlatformServer(
  options: PlatformServerOptions = {},
): Promise<{ server: http.Server; url: string }> {
  const port = options.port ?? 3000
  const host = options.host ?? '127.0.0.1'
  const rootDir = options.rootDir ?? process.cwd()
  const testDir = options.testDir ?? 'e2e'
  const testDirPath = path.isAbsolute(testDir) ? testDir : path.join(rootDir, testDir)

  const casesJsonPath =
    options.casesJsonPath ??
    [
      path.join(testDirPath, 'cases.json'),
      path.join(testDirPath, 'tests', 'cases.json'),
      path.join(rootDir, 'cases.json'),
      path.join(rootDir, testDir, 'cases.json'),
    ].find((p) => fs.existsSync(p))

  const runsJsonPath = options.runsJsonPath ?? path.join(rootDir, 'runs.json')

  const server = http.createServer(async (req, res) => {
    const reqUrl = req.url || '/'
    const parsedUrl = new URL(reqUrl, `http://${host}:${port}`)
    const pathname = parsedUrl.pathname
    const method = req.method?.toUpperCase() || 'GET'

    // 1. 首页：返回 Vercel 风格 Web 看板
    if (pathname === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(getPlatformUiHtml())
      return
    }

    // 2. API: 获取用例清单 (GET /api/cases)
    if (pathname === '/api/cases' && method === 'GET') {
      let searchDir = testDirPath
      if (!fs.existsSync(searchDir)) {
        const altTests = path.join(rootDir, 'tests')
        if (fs.existsSync(altTests)) {
          searchDir = altTests
        } else {
          searchDir = rootDir
        }
      }

      let specFiles = findSpecFiles(searchDir)
      if (specFiles.length === 0 && searchDir !== rootDir) {
        specFiles = findSpecFiles(rootDir)
      }

      let allCases: ParsedTestCase[] = []
      for (const f of specFiles) {
        const cases = parseSpecFile(f)
        allCases.push(...cases)
      }
      allCases = mergeCasesWithMetadata(allCases, casesJsonPath)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(allCases))
      return
    }

    // 3. API: 执行测试 (POST /api/run)
    if (pathname === '/api/run' && method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {}
          const { grep, specFiles } = payload

          const runResult = await runPlaywright({
            projectDir: rootDir,
            grep,
            specFiles,
          })

          // 保存历史记录到 runs.json
          const record: StoredRunRecord = {
            id: `run-${Date.now()}`,
            timestamp: Date.now(),
            grep,
            specFiles,
            success: runResult.success,
            durationMs: runResult.durationMs,
            results: runResult.results,
          }

          try {
            let existingRuns: StoredRunRecord[] = []
            if (fs.existsSync(runsJsonPath)) {
              existingRuns = JSON.parse(fs.readFileSync(runsJsonPath, 'utf-8'))
            }
            existingRuns.unshift(record)
            // 只保留最近 50 次记录
            if (existingRuns.length > 50) existingRuns = existingRuns.slice(0, 50)
            fs.writeFileSync(runsJsonPath, JSON.stringify(existingRuns, null, 2), 'utf-8')
          } catch (e) {
            console.warn('[Platform] 写入 runs.json 失败:', e)
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify(runResult))
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(
            JSON.stringify({
              code: 1,
              success: false,
              durationMs: 0,
              results: [],
              rawOutput: `[执行异常] ${message}`,
            }),
          )
        }
      })
      return
    }

    // 4. API: 获取历史运行记录 (GET /api/runs)
    if (pathname === '/api/runs' && method === 'GET') {
      let history: StoredRunRecord[] = []
      if (fs.existsSync(runsJsonPath)) {
        try {
          history = JSON.parse(fs.readFileSync(runsJsonPath, 'utf-8'))
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(history))
      return
    }

    // 5. 静态文件服务：Midscene 视觉 HTML 报告 (/midscene_run/report/*)
    if (pathname.startsWith('/midscene_run/report/')) {
      const relativeFile = pathname.replace('/midscene_run/report/', '')
      const reportFile = path.join(rootDir, 'midscene_run', 'report', relativeFile)
      if (fs.existsSync(reportFile) && fs.statSync(reportFile).isFile()) {
        const ext = path.extname(reportFile).toLowerCase()
        let contentType = 'text/html'
        if (ext === '.json') contentType = 'application/json'
        if (ext === '.png') contentType = 'image/png'
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
        if (ext === '.js') contentType = 'application/javascript'
        if (ext === '.css') contentType = 'text/css'

        res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` })
        fs.createReadStream(reportFile).pipe(res)
        return
      }
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
  })

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      const url = `http://${host}:${port}`
      resolve({ server, url })
    })
    server.on('error', reject)
  })
}
