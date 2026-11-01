const { contextBridge, ipcRenderer } = require('electron');
const inv = (c, ...a) => ipcRenderer.invoke(c, ...a);
contextBridge.exposeInMainWorld('winApi', {
  saveFile: (o) => inv('save-file', o),
  openFolder: () => inv('open-folder'),
  dbLoad: () => inv('db-load'),
  dbSave: (k, v) => inv('db-save', k, v),
  info: () => inv('info'),
  backupNow: () => inv('backup-now'),
  listBackups: () => inv('list-backups'),
  restore: (n) => inv('restore-backup', n),
  wipe: () => inv('wipe-data'),
  onFlush: (cb) => ipcRenderer.on('flush', async () => { try { await cb(); } catch (e) {} ipcRenderer.send('flushed'); })
});
