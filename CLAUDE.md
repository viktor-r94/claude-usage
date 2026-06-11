# Claude Usage — Codebase Guide

A macOS Electron menu bar app (tray icon + popover window) showing Claude.ai plan usage limits fetched from Claude.ai's internal API.

## Architecture

```
src/main.js               — Electron main process: tray, popover window, IPC handlers, API fetching
src/preload.js            — Context bridge: exposes 4 IPC methods to the renderer (no raw ipcRenderer)
src/lib/utils.js          — Pure helpers (esc, pctOf, fmtReset, planLabel…); dual CommonJS/browser export
src/renderer/popover.html — Renderer: styles + HTML + JS, no framework; loads utils via <script src>
tests/utils.test.js       — Jest unit tests for src/lib/utils.js
```

No build step for development. `npm start` runs it directly with `electron .`; `npm test` runs Jest; `npm run build` packages a macOS .app via electron-builder.

Performance notes: usage rows are pooled DOM nodes updated in place (see `makeUsageItem` in popover.html); the org lookup is cached in `cachedOrg` (main.js) and invalidated when the login window closes.

## Key design decisions

**Fetching via hidden browser window, not Node `fetch`**
Claude.ai's API requires cookies and passes Cloudflare bot checks. Plain `fetch` from the main process fails. The fix: a hidden `BrowserWindow` loads `https://claude.ai`, then `executeJavaScript` runs `fetch()` inside that page context — so requests carry the session cookie and look like real browser traffic. See `getFetchWindow()` and `pageFetch()` in `main.js`.

**Relative API paths**
`pageFetch('/api/organizations')` uses a relative path because the fetch runs inside the `claude.ai` origin. Passing absolute URLs would also work but relative is simpler.

**Popover sizing**
`popover.html` calls `window.api.resize(scrollHeight)` after every render to fit the content. The main process clamps this to 120–600px.

**Session cookie check**
Before fetching, `main.js` checks for a `sessionKey` cookie on `claude.ai`. Missing = show login prompt. The login window is a regular `BrowserWindow` pointing at `https://claude.ai/login`; when it closes the session cookie is available and the popover refreshes.

## IPC surface (preload.js)

| Method | Direction | What it does |
|---|---|---|
| `fetchUsage()` | renderer → main | Fetch org + usage data, return `{ org, results }` or `{ error }` |
| `openLogin()` | renderer → main | Open claude.ai/login in a new window |
| `resize(height)` | renderer → main | Resize the popover window |
| `onLoginDone(cb)` | main → renderer | Fired when the login window closes |

## API endpoints probed (in order, first 200 wins)

1. `/api/organizations/{orgId}/usage_status` — **this is the one that works**
2. `/api/organizations/{orgId}/usage`
3. `/api/organizations/{orgId}/rate_limits`
4. `/api/bootstrap/{orgId}/statsig`

The response shape from `usage_status` has top-level keys like `five_hour` and `seven_day`, each an object with `used`, `max`, `resets_at`. `pctOf()` in `popover.html` extracts the percentage from whatever shape is returned.

## Billing type → plan label mapping

`main.js` maps raw `org.billing_type` values to readable labels:

| Raw value | Label |
|---|---|
| `stripe_subscription` | Pro |
| `free` | Free |
| `team` | Team |
| `enterprise` | Enterprise |

Add new entries here if Anthropic adds new billing types.

## Running

```bash
npm install   # requires Node 22.12+
npm start
```

Right-click the "Claude" menu bar item to access **Launch at Login** and **Quit**.
