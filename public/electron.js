const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let db = null;
let triedLoadDb = false;
const kvMemory = new Map();
const userDataDir = app.getPath('userData');
const kvFile = path.join(userDataDir, 'app_data.json');

function loadKvFile() {
  try {
    if (fs.existsSync(kvFile)) {
      const raw = fs.readFileSync(kvFile, 'utf8');
      const obj = JSON.parse(raw || '{}');
      kvMemory.clear();
      Object.entries(obj).forEach(([k, v]) => kvMemory.set(k, v));
    }
  } catch (e) {
    console.error('[Main] Failed to load KV file:', e);
  }
}

function saveKvFile() {
  try {
    const obj = {};
    kvMemory.forEach((v, k) => { obj[k] = v; });
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(kvFile, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('[Main] Failed to save KV file:', e);
  }
}

function getDb() {
  if (isDev && process.env.USE_SQLITE !== '1') {
    // 在开发模式下默认不加载原生模块，避免 ABI 不匹配导致崩溃
    return null;
  }
  if (triedLoadDb) return db;
  triedLoadDb = true;
  try {
    // 延迟加载，避免 Electron 启动阶段原生模块崩溃
    // 注意：路径相对本文件
    // eslint-disable-next-line global-require
    db = require('../src/services/database');
    console.log('[Main] Database module loaded');
  } catch (e) {
    console.error('[Main] Failed to load database module (fallback to memory):', e);
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
  // 预加载文件存储到内存
  loadKvFile();
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

// IPC: 轻量KV存储
ipcMain.handle('appData:get', async (_event, key) => {
  try {
    const d = getDb();
    if (d) {
      const row = await db.get('SELECT value FROM app_data WHERE key = ?', [key]);
      return row && row.value ? JSON.parse(row.value) : null;
    }
  } catch (e) {
    console.error('[Main] appData:get error:', e);
  }
  return kvMemory.has(key) ? kvMemory.get(key) : null;
});

ipcMain.handle('appData:set', async (_event, key, value) => {
  try {
    const payload = JSON.stringify(value ?? null);
    const d = getDb();
    if (d) {
      await db.run(
        'INSERT INTO app_data(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        [key, payload]
      );
      return true;
    }
  } catch (e) {
    console.error('[Main] appData:set error:', e);
  }
  // fallback memory store
  kvMemory.set(key, value ?? null);
  saveKvFile();
  return true;
});

console.log('[Main] IPC handlers registered: appData:get, appData:set');