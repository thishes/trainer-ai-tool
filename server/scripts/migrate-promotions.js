// 数据库迁移脚本 - 为promotions表添加signup_config列
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'kb.thishe.com',
  port: parseInt(process.env.DB_PORT) || 33060,
  user: process.env.DB_USER || 'lankong',
  password: process.env.DB_PASSWORD || 'Hejinqiang860612!',
  database: process.env.DB_NAME || 'trainer_ai_tool'
};

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[Migrate] Connected to MySQL');

    // 检查signup_config列是否存在
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'promotions' AND COLUMN_NAME = 'signup_config'"
    );

    if (columns.length === 0) {
      console.log('[Migrate] Adding signup_config column to promotions table...');
      await connection.execute(
        'ALTER TABLE promotions ADD COLUMN signup_config JSON NULL AFTER enable_signup'
      );
      console.log('[Migrate] signup_config column added successfully');
    } else {
      console.log('[Migrate] signup_config column already exists');
    }

    // 检查promotion_signups表是否需要更新
    const [signupColumns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'promotion_signups'"
    );
    
    const existingColumns = signupColumns.map(c => c.COLUMN_NAME);
    console.log('[Migrate] Existing promotion_signups columns:', existingColumns);

    // 如果需要，添加新列
    const requiredColumns = [
      { name: 'name', type: 'VARCHAR(100)' },
      { name: 'unit', type: 'VARCHAR(200)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'class_id', type: 'VARCHAR(50)' },
      { name: 'class_name', type: 'VARCHAR(100)' },
      { name: 'status', type: "ENUM('pending','approved','rejected') DEFAULT 'approved'" },
      { name: 'source', type: "ENUM('online','manual') DEFAULT 'online'" }
    ];

    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`[Migrate] Adding ${col.name} column to promotion_signups table...`);
        await connection.execute(
          `ALTER TABLE promotion_signups ADD COLUMN ${col.name} ${col.type} NULL`
        );
        console.log(`[Migrate] ${col.name} column added successfully`);
      }
    }

    console.log('[Migrate] Migration completed successfully');
  } catch (error) {
    console.error('[Migrate] Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
