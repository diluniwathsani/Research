const pool = require('./backend/database.js');

async function cleanAll() {
    try {
        const res = await pool.query(`
            SELECT pid, state, query 
            FROM pg_stat_activity 
            WHERE pid != pg_backend_pid() AND datname = 'neondb';
        `);
        console.log("ALL SESSIONS:", res.rows);
        for (const r of res.rows) {
            if (r.state === 'idle in transaction' || r.state === 'active') {
                console.log(`Terminating ${r.pid} (${r.state})`);
                await pool.query(`SELECT pg_terminate_backend($1)`, [r.pid]);
            }
        }
    } catch (e) {
        console.error("Clean error:", e.message);
    } finally {
        process.exit(0);
    }
}

cleanAll();
