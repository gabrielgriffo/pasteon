import mysql from 'mysql2/promise';

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
export const pool = mysql.createPool(mysqlConfig);

// Test connection on startup
pool.getConnection()
  .then(async (connection) => {
    // Set charset for this connection
    await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  });

/**
 * Helper to execute query with proper charset
 */
async function executeWithCharset(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    // Set charset for this connection
    await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');

    // Log charset variables for debugging
    const [charsetVars] = await connection.query(
      "SHOW VARIABLES WHERE Variable_name IN ('character_set_client', 'character_set_connection', 'character_set_results', 'collation_connection')"
    );

    // Log first few params for debugging (truncated)
    if (params.length > 0) {
      const truncatedParams = params.slice(0, 3).map(p =>
        typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p
      );
      console.log('🔍 First params:', truncatedParams);
    }

    // Execute the actual query
    const [result] = await connection.execute(sql, params);
    return result;
  } catch (error) {
    console.error('❌ executeWithCharset error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      paramsLength: params.length
    });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Execute a SELECT query and return all rows
 */
export async function query(sql, params = []) {
  try {
    return await executeWithCharset(sql, params);
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Execute a SELECT query and return the first row or null
 */
export async function querySingle(sql, params = []) {
  try {
    const rows = await executeWithCharset(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('QuerySingle error:', error);
    throw error;
  }
}

/**
 * Execute an INSERT query and return the inserted ID
 */
export async function insert(sql, params = []) {
  try {
    const result = await executeWithCharset(sql, params);
    return result.insertId;
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
}

/**
 * Execute an UPDATE or DELETE query and return affected rows
 */
export async function execute(sql, params = []) {
  try {
    const result = await executeWithCharset(sql, params);
    return result.affectedRows;
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
}
