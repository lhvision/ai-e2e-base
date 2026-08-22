import fs from 'node:fs'
import path from 'node:path'

/**
 * 静态解析出的单个测试用例描述信息
 */
export interface ParsedTestCase {
  /** 唯一用例标识符 (如 example.spec.ts:12:首页加载) */
  id: string
  /** 用例标题 */
  title: string
  /** 完整用例标题（包含 describe 分组层级） */
  fullTitle: string
  /** 文件路径 */
  file: string
  /** 所在代码行号 */
  line: number
  /** 外层 describe 分组名称 */
  describe?: string
  /** 用例优先级 */
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
  /** 归属功能模块或业务分组 */
  group?: string
}

/**
 * 纯静态文本/正则分析单个 `.spec.ts` 文件中的测试用例清单（不执行任何 JavaScript 运行时代码）。
 *
 * @param filePath - 待分析的 spec 文件路径
 * @returns 解析出的用例清单数组
 *
 * @example
 * ```ts
 * import { parseSpecFile } from '@lhvision/ai-e2e-base'
 *
 * const cases = parseSpecFile('e2e/home.spec.ts')
 * console.log(cases.map(c => `${c.title} (line ${c.line})`))
 * ```
 */
export function parseSpecFile(filePath: string): ParsedTestCase[] {
  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const cases: ParsedTestCase[] = []

  const describeStack: { title: string; startDepth: number }[] = []
  let currentBraceDepth = 0

  const describeRegex = /test\.describe(?:\.only|\.skip|\.serial|\.parallel)?\s*\(\s*['"`](.*?)['"`]/
  const testRegex = /test(?:\.only|\.skip|\.fixme)?\s*\(\s*['"`](.*?)['"`]/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 检查闭合括号并弹出已结束的 describe 作用域
    const openCount = (line.match(/\{/g) || []).length
    const closeCount = (line.match(/\}/g) || []).length

    const describeMatch = line.match(describeRegex)
    if (describeMatch) {
      describeStack.push({
        title: describeMatch[1],
        startDepth: currentBraceDepth,
      })
    } else {
      const testMatch = line.match(testRegex)
      if (testMatch) {
        const title = testMatch[1]
        const describeTitle = describeStack.map((d) => d.title).join(' > ')
        const fullTitle = describeTitle ? `${describeTitle} > ${title}` : title
        cases.push({
          id: `${path.basename(filePath)}:${lineNum}:${title}`,
          title,
          fullTitle,
          file: filePath,
          line: lineNum,
          describe: describeTitle || undefined,
        })
      }
    }

    currentBraceDepth += openCount - closeCount
    while (
      describeStack.length > 0 &&
      currentBraceDepth <= describeStack[describeStack.length - 1].startDepth
    ) {
      describeStack.pop()
    }
  }

  return cases
}

/**
 * 结合 `cases.json` 补充用例分组与优先级元数据。
 *
 * @param cases - 静态解析出来的用例列表
 * @param casesJsonPath - cases.json 配置文件路径
 * @returns 合并了分组与优先级信息的用例列表
 */
export function mergeCasesWithMetadata(
  cases: ParsedTestCase[],
  casesJsonPath?: string,
): ParsedTestCase[] {
  if (!casesJsonPath || !fs.existsSync(casesJsonPath)) {
    return cases
  }

  try {
    const raw = fs.readFileSync(casesJsonPath, 'utf-8')
    const metadata: Record<string, { group?: string; priority?: 'P0' | 'P1' | 'P2' | 'P3' }> =
      JSON.parse(raw)

    return cases.map((c) => {
      const meta = metadata[c.title] || metadata[c.fullTitle]
      if (meta) {
        return {
          ...c,
          group: meta.group || c.group,
          priority: meta.priority || c.priority,
        }
      }
      return c
    })
  } catch (e) {
    console.warn('[ai-e2e] 读取 cases.json 失败:', e)
    return cases
  }
}
