# Default Headless Execution Strategy

## Context
When executing AI-assisted end-to-end tests during active coding workflows, launching headed browser windows by default repeatedly steals window focus and interrupts developer concentration. Midscene visual models and Playwright can capture high-fidelity viewport screenshots and execute assertions completely in memory/headless mode.

## Decision
We enforce a default **Silent Headless Execution** (`headless: true`) strategy across all local sandbox (`launch`) and profile-mounted (`persistent`) execution modes.

To preserve authentication and debugging capabilities:
1. **Decoupled Authentication**: First-time login and session persistence are performed via the dedicated headed browser command `ai-e2e chrome` (or `pnpm ai-e2e:chrome`), ensuring test runs remain completely non-intrusive.
2. **Configuration Precedence**:
   - CLI flags (`--headed` / `--headless`) take highest precedence.
   - Environment variable `HEADLESS=false` overrides default behavior.
   - `createAiFixture({ headless })` programmatic options override global defaults.
   - Default fallback is `headless: true` for `launch` / `persistent` modes.
