# Claude Usage

A macOS menu bar app that shows your Claude.ai plan usage — the same numbers as **Settings → Usage** in the Claude desktop app — without opening settings.

Click the menu bar item to see a compact popover with your current session and weekly limits, reset times, and color-coded progress bars.

## Features

- Lives in the macOS menu bar — no Dock icon, no window
- Current-session and weekly usage with reset times
- Color-coded bars (blue → amber → red as limits approach)
- Right-click → **Launch at Login** to auto-start on boot
- Right-click → **Quit** to exit

## Requirements

- macOS
- Node.js 22.12+ (`node --version` to check; install from [nodejs.org](https://nodejs.org/))

## Run

```bash
git clone https://github.com/viktor-r94/claude-usage.git
cd claude-usage
npm install
npm start
```

On first launch click the **Claude** menu bar item → **Sign in to Claude**, log in, and usage bars appear. The session persists so later launches go straight to your data.

To start it again after quitting: `npm start` from the project folder, or enable **Launch at Login** (right-click the menu bar item) so it starts automatically.

## How it works

The app reuses your Claude.ai login session and reads usage from the same internal endpoints the web app uses (`/api/organizations/.../usage_status`). Requests run inside a hidden Claude.ai browser context so they carry your cookies and pass Cloudflare exactly like the real web app. Nothing is sent anywhere except Claude.ai — your credentials never leave your machine.

## Disclaimer

Unofficial project, not affiliated with or endorsed by Anthropic. Relies on Claude.ai's private web endpoints, which may change or break without notice. Use at your own risk.
