const { app, BrowserWindow, Tray, Menu, ipcMain, session, nativeImage, powerMonitor } = require('electron')
const path = require('path')
const { planLabel } = require('./lib/utils')

let tray, popover, loginWin

app.dock.hide()

function buildTrayMenu() {
  const loginItem = app.getLoginItemSettings()
  return Menu.buildFromTemplate([
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: loginItem.openAtLogin,
      click(item) { app.setLoginItemSettings({ openAtLogin: item.checked }) },
    },
    { type: 'separator' },
    { label: 'Quit Claude Usage', click: () => app.quit() },
  ])
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setTitle('CU')
  tray.on('click', togglePopover)
  tray.on('right-click', () => {
    tray.popUpContextMenu(buildTrayMenu())
  })
}

function createPopover() {
  popover = new BrowserWindow({
    width: 340,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1c1c1e',
    vibrancy: 'menu',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })
  popover.loadFile(path.join(__dirname, 'renderer/popover.html'))
  popover.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  popover.on('blur', () => popover.hide())
}

function togglePopover() {
  if (popover.isVisible()) {
    popover.hide()
    return
  }

  const trayBounds = tray.getBounds()
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - 170)
  const y = trayBounds.y + trayBounds.height + 4

  popover.setPosition(x, y)
  popover.show()
  popover.focus()
}

app.whenReady().then(() => {
  createTray()
  createPopover()
  powerMonitor.on('resume', () => {
    tray?.destroy()
    createTray()
  })
})

app.on('window-all-closed', (e) => e.preventDefault())

app.on('before-quit', () => {
  powerMonitor.removeAllListeners('resume')
  loginWin?.destroy()
  fetchWin?.destroy()
})

let fetchWin
let fetchWinReady
let cachedOrg = null

async function getFetchWindow() {
  if (fetchWin && !fetchWin.isDestroyed()) return fetchWin
  if (!fetchWinReady) {
    fetchWinReady = (async () => {
      fetchWin = new BrowserWindow({ show: false })
      // Minimal claude.ai-origin page — just enough to set the origin for
      // relative /api fetches and carry session cookies. Avoids loading the
      // full React SPA which downloads several MB of JS/CSS.
      await fetchWin.loadURL('https://claude.ai/api/auth/current')
      fetchWinReady = null
    })()
  }
  await fetchWinReady
  return fetchWin
}

// Run fetches inside the claude.ai page context — real browser request,
// passes Cloudflare and carries cookies automatically.
async function pageFetch(apiPath) {
  const w = await getFetchWindow()
  return w.webContents.executeJavaScript(`
    fetch(${JSON.stringify(apiPath)}, { headers: { accept: 'application/json' } })
      .then(r => r.text().then(body => {
        let json = null
        try { json = JSON.parse(body) } catch {}
        return { status: r.status, json, body: json ? null : body.slice(0, 200) }
      }))
  `, true)
}

ipcMain.handle('fetch-usage', async () => {
  const cookies = await session.defaultSession.cookies.get({ domain: 'claude.ai' })
  const sessionKey = cookies.find(c => c.name === 'sessionKey')?.value

  if (!sessionKey) return { error: 'not_logged_in' }

  try {
    if (!cachedOrg) {
      const orgsRes = await pageFetch('/api/organizations')
      if (orgsRes.status === 401 || orgsRes.status === 403) return { error: 'not_logged_in' }
      const orgs = orgsRes.json
      if (!Array.isArray(orgs) || !orgs.length) {
        return { error: `organizations: HTTP ${orgsRes.status} ${orgsRes.body || ''}` }
      }
      const org = orgs.find(o => o.capabilities?.includes('chat')) || orgs[0]
      cachedOrg = {
        uuid: org.uuid,
        name: org.name,
        plan: planLabel(org.billing_type || org.rate_limit_tier || ''),
      }
    }

    const { uuid: orgId, name, plan } = cachedOrg
    const candidates = [
      `/api/organizations/${orgId}/usage_status`,
      `/api/organizations/${orgId}/usage`,
      `/api/organizations/${orgId}/rate_limits`,
      `/api/bootstrap/${orgId}/statsig`,
    ]
    const results = {}
    for (const apiPath of candidates) {
      const r = await pageFetch(apiPath)
      results[apiPath] = { status: r.status, data: r.json ?? r.body }
      if (r.status === 200 && r.json) break
    }
    return { org: { name, plan }, results }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('resize', (e, height) => {
  const h = Math.min(Math.max(Math.round(height), 120), 600)
  const [w] = popover.getSize()
  popover.setSize(w, h)
})

ipcMain.handle('open-login', () => {
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.focus()
    return
  }
  loginWin = new BrowserWindow({ width: 1000, height: 700 })
  loginWin.loadURL('https://claude.ai/login')
  loginWin.on('closed', () => {
    loginWin = null
    cachedOrg = null  // clear org cache so next fetch re-resolves with fresh cookies
    popover.webContents.send('login-done')
  })
})

