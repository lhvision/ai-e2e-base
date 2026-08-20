import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import {
  getAgentsMdTemplate,
  getFixtureTemplate,
  getPlaywrightConfigTemplate,
  getEnvExampleTemplate,
  getExampleSpecTemplate,
  getIsolatedPackageJsonTemplate,
  getCasesJsonTemplate,
  type TemplateOptions,
} from './templates.js'

export interface InitCliOptions {
  /** 是否强制使用独立隔离子目录模式 */
  isolated?: boolean
  /** 是否强制使用根目录集成模式 */
  inTree?: boolean
  /** 测试文件目标目录 (默认 'e2e') */
  dir?: string
  /** 被测本地服务地址 (默认 'http://localhost:5173') */
  url?: string
  /** 启动开发服务命令 (默认 'npm run dev') */
  devCommand?: string
  /** 是否跳过所有交互提示，使用默认配置 */
  yes?: boolean
  /** 基础库包名 (默认 '@lhvison/ai-e2e-base') */
  packageName?: string
}

function ask(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer))
  })
}

/**
 * 执行 AI E2E 初始化脚手架
 */
export async function runInit(options: InitCliOptions = {}): Promise<void> {
  const isInteractive = !options.yes && process.stdin.isTTY
  const currentMajorNode = parseInt(process.versions.node.split('.')[0], 10)
  const isNode24Plus = currentMajorNode >= 24

  let isIsolated = options.isolated ?? !isNode24Plus
  let targetDir = options.dir || 'e2e'
  let baseUrl = options.url || 'http://localhost:5173'
  let devCommand = options.devCommand || 'npm run dev'
  const packageName = options.packageName || '@lhvison/ai-e2e-base'

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    console.log('\n🚀 [ai-e2e init] 初始化 AI E2E 自动化测试环境\n')

    if (!isNode24Plus) {
      console.log(`⚠️  当前 Node.js 版本为 v${process.versions.node} (< v24.0.0)。`)
      console.log(`👉 推荐选择【独立隔离子目录模式】，以确保测试环境在 Node 24+ 下独立稳定运行。\n`)
    }

    // 1. 询问集成模式
    console.log('请选择集成模式：')
    console.log(
      `  1) 根目录集成 (In-Tree)       - 适合 Node >= 24 的现代项目${isNode24Plus ? ' (推荐)' : ''}`,
    )
    console.log(
      `  2) 独立隔离子目录 (Isolated)   - 适合 Node < 24 / 老项目 / 独立依赖环境${!isNode24Plus ? ' (推荐)' : ''}`,
    )
    const defaultModeChoice = isNode24Plus ? '1' : '2'
    const modeAnswer = await ask(rl, `选择模式 [1/2] (默认 ${defaultModeChoice}): `)
    if (modeAnswer.trim()) {
      isIsolated = modeAnswer.trim() === '2'
    }

    // 2. 询问目标目录名
    const dirAnswer = await ask(rl, `\n目标测试目录名称 (默认 ${targetDir}): `)
    if (dirAnswer.trim()) {
      targetDir = dirAnswer.trim()
    }

    // 3. 询问 Base URL
    const urlAnswer = await ask(rl, `\n被测本地服务 URL (默认 ${baseUrl}): `)
    if (urlAnswer.trim()) {
      baseUrl = urlAnswer.trim()
    }

    // 4. 询问开发启动命令
    const devAnswer = await ask(rl, `\n启动开发服务命令 (默认 ${devCommand}): `)
    if (devAnswer.trim()) {
      devCommand = devAnswer.trim()
    }

    rl.close()
  } else {
    // 非交互式
    if (options.inTree) {
      isIsolated = false
    } else if (options.isolated !== undefined) {
      isIsolated = options.isolated
    } else {
      isIsolated = !isNode24Plus
    }
  }

  const templateOptions: TemplateOptions = {
    targetDir,
    baseUrl,
    devCommand,
    isIsolated,
    packageName,
  }

  const targetFullPath = path.resolve(process.cwd(), targetDir)
  fs.mkdirSync(targetFullPath, { recursive: true })

  // 1. 写入 fixture.ts
  fs.writeFileSync(
    path.join(targetFullPath, 'fixture.ts'),
    getFixtureTemplate(packageName),
    'utf-8',
  )

  // 2. 写入 example.spec.ts
  fs.writeFileSync(path.join(targetFullPath, 'example.spec.ts'), getExampleSpecTemplate(), 'utf-8')

  // 3. 写入 cases.json (用例分组与优先级元数据)
  fs.writeFileSync(path.join(targetFullPath, 'cases.json'), getCasesJsonTemplate(), 'utf-8')

  // 4. 写入/增量更新 AGENTS.md (专供 AI Agent 阅读的自愈闭环规则)
  fs.writeFileSync(
    path.join(targetFullPath, 'AGENTS.md'),
    getAgentsMdTemplate(templateOptions),
    'utf-8',
  )
  const rootAgentsMd = path.resolve(process.cwd(), 'AGENTS.md')
  if (fs.existsSync(rootAgentsMd)) {
    const existingContent = fs.readFileSync(rootAgentsMd, 'utf-8')
    if (!existingContent.includes('AI E2E') && !existingContent.includes('ai-e2e')) {
      fs.appendFileSync(rootAgentsMd, '\n\n' + getAgentsMdTemplate(templateOptions), 'utf-8')
    }
  } else {
    fs.writeFileSync(rootAgentsMd, getAgentsMdTemplate(templateOptions), 'utf-8')
  }

  // 5. 写入 .env.example
  fs.writeFileSync(path.join(targetFullPath, '.env.example'), getEnvExampleTemplate(), 'utf-8')

  // 如果根目录没有 .env，复制一份作为初始配置
  const rootEnv = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(rootEnv)) {
    fs.writeFileSync(rootEnv, getEnvExampleTemplate(), 'utf-8')
  }

  if (isIsolated) {
    // 独立子目录模式：生成专属 package.json、playwright.config.ts 与 .nvmrc (Node 24)
    fs.writeFileSync(
      path.join(targetFullPath, 'package.json'),
      getIsolatedPackageJsonTemplate(packageName),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(targetFullPath, 'playwright.config.ts'),
      getPlaywrightConfigTemplate(templateOptions),
      'utf-8',
    )
    fs.writeFileSync(path.join(targetFullPath, '.nvmrc'), '24\n', 'utf-8')
  } else {
    // 根目录模式：在根目录创建 playwright.config.ts
    const rootPlaywrightConfig = path.resolve(process.cwd(), 'playwright.config.ts')
    if (!fs.existsSync(rootPlaywrightConfig)) {
      fs.writeFileSync(rootPlaywrightConfig, getPlaywrightConfigTemplate(templateOptions), 'utf-8')
    }

    // 尝试增量更新根目录 package.json scripts
    const rootPkgPath = path.resolve(process.cwd(), 'package.json')
    if (fs.existsSync(rootPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
        pkg.scripts = pkg.scripts || {}
        if (!pkg.scripts['ai-e2e:doctor']) pkg.scripts['ai-e2e:doctor'] = 'ai-e2e doctor'
        if (!pkg.scripts['ai-e2e:chrome']) pkg.scripts['ai-e2e:chrome'] = 'ai-e2e chrome'
        if (!pkg.scripts['ai-e2e:platform']) pkg.scripts['ai-e2e:platform'] = 'ai-e2e platform'
        if (!pkg.scripts['ai-e2e:yaml']) pkg.scripts['ai-e2e:yaml'] = 'ai-e2e yaml'
        if (!pkg.scripts['ai-e2e:test'] && !pkg.scripts['test:e2e']) pkg.scripts['ai-e2e:test'] = 'playwright test'
        fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
      } catch {}
    }
  }

  console.log('\n✨ [ai-e2e init] 初始化完成！生成文件清单：')
  console.log(`  📄 ${targetDir}/AGENTS.md           (AI Agent 自我修复测试指引)`)
  console.log(`  📄 ${targetDir}/fixture.ts         (增强版 Playwright × Midscene Fixture)`)
  console.log(`  📄 ${targetDir}/example.spec.ts    (基础 AI 视觉断言示例用例)`)
  console.log(`  📄 ${targetDir}/cases.json         (用例分组与优先级元数据)`)
  console.log(`  📄 ${targetDir}/.env.example       (模型 Key 与运行模式配置模板)`)
  if (isIsolated) {
    console.log(`  📄 ${targetDir}/package.json       (独立 Node 24+ 依赖环境)`)
    console.log(`  📄 ${targetDir}/playwright.config.ts`)
    console.log(`  📄 ${targetDir}/.nvmrc             (固定 Node 24)`)
  }

  console.log('\n🚀 下一步：')
  if (isIsolated) {
    console.log(`  1. 进入测试目录安装依赖:  cd ${targetDir} && pnpm install (或 npm install)`)
    console.log(`  2. 填写大模型 Key:       在 .env 中填入 MIDSCENE_MODEL_API_KEY`)
    console.log(`  3. 运行环境自检:         npx ai-e2e doctor`)
    console.log(`  4. 启动可视化看板:       npx ai-e2e platform`)
    console.log(`  5. 让 AI 开始写测并回归:   将 ${targetDir}/AGENTS.md 告知 AI Agent 即可！\n`)
  } else {
    console.log(`  1. 填写大模型 Key:       在 .env 中填入 MIDSCENE_MODEL_API_KEY`)
    console.log(`  2. 运行环境自检:         pnpm ai-e2e:doctor`)
    console.log(`  3. 启动可视化看板:       pnpm ai-e2e:platform`)
    console.log(`  4. 运行首条用例:         pnpm exec playwright test ${targetDir}/example.spec.ts`)
    console.log(`  5. 让 AI 开始写测并回归:   将 ${targetDir}/AGENTS.md 告知 AI Agent 即可！\n`)
  }
}
