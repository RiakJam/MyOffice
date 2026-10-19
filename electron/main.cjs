const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
ipcMain.on('myoffice:confirm-close', event => {
 const win = BrowserWindow.fromWebContents(event.sender)
 if (!win) return
 win.allowClose = true
 win.close()
})
ipcMain.on('myoffice:show-menu', (event, label, x, y) => {
 const win = BrowserWindow.fromWebContents(event.sender)
 const item = Menu.getApplicationMenu()?.items.find(entry => entry.label === label)
 if (win && item?.submenu) item.submenu.popup({ window: win, x: Math.round(x), y: Math.round(y) })
})
ipcMain.on('myoffice:window-control', (event, action) => {
 const win = BrowserWindow.fromWebContents(event.sender)
 if (!win) return
 if (action === 'minimize') win.minimize()
 else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize()
 else if (action === 'close') win.close()
})
function createWindow() {
 const win = new BrowserWindow({ width: 1440, height: 960, minWidth: 640, minHeight: 480, frame: false, autoHideMenuBar: true, icon: path.join(__dirname, 'myoffice-icon.png'), webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') } })
 win.setMenuBarVisibility(false)
 win.on('close', event => {
  if (win.allowClose) return
  event.preventDefault()
  win.webContents.send('myoffice:close-requested')
 })
 const load = process.argv.includes('--myoffice-dev')
  ? win.loadURL(process.env.MYOFFICE_DEV_URL || 'http://localhost:5173')
  : win.loadFile(path.join(__dirname, '../dist/index.html'))
 load.catch(error => console.error('Failed to load Myoffice:', error))
}
app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
