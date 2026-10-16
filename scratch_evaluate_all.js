const pool = require('./backend/database.js');
const fs = require('fs');

// Extract evaluateRequirementQuality from server.js
const serverCode = fs.readFileSync('./backend/server.js', 'utf8');
const fnCode = serverCode.slice(
    serverCode.indexOf('function evaluateRequirementQuality'),
    serverCode.indexOf('function generateDynamicArtifacts')
) + 'return evaluateRequirementQuality;';
const evaluateRequirementQuality = new Function(fnCode)();

async function run() {
    const res = await pool.query("SELECT id, requirement_sentence, completeness_status FROM requirements");
    console.log(`Total rows in DB: ${res.rows.length}`);
    
    let complete = 0, incomplete = 0, ambiguous = 0, inconsistent = 0;
    const updates = [];
    
    for (const r of res.rows) {
        const calculated = evaluateRequirementQuality(r.requirement_sentence);
        if (calculated.startsWith('Incomplete')) incomplete++;
        else if (calculated.startsWith('Ambiguous')) ambiguous++;
        else if (calculated.startsWith('Inconsistent')) inconsistent++;
        else complete++;
        
        if (calculated !== r.completeness_status && r.completeness_status !== 'Completed by User') {
            updates.push({ id: r.id, sentence: r.requirement_sentence, old: r.completeness_status, next: calculated });
        }
    }
    
    console.log("Calculated counts:", { complete, incomplete, ambiguous, inconsistent });
    console.log(`Discrepancies found: ${updates.length}`);
    if (updates.length > 0) {
        console.log("Sample discrepancies (first 5):", JSON.stringify(updates.slice(0, 5), null, 2));
    }
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
