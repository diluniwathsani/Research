// test-env.js
const dotenv = require('dotenv');
const path = require('path');

console.log('📁 Current directory:', __dirname);

// Try multiple ways to load .env
const result1 = dotenv.config();
console.log('🔍 dotenv.config() result:', result1.parsed ? '✅ Found' : '❌ Not found');

const result2 = dotenv.config({ path: './.env' });
console.log('🔍 dotenv.config({ path: "./.env" }) result:', result2.parsed ? '✅ Found' : '❌ Not found');

const result3 = dotenv.config({ path: path.join(__dirname, '.env') });
console.log('🔍 dotenv.config({ path: path.join(__dirname, ".env") }) result:', result3.parsed ? '✅ Found' : '❌ Not found');

console.log('📄 DATABASE_URL:', process.env.DATABASE_URL || '❌ Not set');