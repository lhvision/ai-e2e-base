#!/usr/bin/env node

import fs from 'node:fs'
import { checkEnvironment, getAiE2eConfig } from '../config/index.js'
import { ensureChromeRunning, getManualChromeCommands } from '../chrome/index.js'
import { runPlaywright, runMidsceneYaml } from '../runner/index.js'
import { runInit } from '../init/index.js'
import { startPlatformServer } from '../platform/index.js'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (args.includes('-v') || args.includes('--version') || command === 'version' || command === '-v') {
    let version = '0.1.0'
    try {
      const pkgUrl = new URL('../../package.json', import.meta.url)
      const raw = fs.readFileSync(pkgUrl, 'utf-8')
      version = JSON.parse(raw).version || version
    } catch {}
    console.log(`@lhvision/ai-e2e-base v${version}`)
    return
  }

  if (
    !command ||
    args.includes('-h') ||
    args.includes('--help') ||
    args.includes('--hlep') ||
    command === 'help'
  ) {
    console.log(`
AI E2E 自动化测试命令行工具 (@lhvision/ai-e2e-base)

用法:
  ai-e2e <command> [options]

核心命令:
  init      一键初始化测试环境并增量配置 AGENTS.md 与 .gitignore
            选项:
              --isolated                  强制使用独立隔离子目录模式 (Node < 24 推荐)
              --in-tree                   强制使用根目录集成模式 (Node >= 24 推荐)
              --dir <path>                指定测试目录名称 (默认: e2e)
              --url <url>                 被测本地服务地址 (默认: http://localhost:5173)
              --dev <cmd>                 启动开发服务命令 (默认: npm run dev)
              --skip-browser-download     跳过 Playwright 浏览器内核下载，复用本地 Chrome
              -y, --yes                   跳过所有交互提示，使用默认配置

  platform  启动极简零依赖 Web 回归测试看板 (支持用例分组、一键触发与视觉报告回放)
            别名: ui, dashboard
            选项:
              --port <port>               指定看板监听端口 (默认: 3000)
              --dir <path>                指定测试用例扫描目录 (默认: e2e)

  doctor    环境自检（Node 版本、Chrome 安装路径、CDP 9222 连通性、大模型 Key 与配置）

  chrome    启动或获取独立 Chrome 调试端口实例 (支持扫码一次并永久持久化登录态)
            别名: launch-chrome
            选项:
              --show                      仅打印当前操作系统适配的 Chrome 启动命令，不拉起进程
              --headless                  以无头模式在后台拉起 Chrome 实例

  run       运行 Playwright + Midscene 测试用例 (支持 .spec.ts / .yaml 文件)
            别名: test
            选项:
              -g <regex>                  按用例标题或分组正则过滤执行
              [files...]                  指定待执行的一个或多个测试文件

  yaml      执行独立 Midscene YAML 自动化脚本
            用法: ai-e2e yaml <file.yaml>

通用选项:
  -v, --version                           查看当前 CLI 版本号
  -h, --help                              查看帮助信息
`)
    return
  }

  if (command === 'init') {
    const isIsolated = args.includes('--isolated')
    const isInTree = args.includes('--in-tree')
    const isYes = args.includes('-y') || args.includes('--yes')
    const skipBrowserDownload =
      args.includes('--skip-browser-download') ||
      args.includes('--no-browser-download') ||
      args.includes('--skip-chrome')

    const dirIdx = args.indexOf('--dir')
    const dir = dirIdx !== -1 ? args[dirIdx + 1] : undefined

    const urlIdx = args.indexOf('--url')
    const url = urlIdx !== -1 ? args[urlIdx + 1] : undefined

    const devIdx = args.indexOf('--dev')
    const devCommand = devIdx !== -1 ? args[devIdx + 1] : undefined

    await runInit({
      isolated: isIsolated ? true : isInTree ? false : undefined,
      inTree: isInTree,
      dir,
      url,
      devCommand,
      yes: isYes,
      skipBrowserDownload: skipBrowserDownload ? true : undefined,
    })
    return
  }

  if (command === 'platform' || command === 'ui' || command === 'dashboard') {
    const portIdx = args.indexOf('--port')
    const port = portIdx !== -1 ? Number(args[portIdx + 1]) : 3000

    const dirIdx = args.indexOf('--dir')
    const testDir = dirIdx !== -1 ? args[dirIdx + 1] : 'e2e'

    const { url } = await startPlatformServer({
      port,
      testDir,
      rootDir: process.cwd(),
    })

    console.log(`\n🚀 [ai-e2e platform] 回归测试看板已启动: ${url}`)
    console.log(`  • 测试用例目录: ${testDir}/`)
    console.log(`  • 可以在浏览器中直接查看用例、执行测试与预览 Midscene 视觉报告\n`)
    return
  }

  if (command === 'doctor') {
    console.log('\n🔍 [ai-e2e] 检查 AI E2E 环境配置:\n')
    const diag = await checkEnvironment()

    console.log(`  • Node.js:          ${diag.nodeVersion}`)
    console.log(
      `  • 浏览器模式 (Mode): ${diag.browserMode} (可选: auto | cdp | persistent | launch)`,
    )
    console.log(`  • 登录态 Profile:   ${diag.profileName} (${diag.userDataDir})`)
    console.log(
      `  • Chrome 可执行文件: ${diag.chromePath} ${diag.chromeExists ? '✅' : '⚠️ (未探测到)'}`,
    )
    console.log(
      `  • CDP 调试端口:     ${diag.cdpPort} ${diag.cdpAlive ? '✅ (已就绪/已连接)' : '❌ (未运行)'}`,
    )
    console.log(
      `  • AI 视觉模型 Key:  ${diag.hasModelApiKey ? '✅ (已配置)' : '⚠️ (未配置 MIDSCENE_MODEL_API_KEY)'}`,
    )
    console.log(
      `  • AI 视觉模型名称:  ${diag.modelName ? `✅ (${diag.modelName})` : '⚠️ (未配置，将使用 Midscene 默认模型)'}`,
    )

    if (!diag.cdpAlive && (diag.browserMode === 'auto' || diag.browserMode === 'cdp')) {
      console.log(
        '\n💡 提示：如果想使用零内核下载/复用已有浏览器，可在终端运行以下命令启动 Chrome：\n',
      )
      const cmd = getManualChromeCommands({ port: diag.cdpPort, profileName: diag.profileName })
      console.log(cmd.current + '\n')
    } else {
      console.log('\n🎉 环境一切就绪，可直接执行 AI E2E 测试！\n')
    }
    return
  }

  if (command === 'chrome' || command === 'launch-chrome') {
    const showOnly = args.includes('--show')
    const headless = args.includes('--headless')
    const cfg = getAiE2eConfig()

    if (showOnly) {
      const cmd = getManualChromeCommands({
        port: cfg.browser.port,
        profileName: cfg.browser.profileName,
      })
      console.log('\n📋 当前系统启动命令：\n')
      console.log(cmd.current + '\n')
      return
    }

    console.log(
      `\n🚀 正在启动 Chrome (端口: ${cfg.browser.port}, 配置: ${cfg.browser.profileName})...`,
    )
    try {
      const res = await ensureChromeRunning({
        port: cfg.browser.port,
        profileName: cfg.browser.profileName,
        headless,
      })
      if (res.reused) {
        console.log(`✅ 已连接到已存在的 Chrome 实例 (http://127.0.0.1:${cfg.browser.port})`)
      } else {
        console.log(`✅ Chrome 启动成功并监听端口 http://127.0.0.1:${cfg.browser.port}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`❌ 启动失败:`, msg)
    }
    return
  }

  if (command === 'yaml') {
    const yamlFile = args[1]
    if (!yamlFile) {
      console.error('❌ 请指定待执行的 YAML 脚本路径。例如: ai-e2e yaml e2e/yaml/test.yaml')
      process.exit(1)
    }

    console.log(`📄 正在执行 Midscene YAML 脚本: ${yamlFile}`)
    const result = await runMidsceneYaml(yamlFile, {
      onLine: (line) => console.log(line),
    })

    if (!result.success) {
      process.exit(1)
    }
    return
  }

  if (command === 'run' || command === 'test') {
    const passArgs = args.slice(1)
    const grepIdx = passArgs.indexOf('-g')
    const grep = grepIdx !== -1 ? passArgs[grepIdx + 1] : undefined

    const specFiles: string[] = []
    for (let i = 0; i < passArgs.length; i++) {
      if (passArgs[i] === '-g') {
        i++ // 跳过 -g 的参数值
        continue
      }
      if (!passArgs[i].startsWith('-')) {
        specFiles.push(passArgs[i])
      }
    }

    // 若目标文件是 .yaml / .yml，智能分流至 runMidsceneYaml
    if (specFiles.length === 1 && (specFiles[0].endsWith('.yaml') || specFiles[0].endsWith('.yml'))) {
      console.log(`📄 正在执行 Midscene YAML 脚本: ${specFiles[0]}`)
      const result = await runMidsceneYaml(specFiles[0], {
        onLine: (line) => console.log(line),
      })
      if (!result.success) {
        process.exit(1)
      }
      return
    }

    console.log('🧪 正在执行测试...')
    const result = await runPlaywright({
      grep,
      specFiles: specFiles.length > 0 ? specFiles : undefined,
      onLine: (line) => console.log(line),
    })

    if (!result.success) {
      process.exit(1)
    }
    return
  }

  console.log(`❌ 未知命令: ${command}。运行 ai-e2e -h 查看可用命令。`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
