# Zero-Dependency Dual-Mode Regression Platform

## Context
Running automated tests and reviewing Midscene visual HTML reports usually requires either command-line execution or setting up a full-featured web testing dashboard with external database and web frameworks.

## Decision
We implement a zero-dependency HTTP web server using only Node.js standard modules (`node:http`, `node:fs`, `node:path`, `node:child_process`). We provide dual delivery:
1. Built into the CLI (`ai-e2e platform` / `ai-e2e ui`) for zero-installation on-demand execution and visual review;
2. Exportable via `ai-e2e init --platform` as standalone `platform/` files (`server.mjs` + `public/`) for repositories needing custom test portal logic.
