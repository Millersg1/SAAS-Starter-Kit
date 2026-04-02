import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  statement_timeout: 30000, // Kill queries running longer than 30 seconds
  allowExitOnIdle: false, // Keep pool alive
};

// Create a new pool
const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database - database.js:25');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client - database.js:29', err);
  // Do NOT process.exit — the pool will remove the bad client and create a new one.
  // Exiting here would kill the server for transient network blips.
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query - database.js:39', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error: - database.js:42', error);
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds! - database.js:55');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
};

// Test database connection
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('✅ Database connection test successful - database.js:78');
    console.log('Server time: - database.js:79', result.rows[0].now);
    console.log('PostgreSQL version: - database.js:80', result.rows[0].version.split(',')[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed: - database.js:83', error.message);
    return false;
  }
};

// Graceful shutdown
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed - database.js:92');
  } catch (error) {
    console.error('❌ Error closing database pool: - database.js:94', error);
  }
};

export default pool;
