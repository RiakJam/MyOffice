const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('myofficeDesktop', {
 onCloseRequested(callback) {
  const listener = () => callback()
  ipcRenderer.on('myoffice:close-requested', listener)
  return () => ipcRenderer.removeListener('myoffice:close-requested', listener)
 },
 confirmClose() {
  ipcRenderer.send('myoffice:confirm-close')
 },
 showMenu(label, x, y) {
  ipcRenderer.send('myoffice:show-menu', label, x, y)
 },
 windowControl(action) {
  ipcRenderer.send('myoffice:window-control', action)
 }
})
