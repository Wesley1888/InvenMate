const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor(userDataPath) {
    // 使用传入的用户数据目录路径
    const dbPath = path.join(userDataPath, 'invenmate.db');
    
    try {
      this.db = new Database(dbPath);
      console.log('数据库连接成功:', dbPath);
      
      // 启用WAL模式提升性能
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('temp_store = MEMORY');
      
      this.initTables();
    } catch (error) {
      console.error('数据库连接错误:', error);
      throw error;
    }
  }

  // 初始化数据表
  initTables() {
    // 配件型号表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS part_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_code TEXT UNIQUE NOT NULL,
        model_name TEXT NOT NULL,
        specification TEXT,
        unit TEXT NOT NULL,
        category TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 订单表
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 供应商表
    this.db.exec(`
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引提升查询性能
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_part_models_code ON part_models(model_code);
      CREATE INDEX IF NOT EXISTS idx_part_models_category ON part_models(category);
      CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_stock_in_date ON stock_in(stock_in_date);
      CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out(stock_out_date);
    `);

    console.log('数据库表初始化完成');
  }

  // 通用查询方法
  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('查询错误:', error);
      throw error;
    }
  }

  // 通用执行方法
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return { id: result.lastInsertRowid, changes: result.changes };
    } catch (error) {
      console.error('执行错误:', error);
      throw error;
    }
  }

  // 获取单个记录
  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('获取记录错误:', error);
      throw error;
    }
  }

  // 事务执行
  transaction(callback) {
    try {
      return this.db.transaction(callback)();
    } catch (error) {
      console.error('事务执行错误:', error);
      throw error;
    }
  }

  // 获取数据库统计信息
  getStats() {
    try {
      const stats = {
        partModels: this.get('SELECT COUNT(*) as count FROM part_models').count,
        orders: this.get('SELECT COUNT(*) as count FROM orders').count,
        stockIn: this.get('SELECT COUNT(*) as count FROM stock_in').count,
        stockOut: this.get('SELECT COUNT(*) as count FROM stock_out').count,
        inventory: this.get('SELECT COUNT(*) as count FROM inventory').count,
        departments: this.get('SELECT COUNT(*) as count FROM departments').count,
        suppliers: this.get('SELECT COUNT(*) as count FROM suppliers').count,
        appData: this.get('SELECT COUNT(*) as count FROM app_data').count,
        dbSize: this.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').size
      };
      return stats;
    } catch (error) {
      console.error('获取统计信息错误:', error);
      return null;
    }
  }

  // 备份数据库
  backup(backupPath) {
    try {
      const backup = new Database(backupPath);
      this.db.backup(backup);
      backup.close();
      console.log('数据库备份完成:', backupPath);
      return true;
    } catch (error) {
      console.error('数据库备份错误:', error);
      return false;
    }
  }

  // 优化数据库
  optimize() {
    try {
      this.db.exec('VACUUM');
      this.db.exec('ANALYZE');
      console.log('数据库优化完成');
      return true;
    } catch (error) {
      console.error('数据库优化错误:', error);
      return false;
    }
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
      console.log('数据库连接已关闭');
    }
  }
}

module.exports = DatabaseService; 