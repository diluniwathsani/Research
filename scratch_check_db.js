const pool = require('./backend/database.js');

async function check() {
    const res = await pool.query("SELECT batch_name, count(id) as cnt FROM requirements WHERE completeness_status != 'Complete' GROUP BY batch_name");
    console.log("BATCHES WITH INCOMPLETE REQS:", res.rows);
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
