import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const result = dotenv.config({ path: join(__dirname, '.env') });

console.log('\n======================================== - check-env.js:11');
console.log('Environment Variables Check - check-env.js:12');
console.log('========================================\n - check-env.js:13');

if (result.error) {
  console.error('❌ Error loading .env file: - check-env.js:16', result.error.message);
} else {
  console.log('✅ .env file loaded successfully\n - check-env.js:18');
}

console.log('Database Configuration: - check-env.js:21');
console.log('');
console.log('DB_HOST: - check-env.js:23', process.env.DB_HOST || '(not set - will default to localhost)');
console.log('DB_PORT: - check-env.js:24', process.env.DB_PORT || '(not set - will default to 5432)');
console.log('DB_NAME: - check-env.js:25', process.env.DB_NAME || '(not set)');
console.log('DB_USER: - check-env.js:26', process.env.DB_USER || '(not set)');
console.log('DB_PASSWORD: - check-env.js:27', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : '(not set)');
console.log('\nNODE_ENV: - check-env.js:28', process.env.NODE_ENV || '(not set)');
console.log('PORT: - check-env.js:29', process.env.PORT || '(not set - will default to 5000)');
console.log('\n========================================\n - check-env.js:30');
