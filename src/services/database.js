const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class DatabaseService {
  constructor() {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'invenmate.db');
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接错误:', err);
      } else {
        console.log('数据库连接成功');
        this.initTables();
      }
    });
  }

  // 初始化数据表
  initTables() {
    // 配件型号表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS part_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_code TEXT UNIQUE NOT NULL,
        model_name TEXT NOT NULL,
        specification TEXT,
        unit TEXT NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 订单表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        order_date DATE NOT NULL,
        supplier TEXT,
        total_amount DECIMAL(10,2) DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 订单明细表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        part_model_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      )
    `);

    // 入库记录表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stock_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        part_model_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        stock_in_date DATE NOT NULL,
        operator TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      )
    `);

    // 出库记录表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stock_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_model_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        recipient TEXT NOT NULL,
        department TEXT,
        stock_out_date DATE NOT NULL,
        operator TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      )
    `);

    // 库存表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_model_id INTEGER UNIQUE NOT NULL,
        current_quantity INTEGER DEFAULT 0,
        total_in_quantity INTEGER DEFAULT 0,
        total_out_quantity INTEGER DEFAULT 0,
        average_cost DECIMAL(10,2) DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      )
    `);

    // 部门表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 供应商表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 通用应用数据表（KV存储，用于轻量持久化前端结构化数据）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // 通用查询方法
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 通用执行方法
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // 获取单个记录
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 关闭数据库连接
  close() {
    this.db.close();
  }
}

// 创建单例实例
const databaseService = new DatabaseService();

module.exports = databaseService; 