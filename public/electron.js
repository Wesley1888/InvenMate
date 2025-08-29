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



// part_models CRUD (update supports min_threshold)
ipcMain.handle('pm:list', async (_e, { search } = {}) => {
  try {
    const d = getDb();
    if (!d) return [];
    if (search && search.trim()) {
      const kw = `%${search.trim()}%`;
      return d.query(
        'SELECT * FROM part_models WHERE model_code LIKE ? OR model_name LIKE ? OR specification LIKE ? OR category LIKE ? ORDER BY updated_at DESC',
        [kw, kw, kw, kw]
      );
    }
    return d.query('SELECT * FROM part_models ORDER BY updated_at DESC');
  } catch (e) {
    console.error('pm:list error', e);
    return [];
  }
});

ipcMain.handle('pm:create', async (_e, payload) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `INSERT INTO part_models(model_code, model_name, specification, unit, category, description, min_threshold)
                 VALUES(?, ?, ?, ?, ?, ?, ?)`;
    const res = d.run(sql, [
      payload.model_code,
      payload.model_name,
      payload.specification || '',
      payload.unit || '个',
      payload.category || '其他',
      payload.description || '',
      Number(payload.min_threshold)||0
    ]);
    return { ok: true, id: res.id };
  } catch (e) {
    console.error('pm:create error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pm:update', async (_e, { id, updates }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `UPDATE part_models SET model_code=?, model_name=?, specification=?, unit=?, category=?, description=?, min_threshold=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
    d.run(sql, [
      updates.model_code,
      updates.model_name,
      updates.specification || '',
      updates.unit || '个',
      updates.category || '其他',
      updates.description || '',
      Number(updates.min_threshold)||0,
      id
    ]);
    return { ok: true };
  } catch (e) {
    console.error('pm:update error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('pm:delete', async (_e, id) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    d.run('DELETE FROM part_models WHERE id=?', [id]);
    return { ok: true };
  } catch (e) {
    console.error('pm:delete error', e);
    return { ok: false, error: e.message };
  }
});

// 低库存列表（根据 min_threshold 与现有入出库汇总）
ipcMain.handle('inventory:lowStock', async () => {
  try {
    const d = getDb();
    if (!d) return [];
    const rows = d.query(`
      SELECT pm.id, pm.model_code, pm.model_name, pm.specification, pm.category, pm.unit, pm.min_threshold,
             COALESCE((SELECT SUM(quantity) FROM stock_in si WHERE si.part_model_id=pm.id),0) as inQty,
             COALESCE((SELECT SUM(quantity) FROM stock_out so WHERE so.part_model_id=pm.id),0) as outQty
      FROM part_models pm
      WHERE pm.min_threshold IS NOT NULL AND pm.min_threshold > 0
    `).map(r => {
      const current = Math.max(0, (r.inQty||0) - (r.outQty||0));
      return { ...r, current };
    }).filter(r => r.current < r.min_threshold);
    return rows;
  } catch (e) {
    console.error('inventory:lowStock error', e);
    return [];
  }
});

// 仪表盘统计数据
ipcMain.handle('dashboard:statistics', async () => {
  try {
    const d = getDb();
    if (!d) return {
      totalParts: 0,
      totalOrders: 0,
      totalStockIn: 0,
      totalStockOut: 0,
      lowStockItems: 0
    };
    
    // 配件型号总数
    const totalParts = d.query('SELECT COUNT(*) as count FROM part_models')[0]?.count || 0;
    
    // 订单总数
    const totalOrders = d.query('SELECT COUNT(*) as count FROM orders')[0]?.count || 0;
    
    // 本月入库总数
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const totalStockIn = d.query(`
      SELECT COALESCE(SUM(quantity), 0) as total 
      FROM stock_in 
      WHERE strftime('%Y-%m', stock_in_date) = ?
    `, [currentMonth])[0]?.total || 0;
    
    // 本月出库总数
    const totalStockOut = d.query(`
      SELECT COALESCE(SUM(quantity), 0) as total 
      FROM stock_out 
      WHERE strftime('%Y-%m', stock_out_date) = ?
    `, [currentMonth])[0]?.total || 0;
    
    // 低库存项目数
    const lowStockItems = d.query(`
      SELECT COUNT(*) as count FROM (
        SELECT pm.id, pm.min_threshold,
               COALESCE((SELECT SUM(quantity) FROM stock_in si WHERE si.part_model_id=pm.id),0) as inQty,
               COALESCE((SELECT SUM(quantity) FROM stock_out so WHERE so.part_model_id=pm.id),0) as outQty
        FROM part_models pm
        WHERE pm.min_threshold IS NOT NULL AND pm.min_threshold > 0
      ) WHERE (inQty - outQty) < min_threshold
    `)[0]?.count || 0;
    
    return {
      totalParts,
      totalOrders,
      totalStockIn,
      totalStockOut,
      lowStockItems
    };
  } catch (e) {
    console.error('dashboard:statistics error', e);
    return {
      totalParts: 0,
      totalOrders: 0,
      totalStockIn: 0,
      totalStockOut: 0,
      lowStockItems: 0
    };
  }
});

// 仪表盘最近活动
ipcMain.handle('dashboard:recentActivities', async () => {
  try {
    const d = getDb();
    if (!d) return [];
    
    // 合并入库和出库记录，按时间排序
    const activities = d.query(`
      SELECT 
        '入库' as type,
        pm.model_name as part,
        si.quantity,
        si.stock_in_date as date,
        si.operator,
        si.id as record_id
      FROM stock_in si
      LEFT JOIN part_models pm ON pm.id = si.part_model_id
      WHERE si.stock_in_date IS NOT NULL
      
      UNION ALL
      
      SELECT 
        '出库' as type,
        pm.model_name as part,
        so.quantity,
        so.stock_out_date as date,
        so.operator,
        so.id as record_id
      FROM stock_out so
      LEFT JOIN part_models pm ON pm.id = so.part_model_id
      WHERE so.stock_out_date IS NOT NULL
      
      ORDER BY date DESC, record_id DESC
      LIMIT 10
    `);
    
    return activities.map((item, index) => ({
      key: String(index + 1),
      type: item.type,
      part: item.part || '未知配件',
      quantity: item.quantity,
      date: item.date,
      operator: item.operator || '未知'
    }));
  } catch (e) {
    console.error('dashboard:recentActivities error', e);
    return [];
  }
});

// stock_in CRUD (joined with part_models for model_name)
ipcMain.handle('si:list', async () => {
  try {
    const d = getDb();
    if (!d) return [];
    return d.query(`
      SELECT si.id, pm.model_name AS part_model, si.quantity, si.unit_price, si.total_amount,
             si.stock_in_date, si.operator, si.notes
      FROM stock_in si
      LEFT JOIN part_models pm ON pm.id = si.part_model_id
      ORDER BY si.stock_in_date DESC, si.id DESC
    `);
  } catch (e) {
    console.error('si:list error', e);
    return [];
  }
});

ipcMain.handle('si:create', async (_e, payload) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `INSERT INTO stock_in(order_id, part_model_id, quantity, unit_price, total_amount, stock_in_date, operator, notes)
                 VALUES(NULL, (SELECT id FROM part_models WHERE model_name = ? LIMIT 1), ?, ?, ?, ?, ?, ?)`;
    const res = d.run(sql, [
      payload.part_model,
      Number(payload.quantity)||0,
      Number(payload.unit_price)||0,
      Number(payload.total_amount)||((Number(payload.unit_price)||0)*(Number(payload.quantity)||0)),
      payload.stock_in_date || null,
      payload.operator || '',
      payload.notes || ''
    ]);
    return { ok: true, id: res.id };
  } catch (e) {
    console.error('si:create error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('si:update', async (_e, { id, updates }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `UPDATE stock_in SET part_model_id=(SELECT id FROM part_models WHERE model_name = ? LIMIT 1),
                 quantity=?, unit_price=?, total_amount=?, stock_in_date=?, operator=?, notes=? WHERE id=?`;
    d.run(sql, [
      updates.part_model,
      Number(updates.quantity)||0,
      Number(updates.unit_price)||0,
      Number(updates.total_amount)||((Number(updates.unit_price)||0)*(Number(updates.quantity)||0)),
      updates.stock_in_date || null,
      updates.operator || '',
      updates.notes || '',
      id
    ]);
    return { ok: true };
  } catch (e) {
    console.error('si:update error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('si:delete', async (_e, id) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    d.run('DELETE FROM stock_in WHERE id=?', [id]);
    return { ok: true };
  } catch (e) {
    console.error('si:delete error', e);
    return { ok: false, error: e.message };
  }
});

// stock_out CRUD
ipcMain.handle('so:list', async () => {
  try {
    const d = getDb();
    if (!d) return [];
    return d.query(`
      SELECT so.id, pm.model_name AS part_model, so.quantity, so.unit_price, so.total_amount,
             so.recipient, so.department, so.stock_out_date, so.operator, so.notes
      FROM stock_out so
      LEFT JOIN part_models pm ON pm.id = so.part_model_id
      ORDER BY so.stock_out_date DESC, so.id DESC
    `);
  } catch (e) {
    console.error('so:list error', e);
    return [];
  }
});

ipcMain.handle('so:create', async (_e, payload) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `INSERT INTO stock_out(part_model_id, quantity, unit_price, total_amount, recipient, department, stock_out_date, operator, notes)
                 VALUES((SELECT id FROM part_models WHERE model_name = ? LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?)`;
    const res = d.run(sql, [
      payload.part_model,
      Number(payload.quantity)||0,
      Number(payload.unit_price)||0,
      Number(payload.total_amount)||((Number(payload.unit_price)||0)*(Number(payload.quantity)||0)),
      payload.recipient || '',
      payload.department || '',
      payload.stock_out_date || null,
      payload.operator || '',
      payload.notes || ''
    ]);
    return { ok: true, id: res.id };
  } catch (e) {
    console.error('so:create error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('so:update', async (_e, { id, updates }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `UPDATE stock_out SET part_model_id=(SELECT id FROM part_models WHERE model_name = ? LIMIT 1),
                 quantity=?, unit_price=?, total_amount=?, recipient=?, department=?, stock_out_date=?, operator=?, notes=? WHERE id=?`;
    d.run(sql, [
      updates.part_model,
      Number(updates.quantity)||0,
      Number(updates.unit_price)||0,
      Number(updates.total_amount)||((Number(updates.unit_price)||0)*(Number(updates.quantity)||0)),
      updates.recipient || '',
      updates.department || '',
      updates.stock_out_date || null,
      updates.operator || '',
      updates.notes || '',
      id
    ]);
    return { ok: true };
  } catch (e) {
    console.error('so:update error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('so:delete', async (_e, id) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    d.run('DELETE FROM stock_out WHERE id=?', [id]);
    return { ok: true };
  } catch (e) {
    console.error('so:delete error', e);
    return { ok: false, error: e.message };
  }
});

// orders CRUD
ipcMain.handle('orders:list', async () => {
  try {
    const d = getDb();
    if (!d) return [];
    return d.query('SELECT * FROM orders ORDER BY order_date DESC, id DESC');
  } catch (e) {
    console.error('orders:list error', e);
    return [];
  }
});

ipcMain.handle('orders:create', async (_e, payload) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `INSERT INTO orders(order_number, order_date, supplier, total_amount, status, notes)
                 VALUES(?, ?, ?, ?, ?, ?)`;
    const res = d.run(sql, [
      payload.order_number,
      payload.order_date || null,
      payload.supplier || '',
      Number(payload.total_amount)||0,
      payload.status || 'pending',
      payload.notes || ''
    ]);
    return { ok: true, id: res.id };
  } catch (e) {
    console.error('orders:create error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('orders:update', async (_e, { id, updates }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `UPDATE orders SET order_number=?, order_date=?, supplier=?, total_amount=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
    d.run(sql, [
      updates.order_number,
      updates.order_date || null,
      updates.supplier || '',
      Number(updates.total_amount)||0,
      updates.status || 'pending',
      updates.notes || '',
      id
    ]);
    return { ok: true };
  } catch (e) {
    console.error('orders:update error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('orders:delete', async (_e, id) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    d.run('DELETE FROM order_items WHERE order_id=?', [id]);
    d.run('DELETE FROM orders WHERE id=?', [id]);
    return { ok: true };
  } catch (e) {
    console.error('orders:delete error', e);
    return { ok: false, error: e.message };
  }
});

// order_items
ipcMain.handle('order_items:listByOrder', async (_e, orderId) => {
  try {
    const d = getDb();
    if (!d) return [];
    return d.query(`
      SELECT oi.id, pm.model_name AS part_model, oi.quantity, oi.unit_price, oi.total_price
      FROM order_items oi
      LEFT JOIN part_models pm ON pm.id = oi.part_model_id
      WHERE oi.order_id = ?
      ORDER BY oi.id DESC
    `, [orderId]);
  } catch (e) {
    console.error('order_items:listByOrder error', e);
    return [];
  }
});

ipcMain.handle('order_items:add', async (_e, { order_id, item }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    const sql = `INSERT INTO order_items(order_id, part_model_id, quantity, unit_price, total_price)
                 VALUES(?, (SELECT id FROM part_models WHERE model_name = ? LIMIT 1), ?, ?, ?)`;
    const res = d.run(sql, [
      order_id,
      item.part_model,
      Number(item.quantity)||0,
      Number(item.unit_price)||0,
      Number(item.total_price)||((Number(item.unit_price)||0)*(Number(item.quantity)||0))
    ]);
    // 更新订单总额
    d.run('UPDATE orders SET total_amount=(SELECT IFNULL(SUM(total_price),0) FROM order_items WHERE order_id=?), updated_at=CURRENT_TIMESTAMP WHERE id=?', [order_id, order_id]);
    return { ok: true, id: res.id };
  } catch (e) {
    console.error('order_items:add error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('order_items:delete', async (_e, { order_id, item_id }) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };
    d.run('DELETE FROM order_items WHERE id=?', [item_id]);
    d.run('UPDATE orders SET total_amount=(SELECT IFNULL(SUM(total_price),0) FROM order_items WHERE order_id=?), updated_at=CURRENT_TIMESTAMP WHERE id=?', [order_id, order_id]);
    return { ok: true };
  } catch (e) {
    console.error('order_items:delete error', e);
    return { ok: false, error: e.message };
  }
});

// orders list with paging and filters
ipcMain.handle('orders:listPaged', async (_e, { page = 1, pageSize = 10, filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { total: 0, rows: [] };

    const where = [];
    const params = [];

    if (filters.orderNumber && String(filters.orderNumber).trim()) {
      where.push('order_number LIKE ?');
      params.push(`%${filters.orderNumber.trim()}%`);
    }
    if (filters.supplier && String(filters.supplier).trim()) {
      where.push('supplier = ?');
      params.push(filters.supplier.trim());
    }
    if (filters.status && String(filters.status).trim()) {
      where.push('status = ?');
      params.push(filters.status.trim());
    }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) {
      where.push('date(order_date) BETWEEN date(?) AND date(?)');
      params.push(filters.dateRange[0], filters.dateRange[1]);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const totalRow = d.get(`SELECT COUNT(1) as cnt FROM orders ${whereSql}`, params);
    const total = totalRow ? totalRow.cnt : 0;

    const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const rows = d.query(
      `SELECT * FROM orders ${whereSql} ORDER BY order_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { total, rows };
  } catch (e) {
    console.error('orders:listPaged error', e);
    return { total: 0, rows: [] };
  }
});

// stock_in list with paging/filters
ipcMain.handle('si:listPaged', async (_e, { page = 1, pageSize = 10, filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { total: 0, rows: [] };

    const where = [];
    const params = [];

    if (filters.partModel && String(filters.partModel).trim()) {
      where.push('pm.model_name LIKE ?');
      params.push(`%${filters.partModel.trim()}%`);
    }
    if (filters.orderNumber && String(filters.orderNumber).trim()) {
      where.push('si.order_id IN (SELECT id FROM orders WHERE order_number LIKE ? )');
      params.push(`%${filters.orderNumber.trim()}%`);
    }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) {
      where.push('date(si.stock_in_date) BETWEEN date(?) AND date(?)');
      params.push(filters.dateRange[0], filters.dateRange[1]);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const totalRow = d.get(`
      SELECT COUNT(1) as cnt
      FROM stock_in si
      LEFT JOIN part_models pm ON pm.id = si.part_model_id
      ${whereSql}
    `, params);
    const total = totalRow ? totalRow.cnt : 0;

    const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const rows = d.query(`
      SELECT si.id, pm.model_name AS part_model, si.quantity, si.unit_price, si.total_amount,
             si.stock_in_date, si.operator, si.notes
      FROM stock_in si
      LEFT JOIN part_models pm ON pm.id = si.part_model_id
      ${whereSql}
      ORDER BY si.stock_in_date DESC, si.id DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    return { total, rows };
  } catch (e) {
    console.error('si:listPaged error', e);
    return { total: 0, rows: [] };
  }
});

// stock_out list with paging/filters
ipcMain.handle('so:listPaged', async (_e, { page = 1, pageSize = 10, filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { total: 0, rows: [] };

    const where = [];
    const params = [];

    if (filters.partModel && String(filters.partModel).trim()) {
      where.push('pm.model_name LIKE ?');
      params.push(`%${filters.partModel.trim()}%`);
    }
    if (filters.department && String(filters.department).trim()) {
      where.push('so.department = ?');
      params.push(filters.department.trim());
    }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) {
      where.push('date(so.stock_out_date) BETWEEN date(?) AND date(?)');
      params.push(filters.dateRange[0], filters.dateRange[1]);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const totalRow = d.get(`
      SELECT COUNT(1) as cnt
      FROM stock_out so
      LEFT JOIN part_models pm ON pm.id = so.part_model_id
      ${whereSql}
    `, params);
    const total = totalRow ? totalRow.cnt : 0;

    const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const rows = d.query(`
      SELECT so.id, pm.model_name AS part_model, so.quantity, so.unit_price, so.total_amount,
             so.recipient, so.department, so.stock_out_date, so.operator, so.notes
      FROM stock_out so
      LEFT JOIN part_models pm ON pm.id = so.part_model_id
      ${whereSql}
      ORDER BY so.stock_out_date DESC, so.id DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    return { total, rows };
  } catch (e) {
    console.error('so:listPaged error', e);
    return { total: 0, rows: [] };
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

// 导出订单为Excel（按筛选条件）
ipcMain.handle('export:ordersExcel', async (_e, { filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };

    const where = [];
    const params = [];
    if (filters.orderNumber && String(filters.orderNumber).trim()) { where.push('order_number LIKE ?'); params.push(`%${filters.orderNumber.trim()}%`); }
    if (filters.supplier && String(filters.supplier).trim()) { where.push('supplier = ?'); params.push(filters.supplier.trim()); }
    if (filters.status && String(filters.status).trim()) { where.push('status = ?'); params.push(filters.status.trim()); }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) { where.push('date(order_date) BETWEEN date(?) AND date(?)'); params.push(filters.dateRange[0], filters.dateRange[1]); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const rows = d.query(`SELECT order_number, order_date, supplier, total_amount, status, notes FROM orders ${whereSql} ORDER BY order_date DESC, id DESC`, params);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('订单');
    ws.columns = [
      { header: '订单号', key: 'order_number', width: 20 },
      { header: '订单日期', key: 'order_date', width: 15 },
      { header: '供应商', key: 'supplier', width: 24 },
      { header: '总金额', key: 'total_amount', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '备注', key: 'notes', width: 40 }
    ];
    rows.forEach(r => ws.addRow({ ...r, notes: (r.notes||'').replace(/\r?\n/g,' ') }));
    ws.getRow(1).font = { bold: true };

    const res = await dialog.showSaveDialog({
      title: '导出订单为 Excel',
      defaultPath: path.join(userDataDir, `orders-${Date.now()}.xlsx`),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    await wb.xlsx.writeFile(res.filePath);
    console.log('[Main] Exported orders Excel to', res.filePath);
    return { ok: true, filePath: res.filePath, count: rows.length };
  } catch (e) {
    console.error('export:ordersExcel error', e);
    return { ok: false, error: e.message };
  }
});

// 导出入库为Excel（按筛选条件）
ipcMain.handle('export:stockInExcel', async (_e, { filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };

    const where = [];
    const params = [];
    if (filters.partModel && String(filters.partModel).trim()) { where.push('pm.model_name LIKE ?'); params.push(`%${filters.partModel.trim()}%`); }
    if (filters.orderNumber && String(filters.orderNumber).trim()) { where.push('si.order_id IN (SELECT id FROM orders WHERE order_number LIKE ? )'); params.push(`%${filters.orderNumber.trim()}%`); }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) { where.push('date(si.stock_in_date) BETWEEN date(?) AND date(?)'); params.push(filters.dateRange[0], filters.dateRange[1]); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const rows = d.query(`
      SELECT si.id, pm.model_code, pm.model_name, pm.specification, pm.category, pm.unit,
             si.quantity, si.unit_price, si.total_amount, si.stock_in_date, si.operator, si.notes
      FROM stock_in si
      LEFT JOIN part_models pm ON pm.id = si.part_model_id
      ${whereSql}
      ORDER BY si.stock_in_date DESC, si.id DESC
    `, params);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('入库');
    ws.columns = [
      { header: '入库单号', key: 'id', width: 14 },
      { header: '型号编码', key: 'model_code', width: 18 },
      { header: '配件型号', key: 'model_name', width: 24 },
      { header: '规格', key: 'specification', width: 18 },
      { header: '分类', key: 'category', width: 12 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单价', key: 'unit_price', width: 12 },
      { header: '总金额', key: 'total_amount', width: 12 },
      { header: '入库日期', key: 'stock_in_date', width: 14 },
      { header: '操作员', key: 'operator', width: 12 },
      { header: '备注', key: 'notes', width: 30 }
    ];
    rows.forEach(r => ws.addRow({ ...r, notes: (r.notes||'').replace(/\r?\n/g,' ') }));
    ws.getRow(1).font = { bold: true };

    const res = await dialog.showSaveDialog({
      title: '导出入库为 Excel',
      defaultPath: path.join(userDataDir, `stock-in-${Date.now()}.xlsx`),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    await wb.xlsx.writeFile(res.filePath);
    console.log('[Main] Exported stock-in Excel to', res.filePath);
    return { ok: true, filePath: res.filePath, count: rows.length };
  } catch (e) {
    console.error('export:stockInExcel error', e);
    return { ok: false, error: e.message };
  }
});

// 导出出库为Excel（按筛选条件）
ipcMain.handle('export:stockOutExcel', async (_e, { filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };

    const where = [];
    const params = [];
    if (filters.partModel && String(filters.partModel).trim()) { where.push('pm.model_name LIKE ?'); params.push(`%${filters.partModel.trim()}%`); }
    if (filters.department && String(filters.department).trim()) { where.push('so.department = ?'); params.push(filters.department.trim()); }
    if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange[0] && filters.dateRange[1]) { where.push('date(so.stock_out_date) BETWEEN date(?) AND date(?)'); params.push(filters.dateRange[0], filters.dateRange[1]); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const rows = d.query(`
      SELECT so.id, pm.model_code, pm.model_name, pm.specification, pm.category, pm.unit,
             so.quantity, so.unit_price, so.total_amount, so.recipient, so.department, so.stock_out_date, so.operator, so.notes
      FROM stock_out so
      LEFT JOIN part_models pm ON pm.id = so.part_model_id
      ${whereSql}
      ORDER BY so.stock_out_date DESC, so.id DESC
    `, params);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('出库');
    ws.columns = [
      { header: '出库单号', key: 'id', width: 14 },
      { header: '型号编码', key: 'model_code', width: 18 },
      { header: '配件型号', key: 'model_name', width: 24 },
      { header: '规格', key: 'specification', width: 18 },
      { header: '分类', key: 'category', width: 12 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单价', key: 'unit_price', width: 12 },
      { header: '总金额', key: 'total_amount', width: 12 },
      { header: '领用人', key: 'recipient', width: 12 },
      { header: '部门', key: 'department', width: 12 },
      { header: '出库日期', key: 'stock_out_date', width: 14 },
      { header: '操作员', key: 'operator', width: 12 },
      { header: '备注', key: 'notes', width: 30 }
    ];
    rows.forEach(r => ws.addRow({ ...r, notes: (r.notes||'').replace(/\r?\n/g,' ') }));
    ws.getRow(1).font = { bold: true };

    const res = await dialog.showSaveDialog({
      title: '导出出库为 Excel',
      defaultPath: path.join(userDataDir, `stock-out-${Date.now()}.xlsx`),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    await wb.xlsx.writeFile(res.filePath);
    console.log('[Main] Exported stock-out Excel to', res.filePath);
    return { ok: true, filePath: res.filePath, count: rows.length };
  } catch (e) {
    console.error('export:stockOutExcel error', e);
    return { ok: false, error: e.message };
  }
});

// 导出库存为Excel（按筛选条件）
ipcMain.handle('export:inventoryExcel', async (_e, { filters = {} } = {}) => {
  try {
    const d = getDb();
    if (!d) return { ok: false };

    const where = [];
    const params = [];
    if (filters.keyword && String(filters.keyword).trim()) {
      const kw = `%${filters.keyword.trim()}%`;
      where.push('(pm.model_code LIKE ? OR pm.model_name LIKE ? OR pm.specification LIKE ?)');
      params.push(kw, kw, kw);
    }
    if (filters.category && filters.category !== 'all') { where.push('pm.category = ?'); params.push(filters.category); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const rows = d.query(`
      SELECT pm.model_code, pm.model_name, pm.specification, pm.category, pm.unit,
             COALESCE((SELECT SUM(quantity) FROM stock_in si WHERE si.part_model_id=pm.id),0) as inQty,
             COALESCE((SELECT SUM(total_amount) FROM stock_in si WHERE si.part_model_id=pm.id),0) as inAmount,
             COALESCE((SELECT SUM(quantity) FROM stock_out so WHERE so.part_model_id=pm.id),0) as outQty
      FROM part_models pm
      ${whereSql}
      ORDER BY pm.model_code
    `, params).map(r => {
      const current = Math.max(0, (r.inQty||0) - (r.outQty||0));
      const avgCost = (r.inQty||0) > 0 ? (r.inAmount / r.inQty) : 0;
      return {
        model_code: r.model_code,
        model_name: r.model_name,
        specification: r.specification,
        category: r.category,
        unit: r.unit,
        current_quantity: current,
        average_cost: avgCost,
        total_value: current * avgCost
      };
    });

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('库存');
    ws.columns = [
      { header: '型号编码', key: 'model_code', width: 18 },
      { header: '配件名称', key: 'model_name', width: 24 },
      { header: '规格', key: 'specification', width: 18 },
      { header: '分类', key: 'category', width: 12 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '当前库存', key: 'current_quantity', width: 12 },
      { header: '平均成本', key: 'average_cost', width: 12 },
      { header: '库存价值', key: 'total_value', width: 12 }
    ];
    rows.forEach(r => ws.addRow(r));
    ws.getRow(1).font = { bold: true };

    const res = await dialog.showSaveDialog({
      title: '导出库存为 Excel',
      defaultPath: path.join(userDataDir, `inventory-${Date.now()}.xlsx`),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    await wb.xlsx.writeFile(res.filePath);
    console.log('[Main] Exported inventory Excel to', res.filePath);
    return { ok: true, filePath: res.filePath, count: rows.length };
  } catch (e) {
    console.error('export:inventoryExcel error', e);
    return { ok: false, error: e.message };
  }
});

console.log('[Main] IPC handlers registered: appData:get, appData:set');