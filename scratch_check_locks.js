const pool = require('./backend/database.js');

async function checkLocks() {
    try {
        const res = await pool.query(`
            SELECT pid, usename, state, query_start, query 
            FROM pg_stat_activity 
            WHERE state != 'idle' AND pid != pg_backend_pid();
        `);
        console.log("ACTIVE QUERIES:", res.rows);

        // Terminate any stuck backend connections if any
        for (const row of res.rows) {
            if (row.query && (row.query.includes('ALTER TABLE') || row.query.includes('requirements'))) {
                console.log(`Terminating stuck PID ${row.pid}: ${row.query.slice(0, 50)}`);
                await pool.query(`SELECT pg_terminate_backend($1)`, [row.pid]);
            }
        }
    } catch (e) {
        console.error("Lock check error:", e.message);
    } finally {
        process.exit(0);
    }
}

checkLocks();
