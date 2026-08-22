# AI E2E Base

Zero-browser-install AI E2E automation testing library and SDK powered by Midscene and Playwright CDP.

## Language

**In-Tree Integration**:
Installing the library directly into the root `package.json` of modern Node.js projects (Node >= 24) where testing and application dependencies share the workspace.
_Avoid_: Monolithic setup, root install, embedded mode

**Isolated Workspace**:
A standalone subdirectory (e.g. `e2e/`) with its own `package.json`, `.nvmrc`, and locked dependencies for projects restricted to legacy Node versions (< 24).
_Avoid_: Sub-project, sandbox folder, legacy wrapper

**Regression Platform**:
A lightweight, zero-external-dependency web server and Vercel-style dashboard for listing test cases, triggering filtered test runs, streaming execution logs, and reviewing Midscene visual HTML reports.
_Avoid_: Test dashboard, web GUI, test portal

**CDP Mode**:
A zero-browser-download testing mode connecting over Chrome DevTools Protocol to a local Google Chrome or Edge instance running on a debug port.
_Avoid_: Remote browser, CDP attach, external chrome

**Persistent Profile**:
A dedicated browser user-data directory preserving authentication sessions (cookies, local storage, 2FA/SSO) across repeated test runs without re-login scripts.
_Avoid_: Session store, auth cache, user profile

**AI Fixture**:
An augmented Playwright test fixture binding Midscene visual model capabilities (`aiAssert`, `aiTap`, `aiInput`, `aiWaitFor`) with adaptive browser context lifecycle management.
_Avoid_: Custom test, midscene wrapper, test context

**Spec Parser**:
A static regex analyzer extracting test case titles, line numbers, and suites from `.spec.ts` files without executing JavaScript runtime code.
_Avoid_: AST parser, test scanner, code crawler

**Self-Healing Loop**:
An agent workflow guiding coding AI models to write tests, execute focused single cases, inspect visual HTML reports upon failure, and self-correct code until all assertions pass.
_Avoid_: Auto fix, repair cycle, agent loop

**Route Deep-Linking**:
Directly navigating to deep target URLs (`gotoRoute`) leveraging persistent authentication sessions, bypassing repetitive multi-step UI traversal from the home page.
_Avoid_: Page roaming, step navigation, manual login flow

**Silent Headless Execution**:
Defaulting to background, non-intrusive headless browser instances for standard sandbox (`launch`) and profile-mounted (`persistent`) modes, preventing window popups and focus interruptions during active AI coding sessions.
_Avoid_: Background runner, silent browser, headless daemon

