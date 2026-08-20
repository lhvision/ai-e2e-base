# AI Agent 开发指南 (@lhvison/ai-e2e-base)

> 本指南专为在此仓库中进行功能迭代、重构或 Bug 修复的 AI Coding Agent 编写。

---

## 🎯 仓库定位与核心架构
本仓库为**零内核下载、长效登录态持久化、自带极简 Web 看板的 AI E2E 基础库与 SDK**。

### 模块结构一览
- `src/chrome/`：跨平台 Chrome 路径嗅探、CDP 端口连通性探测与实例自启动管理；
- `src/config/`：环境变量解析（`BROWSER_MODE`、Profile 路径、大模型 API Key）；
- `src/fixture/`：增强版 Playwright Fixture（智能路由 CDP / Persistent Profile / 标准沙箱，并解构 Midscene AI 方法）；
- `src/runner/`：用例正则静态提取、`cases.json` 元数据合并、多包管理器执行器与 Midscene 视觉报告匹配；
- `src/platform/`：基于 Node 标准库（零外部依赖）的 HTTP Web 服务与 Vercel 风格测试看板；
- `src/init/`：一键初始化脚手架（Node >= 24 根目录增量集成 vs Node < 24 独立隔离工作区）；
- `src/bin/cli.ts`：`ai-e2e` CLI 入口命令（`doctor`、`platform`、`chrome`、`init`、`run`）。

---

## 📜 编码与实现约定
1. **轻量极简原则**：避免过度设计，绝不为单一实现引入冗余的接口抽象；
2. **零多余依赖**：优先使用 Node.js 原生标准库（`http`, `fs`, `path`, `child_process`），避免引入体积庞大的第三方框架；
3. **Node 24 基线**：本仓库与根目录集成模式以 Node >= 24 为目标运行环境；老项目通过 Isolated Workspace 隔离；
4. **TSDoc 完整性**：所有公共导出的函数、类型与选项必须具备完整的 TSDoc 注释（含 `@param`, `@returns`, `@example`）。

---

## ⚡ 常用开发与验证命令
- **构建打包**：`pnpm build`（基于 tsdown 输出 ESM 产物与 DTS 声明）
- **环境自检**：`node ./dist/bin/cli.mjs doctor`
- **本地启动测试看板**：`node ./dist/bin/cli.mjs platform`
- **本地 Chrome 启动测试**：`node ./dist/bin/cli.mjs chrome --show`
