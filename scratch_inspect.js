const pool = require('./backend/database.js');

async function inspect() {
    try {
        console.log('--- PROJECTS TABLE ---');
        const proj = await pool.query("SELECT * FROM projects");
        console.log("PROJECTS COUNT:", proj.rows.length);
        console.log("PROJECTS:", proj.rows);

        console.log('\n--- REQUIREMENTS TABLE PROJECT IDS ---');
        const reqs = await pool.query("SELECT project_id, batch_name, count(*) as count FROM requirements GROUP BY project_id, batch_name");
        console.log("REQUIREMENTS SUMMARY:", reqs.rows);

        console.log('\n--- SAMPLE 3 REQS ---');
        const sample = await pool.query("SELECT id, requirement_sentence, project_id, batch_name FROM requirements LIMIT 3");
        console.log("SAMPLE REQS:", sample.rows);

    } catch (e) {
        console.error("INSPECT ERROR:", e);
    } finally {
        process.exit(0);
    }
}

inspect();
