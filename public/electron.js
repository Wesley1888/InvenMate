const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let db = null;
let triedLoadDb = false;
const userDataDir = app.getPath('userData');

// 文件日志 - 输出到 userData/main.log
const logFile = path.join(userDataDir, 'main.log');
function writeLog(level, ...args) {
  try {
    const ts = new Date().toISOString();
    const text = args.map(a => {
      if (a instanceof Error) return `${a.stack || a.message}`;
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.appendFileSync(logFile, `[${ts}] [${level}] ${text}\n`, 'utf8');
  } catch (_) {}
}
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => { origLog(...args); writeLog('INFO', ...args); };
console.error = (...args) => { origErr(...args); writeLog('ERROR', ...args); };
console.log('[Main] Logger initialized at', logFile);

function getDb() {
  if (triedLoadDb) return db;
  triedLoadDb = true;
  try {
    const DatabaseService = require('./database');
    db = new DatabaseService(userDataDir);
    console.log('[Main] ✅ SQLite database module loaded successfully');
  } catch (e) {
    console.error('[Main] ❌ Failed to load database module:', e);
    db = null;
  }
  return db;
}

let mainWindow;

// 部分设备/驱动下GPU进程可能异常，关闭硬件加速更稳定
app.disableHardwareAcceleration();

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'InvenMate - 周转库配件耗材管理系统'
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 创建菜单
const template = [
  {
    label: '文件',
    submenu: [
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' }
    ]
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload', label: '重新加载' },
      { role: 'forceReload', label: '强制重新加载' },
      { role: 'toggleDevTools', label: '切换开发者工具' },
      { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' },
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '切换全屏' }
    ]
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          require('electron').dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于 InvenMate',
            message: '周转库配件耗材管理系统',
            detail: '版本 1.0.0\n\n一个现代化的库存管理解决方案'
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu); 

// IPC: 数据库存储
ipcMain.handle('appData:get', async (_event, key) => {
  try {
    const d = getDb();
    if (d) {
      const row = d.get('SELECT value FROM app_data WHERE key = ?', [key]);
      const parsed = row && row.value ? JSON.parse(row.value) : null;
      console.log(`[Main] appData:get ${key} -> ${parsed ? (Array.isArray(parsed) ? `Array(${parsed.length})` : typeof parsed) : 'null'}`);
      return parsed;
    }
  } catch (e) {
    console.error('[Main] appData:get error:', key, e);
  }
  return null;
});

ipcMain.handle('appData:set', async (_event, key, value) => {
  try {
    const payload = JSON.stringify(value ?? null);
    const d = getDb();
    if (d) {
      d.run(
        'INSERT INTO app_data(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        [key, payload]
      );
      console.log(`[Main] appData:set ${key} <- ${value ? (Array.isArray(value) ? `Array(${value.length})` : typeof value) : 'null'}`);
      return true;
    }
  } catch (e) {
    console.error('[Main] appData:set error:', key, e);
  }
  return false;
});

// 数据导出（返回内存对象）
ipcMain.handle('appData:export', async () => {
  try {
    const d = getDb();
    if (!d) return {};
    const rows = d.query('SELECT key, value FROM app_data');
    const out = {};
    rows.forEach(r => { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } });
    return out;
  } catch (e) {
    console.error('appData:export error', e);
    return {};
  }
});

// 导出到文件（保存对话框）
ipcMain.handle('appData:exportToFile', async () => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const rows = d.query('SELECT key, value FROM app_data');
    const out = {};
    rows.forEach(r => { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } });
    const res = await dialog.showSaveDialog({
      title: '导出数据为 JSON',
      defaultPath: path.join(userDataDir, 'invenmate-export.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, JSON.stringify(out, null, 2), 'utf8');
    console.log('[Main] Exported app_data to', res.filePath);
    return { ok: true, filePath: res.filePath };
  } catch (e) {
    console.error('appData:exportToFile error', e);
    return { ok: false, error: e.message };
  }
});

// 从文件导入（打开对话框）
ipcMain.handle('appData:importFromFile', async () => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const res = await dialog.showOpenDialog({
      title: '选择要导入的 JSON 数据文件',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false };
    const file = res.filePaths[0];
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw || '{}');
    const stmt = d.db.prepare('INSERT INTO app_data(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP');
    const tx = d.db.transaction((entries) => {
      entries.forEach(([k, v]) => stmt.run(k, JSON.stringify(v ?? null)));
    });
    tx(Object.entries(data));
    console.log('[Main] Imported app_data from', file);
    return { ok: true, filePath: file, keys: Object.keys(data).length };
  } catch (e) {
    console.error('appData:importFromFile error', e);
    return { ok: false, error: e.message };
  }
});

// 日志：打开目录
ipcMain.handle('logs:openDir', async () => {
  try { await shell.openPath(userDataDir); return true; } catch { return false; }
});

// 日志：清空
ipcMain.handle('logs:clear', async () => {
  try { fs.writeFileSync(logFile, '', 'utf8'); return true; } catch { return false; }
});

console.log('[Main] IPC handlers registered: appData:get, appData:set');