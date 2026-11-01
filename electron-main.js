const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

/* منع فتح أكثر من نسخة من البرنامج */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let win = null;
/* مسار الحفظ: بارتشن D ثم مجلد "أسواق بدر" (وإن لم يوجد D فمجلد المستندات) */
const root = () => {
  let base;
  try { base = fs.existsSync('D:\\') ? 'D:\\' : app.getPath('documents'); } catch (e) { base = app.getPath('documents'); }
  return path.join(base, 'أسواق بدر');
};
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]/g, '_').replace(/[. ]+$/, '').slice(0, 120) || '_';
const dbDir = () => { const d = path.join(app.getPath('userData'), 'db'); fs.mkdirSync(d, { recursive: true }); return d; };
const bkDir = () => path.join(root(), 'النسخ الاحتياطي');

/* حفظ ملفات Excel: folder يمكن أن يحتوي على مسارات فرعية مفصولة بـ / */
ipcMain.handle('save-file', async (e, o) => {
  const dir = path.join(root(), ...String(o.folder || '').split('/').filter(Boolean).map(safe));
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, safe(o.name));
  fs.writeFileSync(f, o.b64 ? Buffer.from(o.b64, 'base64') : (o.text || ''));
  return f;
});
ipcMain.handle('open-folder', async () => { fs.mkdirSync(root(), { recursive: true }); return shell.openPath(root()); });

/* قاعدة البيانات: ملف JSON لكل جزء (كتابة آمنة) */
ipcMain.handle('db-load', async () => {
  const out = {}, d = dbDir();
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.json')) continue;
    try { out[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) {}
  }
  return out;
});
ipcMain.handle('db-save', async (e, k, v) => {
  const f = path.join(dbDir(), safe(k) + '.json'), tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v));
  fs.renameSync(tmp, f);
  return true;
});

/* ===== النسخ الاحتياطي (كل ساعتين) ===== */
const p2 = (n) => String(n).padStart(2, '0');
function listBackups() {
  try {
    return fs.readdirSync(bkDir()).filter((f) => /^Backup-.*\.json\.gz$/.test(f))
      .map((f) => { const st = fs.statSync(path.join(bkDir(), f)); return { name: f, size: st.size, mtime: st.mtimeMs }; })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) { return []; }
}
function makeBackup(tag) {
  const d = dbDir(), all = {};
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.json')) continue;
    try { all[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) {}
  }
  if (!Object.keys(all).length) return null;
  const t = new Date();
  const name = `Backup-${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}_${p2(t.getHours())}-${p2(t.getMinutes())}-${p2(t.getSeconds())}${tag ? '-' + tag : ''}.json.gz`;
  fs.mkdirSync(bkDir(), { recursive: true });
  const f = path.join(bkDir(), name);
  fs.writeFileSync(f + '.tmp', zlib.gzipSync(JSON.stringify(all)));
  fs.renameSync(f + '.tmp', f);
  /* الاحتفاظ بآخر 150 نسخة */
  listBackups().slice(150).forEach((b) => { try { fs.unlinkSync(path.join(bkDir(), b.name)); } catch (e) {} });
  return name;
}
const clearDb = () => { const d = dbDir(); fs.readdirSync(d).forEach((f) => { if (f.endsWith('.json')) fs.unlinkSync(path.join(d, f)); }); };

ipcMain.handle('info', async () => { const l = listBackups(); return { root: root(), last: l.length ? l[0].mtime : null }; });
ipcMain.handle('backup-now', async () => makeBackup('يدوي'));
ipcMain.handle('list-backups', async () => listBackups());
ipcMain.handle('restore-backup', async (e, name) => {
  if (!/^Backup-[\w\-.]+\.json\.gz$/.test(name)) throw new Error('bad name');
  const all = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(bkDir(), name))).toString('utf8'));
  makeBackup('قبل-الاسترجاع');
  clearDb();
  for (const k of Object.keys(all)) fs.writeFileSync(path.join(dbDir(), safe(k) + '.json'), JSON.stringify(all[k]));
  return true;
});
ipcMain.handle('wipe-data', async () => { makeBackup('قبل-الحذف'); clearDb(); return true; });

function startBackupTimer() {
  const TWO = 2 * 60 * 60 * 1000;
  const auto = () => { try { makeBackup('تلقائي'); } catch (e) {} };
  setTimeout(() => { const l = listBackups(); if (!l.length || Date.now() - l[0].mtime > TWO) auto(); }, 60 * 1000);
  setInterval(auto, TWO);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, title: 'أسواق بدر', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'electron-preload.js') }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  let closing = false;
  win.on('close', (ev) => {
    if (closing) return;
    ev.preventDefault();
    closing = true;
    win.webContents.send('flush');
    setTimeout(() => { if (win) win.destroy(); }, 4000);
  });
  ipcMain.on('flushed', () => { if (win) win.destroy(); });
  win.on('closed', () => { win = null; });
}
if (gotLock) {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { createWindow(); startBackupTimer(); });
  app.on('window-all-closed', () => app.quit());
}
