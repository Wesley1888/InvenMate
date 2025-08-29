const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor(userDataPath) {
    const dbPath = path.join(userDataPath, 'invenmate.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = DELETE');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');
    this.initTables();
  }

  initTables() {
    // 业务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS part_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_code TEXT UNIQUE NOT NULL,
        model_name TEXT NOT NULL,
        specification TEXT,
        unit TEXT NOT NULL,
        category TEXT,
        description TEXT,
        min_threshold INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        part_model_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      );

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
      );

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
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_model_id INTEGER UNIQUE NOT NULL,
        current_quantity INTEGER DEFAULT 0,
        total_in_quantity INTEGER DEFAULT 0,
        total_out_quantity INTEGER DEFAULT 0,
        average_cost DECIMAL(10,2) DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (part_model_id) REFERENCES part_models (id)
      );

      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_part_models_code ON part_models(model_code);
      CREATE INDEX IF NOT EXISTS idx_part_models_category ON part_models(category);
      CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_stock_in_date ON stock_in(stock_in_date);
      CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out(stock_out_date);
    `);

    // 兼容历史库：没有 min_threshold 列则添加
    try {
      const cols = this.db.prepare("PRAGMA table_info(part_models)").all();
      const hasCol = cols.some(c => c.name === 'min_threshold');
      if (!hasCol) {
        this.db.exec('ALTER TABLE part_models ADD COLUMN min_threshold INTEGER DEFAULT 0');
      }
    } catch (e) {
      // ignore
    }

    // 初始化示例数据（仅当数据库为空时）
    this.initSampleData();
  }

  initSampleData() {
    // 检查是否已有数据
    const partModelsCount = this.db.prepare('SELECT COUNT(*) as count FROM part_models').get().count;
    if (partModelsCount > 0) {
      return; // 已有数据，不初始化示例数据
    }

    console.log('[Database] Initializing sample data...');

    // 插入示例配件型号
    const samplePartModels = [
      {
        model_code: 'CPU-001',
        model_name: 'Intel Core i7-12700K',
        specification: '12核20线程 3.6GHz',
        unit: '个',
        category: 'CPU',
        description: '高性能处理器',
        min_threshold: 5
      },
      {
        model_code: 'RAM-001',
        model_name: '金士顿 DDR4 16GB',
        specification: '3200MHz 双通道',
        unit: '条',
        category: '内存',
        description: '高性能内存条',
        min_threshold: 10
      },
      {
        model_code: 'SSD-001',
        model_name: '三星 970 EVO Plus 1TB',
        specification: 'NVMe M.2 PCIe 3.0',
        unit: '个',
        category: '存储',
        description: '高速固态硬盘',
        min_threshold: 8
      },
      {
        model_code: 'GPU-001',
        model_name: 'NVIDIA RTX 4060',
        specification: '8GB GDDR6',
        unit: '个',
        category: '显卡',
        description: '中端游戏显卡',
        min_threshold: 3
      },
      {
        model_code: 'MB-001',
        model_name: '华硕 ROG B760-F',
        specification: 'Intel B760 芯片组',
        unit: '个',
        category: '主板',
        description: '高性能主板',
        min_threshold: 4
      },
      {
        model_code: 'PSU-001',
        model_name: '海韵 650W 金牌',
        specification: '全模组 80Plus 金牌',
        unit: '个',
        category: '电源',
        description: '高品质电源',
        min_threshold: 6
      },
      {
        model_code: 'CASE-001',
        model_name: '联力 O11D',
        specification: 'ATX 中塔机箱',
        unit: '个',
        category: '机箱',
        description: '高端机箱',
        min_threshold: 2
      },
      {
        model_code: 'COOLER-001',
        model_name: '利民 PA120',
        specification: '双塔 6热管',
        unit: '个',
        category: '散热器',
        description: '高性能风冷散热器',
        min_threshold: 7
      }
    ];

    const insertPartModel = this.db.prepare(`
      INSERT INTO part_models (model_code, model_name, specification, unit, category, description, min_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    samplePartModels.forEach(model => {
      insertPartModel.run([
        model.model_code,
        model.model_name,
        model.specification,
        model.unit,
        model.category,
        model.description,
        model.min_threshold
      ]);
    });

    // 插入示例部门
    const sampleDepartments = [
      { name: 'IT部门', code: 'IT' },
      { name: '研发部', code: 'RD' },
      { name: '测试部', code: 'QA' },
      { name: '运维部', code: 'OPS' },
      { name: '行政部', code: 'ADMIN' }
    ];

    const insertDepartment = this.db.prepare(`
      INSERT INTO departments (name, code)
      VALUES (?, ?)
    `);

    sampleDepartments.forEach(dept => {
      insertDepartment.run([dept.name, dept.code]);
    });

    // 插入示例供应商
    const sampleSuppliers = [
      {
        name: '京东商城',
        contact_person: '张经理',
        phone: '400-606-5500',
        email: 'service@jd.com',
        address: '北京市朝阳区'
      },
      {
        name: '天猫商城',
        contact_person: '李经理',
        phone: '400-860-8608',
        email: 'service@tmall.com',
        address: '杭州市余杭区'
      },
      {
        name: '华硕官方旗舰店',
        contact_person: '王经理',
        phone: '400-600-6655',
        email: 'service@asus.com.cn',
        address: '上海市浦东新区'
      }
    ];

    const insertSupplier = this.db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `);

    sampleSuppliers.forEach(supplier => {
      insertSupplier.run([
        supplier.name,
        supplier.contact_person,
        supplier.phone,
        supplier.email,
        supplier.address
      ]);
    });

    // 使用事务插入订单和相关数据
    const tx = this.db.transaction(() => {
      // 插入示例订单
      const insertOrder = this.db.prepare(`
        INSERT INTO orders (order_number, order_date, supplier, total_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const order1 = insertOrder.run([
        'PO-2024-001',
        '2024-01-15',
        '京东商城',
        12500.00,
        'completed',
        'IT部门设备采购'
      ]);

      const order2 = insertOrder.run([
        'PO-2024-002',
        '2024-01-20',
        '华硕官方旗舰店',
        8900.00,
        'pending',
        '研发部硬件升级'
      ]);

      // 插入示例订单明细
      const insertOrderItem = this.db.prepare(`
        INSERT INTO order_items (order_id, part_model_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      // 订单1的明细
      insertOrderItem.run([order1.lastInsertRowid, 1, 2, 2500.00, 5000.00]); // CPU
      insertOrderItem.run([order1.lastInsertRowid, 2, 4, 350.00, 1400.00]);  // 内存
      insertOrderItem.run([order1.lastInsertRowid, 3, 2, 800.00, 1600.00]);  // SSD
      insertOrderItem.run([order1.lastInsertRowid, 4, 1, 4500.00, 4500.00]); // 显卡

      // 订单2的明细
      insertOrderItem.run([order2.lastInsertRowid, 5, 1, 1200.00, 1200.00]); // 主板
      insertOrderItem.run([order2.lastInsertRowid, 6, 1, 800.00, 800.00]);   // 电源
      insertOrderItem.run([order2.lastInsertRowid, 7, 1, 1200.00, 1200.00]); // 机箱
      insertOrderItem.run([order2.lastInsertRowid, 8, 2, 300.00, 600.00]);   // 散热器

      // 插入示例入库记录
      const insertStockIn = this.db.prepare(`
        INSERT INTO stock_in (order_id, part_model_id, quantity, unit_price, total_amount, stock_in_date, operator, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 订单1的入库记录
      insertStockIn.run([order1.lastInsertRowid, 1, 2, 2500.00, 5000.00, '2024-01-16', '张三', '正常入库']);
      insertStockIn.run([order1.lastInsertRowid, 2, 4, 350.00, 1400.00, '2024-01-16', '张三', '正常入库']);
      insertStockIn.run([order1.lastInsertRowid, 3, 2, 800.00, 1600.00, '2024-01-16', '张三', '正常入库']);
      insertStockIn.run([order1.lastInsertRowid, 4, 1, 4500.00, 4500.00, '2024-01-16', '张三', '正常入库']);

      // 插入示例出库记录
      const insertStockOut = this.db.prepare(`
        INSERT INTO stock_out (part_model_id, quantity, unit_price, total_amount, recipient, department, stock_out_date, operator, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStockOut.run([1, 1, 2500.00, 2500.00, '李四', 'IT部门', '2024-01-18', '王五', '服务器升级']);
      insertStockOut.run([2, 2, 350.00, 700.00, '赵六', '研发部', '2024-01-19', '王五', '开发机配置']);
      insertStockOut.run([3, 1, 800.00, 800.00, '钱七', '测试部', '2024-01-20', '王五', '测试环境搭建']);
    });

    // 执行事务
    tx();

    console.log('[Database] Sample data initialized successfully');

  }

  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(params);
  }

  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(params);
    return { id: result.lastInsertRowid, changes: result.changes };
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(params);
  }
}

module.exports = DatabaseService;
