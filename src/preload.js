const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  fetchUsage: () => ipcRenderer.invoke('fetch-usage'),
  openLogin: () => ipcRenderer.invoke('open-login'),
  onLoginDone: (cb) => ipcRenderer.on('login-done', cb),
  resize: (height) => ipcRenderer.invoke('resize', height),
})
