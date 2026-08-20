# Deep-Link Route Navigation via Persistent Sessions

## Context
AI Coding Agents testing newly added features on deep URLs (e.g. `/detail/123` or `/settings/profile`) traditionally had to script multi-step navigation starting from the home page or login screen, which is slow, token-heavy, and fragile.

## Decision
We leverage the Persistent Profile and CDP session persistence to enable direct deep-link navigation via `gotoRoute(path)`. The fixture automatically navigates directly to the target route with full authentication state intact and performs intelligent network/DOM idle waiting.
