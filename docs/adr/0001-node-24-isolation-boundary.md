# Node 24 Isolation Boundary Strategy

## Context
AI-assisted testing tools rely on modern Node.js capabilities and modern TypeScript/ESM tooling. However, many enterprise and legacy repositories are pinned to older Node versions (Node 14/16/18/20/22) or legacy bundlers.

## Decision
We enforce a Node >= 24 requirement for direct root (In-Tree) installation. When initializing in environments with Node < 24 or legacy host dependencies, the CLI defaults to scaffolding an Isolated Workspace in a subfolder (e.g. `e2e/`) with its own `.nvmrc` (Node 24) and `package.json`, decoupling modern AI test execution from host runtime constraints.
