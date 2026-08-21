// test.js
const dotenv = require('dotenv');
dotenv.config();

console.log('📁 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Not found');
console.log('📄 Value:', process.env.DATABASE_URL);