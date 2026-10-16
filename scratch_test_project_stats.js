const pool = require('./backend/database.js');

async function testProjectStats() {
    try {
        const query = `
            SELECT 
                p.project_id, 
                p.project_name, 
                p.description, 
                p.project_manager, 
                p.team_size, 
                p.progress_percent, 
                p.budget_usd, 
                p.risk_level, 
                p.complexity_level, 
                p.priority, 
                p.status,
                p.created_at,
                COUNT(r.id)::int AS requirement_count,
                COUNT(CASE WHEN r.completeness_status = 'Complete' OR r.completeness_status = 'Completed by User' THEN 1 END)::int AS complete_count
            FROM public.projects p
            LEFT JOIN public.requirements r ON (r.project_id = p.project_id OR r.batch_name = p.project_name)
            GROUP BY p.project_id, p.project_name, p.description, p.project_manager, p.team_size, p.progress_percent, p.budget_usd, p.risk_level, p.complexity_level, p.priority, p.status, p.created_at
            ORDER BY p.created_at DESC NULLS LAST, p.project_name ASC;
        `;
        const res = await pool.query(query);
        console.log("PROJECTS WITH STATS COUNT:", res.rows.length);
        console.log("PROJECTS SAMPLE:", res.rows.slice(0, 5));
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit(0);
    }
}

testProjectStats();
