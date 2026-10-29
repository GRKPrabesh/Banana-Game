import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../../sql/schema.sql');

async function main() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'banana',
    password: process.env.MYSQL_PASSWORD || 'banana_dev_pass',
    multipleStatements: true,
  });

  await connection.query(sql);
  await connection.end();
  console.log('MySQL schema applied successfully.');
}

main().catch((err) => {
  console.error('Failed to init MySQL schema:', err.message);
  process.exit(1);
});
