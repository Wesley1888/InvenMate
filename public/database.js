const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
  constructor(userDataPath) {
    const dbPath = path.join(userDataPath, 'invenmate.db');
    this.db = new Database(dbPath);
    // 使用 DELETE 模式，变更直接反映到主数据库文件
    this.db.pragma('journal_mode = DELETE');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
