# Claude Code tooling for this project

Claude Code 2.1.295 (bundled with the Claude desktop app) on Windows 11. Last checked 15 Oct 2026.

## Status checklist

| Capability | How | Status |
|---|---|---|
| Frontend design | plugin `frontend-design` (Anthropic) | Installed and verified (skill loads) |
| Superpowers | plugin `superpowers` 6.4.2 (partner) | Installed and verified (skills load) |
| Code simplification | plugin `code-simplifier` (Anthropic), agent `code-simplifier:code-simplifier` | Installed and verified (agent available) |
| Playwright | plugin `playwright` → `npx @playwright/mcp@latest` | Installed and verified (drove the site, screenshots, forms) |
| Context7 | plugin `context7` → https://mcp.context7.com/mcp | Installed and verified (signed in; returned three.js docs) |
| Chrome DevTools | local MCP `chrome-devtools-mcp@1.10.1` (pinned, isolated profile, no usage stats, no CrUX) | Installed and verified (traces, Lighthouse) |
| Figma | plugin `figma` 2.2.157 | Authenticated earlier (Starter, View seat; the 20-call monthly MCP quota ran out 15 Oct 2026). **Not used for the Atlas redesign: the owner instructed on 15 Oct 2026 not to use Figma.** The earlier Flight Deck file stays as history. |
| TypeScript LSP | — | Not applicable (no TypeScript) |
| GitHub | repo `sharathps13/tutee-uk`; local git via GitHub Desktop's git | Local git verified; GitHub MCP awaiting a personal access token (optional) |
| Netlify / Supabase | existing `netlify.toml`, functions; Supabase anon read of `universities` | Preserved, unchanged |
| 3D build | `tools/world/` dev workspace: three 0.186.1 + esbuild 0.28.2 (`npm install`, `npm run build`) | Used: builds `assets/js/world.js` (150 KB gzip); `tools/world/preview.html` renders shots and the hero posters |
| Lead test server | `tools/dev/serve-with-api.mjs` (launch config `site-api-test`, port 8790) | Used: real `enquiry.mjs` + mock Apps Script, gzip like Netlify; no production leads |

Installing or updating plugins needs `git` on PATH. Git for Windows is not installed; GitHub
Desktop's copy works: `C:\ProgramData\user\GitHubDesktop\app-3.6.7\resources\app\git\cmd`.
npm blocks esbuild's postinstall script by default; the platform binary package still installs and
works, so no approval is needed.

Plugins are recorded in `~/.claude/settings.json`; the chrome-devtools server in `~/.claude.json`
(local scope for this project).

## Lead pipeline (verified 15 Oct 2026)

Form → `POST /api/enquiry` (`netlify/functions/enquiry.mjs`) → Apps Script (`APPS_SCRIPT_URL`,
`APPS_SCRIPT_SECRET`, Netlify env) → Google Sheet row + email to digital@tuteeconnect.com.
Verified locally against a mock Apps Script: valid lead forwarded with all fields; bad name, phone,
email, dead mail domain and honeypot rejected. A live end-to-end test needs the owner's approval.

## Figma (history)

The Flight Deck file (https://www.figma.com/design/G50NwWa4AHrSkK8SkDkSRx) belongs to the
superseded "Flight" direction. The Atlas was explored and decided in the browser instead (see
README "Three directions considered"), because the owner asked for Figma not to be used.

## Project skills (`.claude/skills/`)

| Skill | Brief | Use |
|---|---|---|
| tc-art-direction | A | concepts → choose → Figma → hold the direction; immersive quality bar |
| tc-3d-world | B | the three.js world: scene, camera, budget, fallbacks, HTML parity |
| tc-scroll-story | C | chapters, selective pinning, continuity, timing, reduced motion |
| tc-conversion | D | audiences, CTAs, trust rules, the verified lead pipeline, event tracking |
| tc-a11y-responsive | E | WCAG 2.2 AA checklist, touch, forms, usable without 3D |
| tc-visual-qa | F | screenshots, Figma comparison, 3D frame budget, realistic load tests |
| tc-design-system | — | tokens, type and spacing, components |

They build on the `frontend-design` plugin and the account-level `taste-skill` / `ui-ux-pro-max`
skills. (`tc-motion-3d` was split into `tc-3d-world` and `tc-scroll-story`.)

## Other changes

- `.gitignore`: `.playwright-mcp/` (Playwright MCP output). `tools/world/node_modules/` is covered by
  the existing `node_modules/` rule.
