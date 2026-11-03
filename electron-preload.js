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
  odooRpc: (cfg, s, m, a) => inv('odoo-rpc', cfg, s, m, a),
  machineId: () => inv('machine-id'),
  licLoad: () => inv('lic-load'),
  licSave: (t) => inv('lic-save', t),
  onFlush: (cb) => ipcRenderer.on('flush', async () => { try { await cb(); } catch (e) {} ipcRenderer.send('flushed'); })
});
