require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

const sqliteDbPath = path.resolve(__dirname, 'requirements.db');

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WwhL4l9AFUIr@ep-little-moon-ayl6lfl8.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

const pgPool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    console.log('🚀 Starting SQLite to Neon PostgreSQL migration...');
    const pgClient = await pgPool.connect();

    try {
        // 1. Create table in Neon PostgreSQL if not exists
        console.log('📋 Ensuring table "requirements" exists in Neon PostgreSQL...');
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS requirements (
                id SERIAL PRIMARY KEY,
                requirement_sentence TEXT NOT NULL,
                completeness_status TEXT DEFAULT 'Pending',
                epic TEXT,
                feature TEXT,
                user_story TEXT,
                acceptance_criteria TEXT,
                batch_name TEXT DEFAULT 'Untitled Batch',
                created_at TEXT
            );
        `);

        // 2. Fetch all rows from SQLite database
        console.log('📖 Reading data from local SQLite database (requirements.db)...');
        const sqliteDb = new sqlite3.Database(sqliteDbPath);

        const rows = await new Promise((resolve, reject) => {
            sqliteDb.all("SELECT * FROM requirements ORDER BY id ASC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        sqliteDb.close();
        console.log(`Found ${rows.length} records in SQLite.`);

        if (rows.length === 0) {
            console.log('No records to migrate.');
            return;
        }

        // 3. Optional: Clear existing records if re-running migration
        // We will use ON CONFLICT DO UPDATE or TRUNCATE TABLE to ensure exact data match
        console.log('🧹 Preparing Neon PostgreSQL table (truncating table to ensure exact copy)...');
        await pgClient.query('TRUNCATE TABLE requirements RESTART IDENTITY;');

        // 4. Batch insert records into Neon PostgreSQL
        const BATCH_SIZE = 250;
        let insertedCount = 0;

        console.log(`⏳ Migrating ${rows.length} rows in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            
            const valueRows = [];
            const valueParams = [];
            let paramIndex = 1;

            batch.forEach(row => {
                valueRows.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`);
                valueParams.push(
                    row.id,
                    row.requirement_sentence,
                    row.completeness_status || 'Pending',
                    row.epic || null,
                    row.feature || null,
                    row.user_story || null,
                    row.acceptance_criteria || null,
                    row.batch_name || 'Untitled Batch',
                    row.created_at || null
                );
                paramIndex += 9;
            });

            const queryText = `
                INSERT INTO requirements (id, requirement_sentence, completeness_status, epic, feature, user_story, acceptance_criteria, batch_name, created_at)
                VALUES ${valueRows.join(', ')}
            `;

            await pgClient.query(queryText, valueParams);
            insertedCount += batch.length;
            console.log(`  - Progress: ${insertedCount}/${rows.length} records inserted`);
        }

        // 5. Reset PostgreSQL auto-increment sequence
        console.log('🔄 Syncing PostgreSQL primary key sequence...');
        await pgClient.query(`SELECT setval('requirements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM requirements));`);

        // 6. Verification
        const res = await pgClient.query('SELECT COUNT(*) FROM requirements');
        const neonCount = parseInt(res.rows[0].count, 10);
        console.log(`\n✅ Migration Complete!`);
        console.log(`   - SQLite Record Count: ${rows.length}`);
        console.log(`   - Neon PostgreSQL Record Count: ${neonCount}`);

        if (rows.length === neonCount) {
            console.log('🎉 Data verification successful! All records migrated perfectly.');
        } else {
            console.warn('⚠️ Warning: Record counts do not match exactly.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pgClient.release();
        await pgPool.end();
    }
}

migrate();
