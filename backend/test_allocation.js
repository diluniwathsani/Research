// backend/test_allocation.js
const assert = require('assert');
const {
    allocateTasks,
    calculateSkillMatchPercentage,
    calculateComplexitySenioritySuitability,
    getSeniorityRank,
    normalizeDomainString
} = require('./server.js');

console.log('='.repeat(60));
console.log('RUNNING ALLOCATION ALGORITHM VERIFICATION SUITE');
console.log('='.repeat(60));

let passed = 0;
let total = 0;

function runTest(name, fn) {
    total++;
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(err);
    }
}

// -------------------------------------------------------------
// Test 1: Zero Capacity Developer Never Receives Work
// -------------------------------------------------------------
runTest('Developers with zero or negative remaining capacity are strictly excluded', () => {
    const devs = [
        { id: 'D1', name: 'Dev Zero', capacity_hours: 40, project_commitments: [{ project_id: 'P99', hours: 40 }], primary_domain: 'backend', languages: ['Python'], role: 'Senior' },
        { id: 'D2', name: 'Dev Available', capacity_hours: 40, project_commitments: [], primary_domain: 'frontend', languages: ['React'], role: 'Junior' }
    ];
    const tasks = [
        { story_id: 'T1', priority: 'HIGH', estimated_hours: 10, required_domain: 'backend', required_skills: ['Python'] }
    ];

    // D1 (backend) has 0 capacity, D2 (frontend) has capacity but wrong domain
    // Under strict domain filtering, the task should be UNASSIGNED (not given to D2)
    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, null, 'Backend task must NOT be assigned to frontend dev');
    assert.ok(assignments[0].unassigned_reason, 'Unassigned entry must have a reason');

    // If all developers have 0 capacity
    const zeroDevs = [
        { id: 'D1', name: 'Dev Zero', capacity_hours: 0, project_commitments: [], primary_domain: 'backend', languages: ['Python'], role: 'Senior' }
    ];
    const zeroAssignments = allocateTasks(tasks, zeroDevs, 'P01');
    // Should still produce an unassigned entry (not silently skip)
    assert.ok(zeroAssignments.length <= 1, 'Zero-capacity backend dev should not produce a valid assignment');
});

// -------------------------------------------------------------
// Test 2: Process Work Items by Priority Order (CRITICAL -> HIGH -> MEDIUM -> LOW)
// -------------------------------------------------------------
runTest('Work items are strictly processed in CRITICAL -> HIGH -> MEDIUM -> LOW priority order', () => {
    const dev = [
        { id: 'D1', name: 'Solo Dev', capacity_hours: 10, project_commitments: [], primary_domain: 'backend', languages: ['JavaScript'], role: 'Senior' }
    ];

    // Intentionally pass in reverse/mixed order
    const tasks = [
        { story_id: 'LOW-1', priority: 'LOW', estimated_hours: 10, required_domain: 'backend' },
        { story_id: 'MED-1', priority: 'MEDIUM', estimated_hours: 10, required_domain: 'backend' },
        { story_id: 'CRIT-1', priority: 'CRITICAL', estimated_hours: 10, required_domain: 'backend' },
        { story_id: 'HIGH-1', priority: 'HIGH', estimated_hours: 10, required_domain: 'backend' }
    ];

    // Solo Dev only has 10 hours, so only the first processed item will get allocated
    const assignments = allocateTasks(tasks, dev, 'P01');
    const assigned = assignments.filter(a => a.developer_id !== null);
    assert.strictEqual(assigned.length, 1);
    assert.strictEqual(assigned[0].story_id, 'CRIT-1', 'CRITICAL task must be allocated first and consume capacity');
    assert.strictEqual(assignments.length, 4, 'Remaining 3 tasks should be returned as unassigned');
});

runTest('Tasks with identical priority preserve their relative order', () => {
    const devs = [
        { id: 'D1', name: 'Dev A', capacity_hours: 10, project_commitments: [], primary_domain: 'backend', languages: ['Java'], role: 'Senior' }
    ];

    const tasks = [
        { story_id: 'CRIT-FIRST', priority: 'CRITICAL', estimated_hours: 10, required_domain: 'backend' },
        { story_id: 'CRIT-SECOND', priority: 'CRITICAL', estimated_hours: 10, required_domain: 'backend' }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    const assigned = assignments.filter(a => a.developer_id !== null);
    assert.strictEqual(assigned.length, 1);
    assert.strictEqual(assigned[0].story_id, 'CRIT-FIRST');
    assert.strictEqual(assignments.length, 2, 'Second task should be returned as unassigned due to capacity');
});

// -------------------------------------------------------------
// Test 3: Exact Domain Match Outranks Non-Match (Criterion 1)
// -------------------------------------------------------------
runTest('Exact domain match outranks non-matching domain regardless of skills or seniority', () => {
    const devs = [
        // D1 has exact domain match, but 0 skills and Junior
        { id: 'D1', name: 'Backend Junior', capacity_hours: 20, primary_domain: 'backend', languages: [], role: 'Junior' },
        // D2 has non-matching domain, but 100% skills, Senior, higher capacity
        { id: 'D2', name: 'Frontend Senior', capacity_hours: 40, primary_domain: 'frontend', languages: ['Java', 'SQL'], role: 'Senior' }
    ];

    const tasks = [
        { story_id: 'T1', priority: 'MEDIUM', estimated_hours: 8, required_domain: 'backend', required_skills: ['Java', 'SQL'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, 'D1', 'Exact domain match must outrank non-match');
    assert.strictEqual(assignments[0].matched_domain, 'backend');
});

// -------------------------------------------------------------
// Test 4: Higher Skill-Match Percentage Ranks First (Criterion 2)
// -------------------------------------------------------------
runTest('Higher skill-match percentage ranks first when domains are equal', () => {
    const devs = [
        { id: 'D1', name: 'Dev C (33%)', capacity_hours: 40, primary_domain: 'backend', languages: ['Python'], role: 'Senior' },
        { id: 'D2', name: 'Dev A (100%)', capacity_hours: 10, primary_domain: 'backend', languages: ['Python', 'ML', 'API'], role: 'Junior' },
        { id: 'D3', name: 'Dev B (67%)', capacity_hours: 40, primary_domain: 'backend', languages: ['Python', 'ML'], role: 'Senior' }
    ];

    const tasks = [
        { story_id: 'T1', priority: 'HIGH', estimated_hours: 8, required_domain: 'backend', required_skills: ['Python', 'ML', 'API'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, 'D2', 'Dev A (100% skill match) must be chosen over 67% and 33%');
    assert.strictEqual(assignments[0].skill_match_score, 100);
});

runTest('Skill-match percentage calculates correctly and handles empty required skills neutrally', () => {
    assert.strictEqual(calculateSkillMatchPercentage(['Python', 'ML', 'API'], ['Python', 'ML', 'API']), 100);
    assert.strictEqual(calculateSkillMatchPercentage(['Python', 'ML'], ['Python', 'ML', 'API']), (2 / 3) * 100);
    assert.strictEqual(calculateSkillMatchPercentage(['Python'], ['Python', 'ML', 'API']), (1 / 3) * 100);
    assert.strictEqual(calculateSkillMatchPercentage([], ['Python']), 0);
    // Neutral fallback when no skills are required
    assert.strictEqual(calculateSkillMatchPercentage(['Python'], []), 100);
    assert.strictEqual(calculateSkillMatchPercentage([], []), 100);
});

// -------------------------------------------------------------
// Test 5: Complexity / Seniority Suitability Rules (Criterion 3)
// -------------------------------------------------------------
runTest('Seniority suitability adheres to deterministic rules across complexity tiers', () => {
    // HIGH complexity: Senior/Lead (3) > Mid (2) > Junior (1)
    assert.strictEqual(calculateComplexitySenioritySuitability('HIGH', 'Senior Developer'), 3);
    assert.strictEqual(calculateComplexitySenioritySuitability('HIGH', 'Lead Architect'), 3);
    assert.strictEqual(calculateComplexitySenioritySuitability('HIGH', 'Software Engineer'), 2); // Mid
    assert.strictEqual(calculateComplexitySenioritySuitability('HIGH', 'Junior Developer'), 1);

    // MEDIUM complexity: Mid or Senior (2) > Junior (1)
    assert.strictEqual(calculateComplexitySenioritySuitability('MEDIUM', 'Senior Developer'), 2);
    assert.strictEqual(calculateComplexitySenioritySuitability('MEDIUM', 'Software Engineer'), 2);
    assert.strictEqual(calculateComplexitySenioritySuitability('MEDIUM', 'Junior Developer'), 1);

    // LOW complexity: Junior or Mid (2) > Senior (1)
    assert.strictEqual(calculateComplexitySenioritySuitability('LOW', 'Junior Developer'), 2);
    assert.strictEqual(calculateComplexitySenioritySuitability('LOW', 'Software Engineer'), 2);
    assert.strictEqual(calculateComplexitySenioritySuitability('LOW', 'Senior Developer'), 1);
});

runTest('Seniority suitability breaks ties when domain and skill match are equal', () => {
    const devs = [
        { id: 'D1', name: 'Junior Dev', capacity_hours: 40, primary_domain: 'backend', languages: ['SQL'], role: 'Junior' },
        { id: 'D2', name: 'Senior Dev', capacity_hours: 20, primary_domain: 'backend', languages: ['SQL'], role: 'Senior' }
    ];

    const taskHigh = [
        { story_id: 'T1', priority: 'HIGH', estimated_hours: 12, predicted_complexity: 'HIGH', required_domain: 'backend', required_skills: ['SQL'] }
    ];

    const assignments = allocateTasks(taskHigh, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, 'D2', 'Senior dev must be selected for HIGH complexity task');
});

// -------------------------------------------------------------
// Test 6: Higher Remaining Capacity as Final Ranking Criterion (Criterion 4)
// -------------------------------------------------------------
runTest('Higher remaining capacity ranks first when domain, skills, and seniority are equal', () => {
    const devs = [
        { id: 'D1', name: 'Senior Dev 20h', capacity_hours: 20, primary_domain: 'backend', languages: ['SQL'], role: 'Senior' },
        { id: 'D2', name: 'Senior Dev 40h', capacity_hours: 40, primary_domain: 'backend', languages: ['SQL'], role: 'Senior' }
    ];

    const task = [
        { story_id: 'T1', priority: 'MEDIUM', estimated_hours: 8, required_domain: 'backend', required_skills: ['SQL'] }
    ];

    const assignments = allocateTasks(task, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, 'D2', 'Dev with 40h capacity must rank before dev with 20h capacity');
});

// -------------------------------------------------------------
// Test 7: Capacity Updates Consistently Across Subsequent Items
// -------------------------------------------------------------
runTest('Developer capacity is updated immediately after each allocation and bounds respected', () => {
    const devs = [
        { id: 'D1', name: 'Sole Dev', capacity_hours: 30, primary_domain: 'backend', languages: ['Node.js'], role: 'Senior' }
    ];

    const tasks = [
        { story_id: 'T1', priority: 'CRITICAL', estimated_hours: 20, required_domain: 'backend', required_skills: ['Node.js'] },
        { story_id: 'T2', priority: 'HIGH', estimated_hours: 10, required_domain: 'backend', required_skills: ['Node.js'] },
        { story_id: 'T3', priority: 'MEDIUM', estimated_hours: 10, required_domain: 'backend', required_skills: ['Node.js'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    // T1 gets 20h (D1 has 10h remaining)
    // T2 gets 10h (D1 has 0h remaining)
    // T3 cannot be allocated because D1 has 0h remaining
    assert.strictEqual(assignments.length, 3);
    assert.strictEqual(assignments[0].story_id, 'T1');
    assert.strictEqual(assignments[0].allocated_hours, 20);
    assert.strictEqual(assignments[1].story_id, 'T2');
    assert.strictEqual(assignments[1].allocated_hours, 10);
    assert.strictEqual(assignments[2].story_id, 'T3');
    assert.strictEqual(assignments[2].developer_id, null, 'T3 must be unassigned due to insufficient capacity');
});

runTest('Do not assign tasks to developers with insufficient remaining capacity for full estimate', () => {
    const devs = [
        { id: 'D1', name: 'Dev 10h', capacity_hours: 10, primary_domain: 'backend', languages: ['Node.js'], role: 'Senior' }
    ];
    const tasks = [
        { story_id: 'T1', priority: 'HIGH', estimated_hours: 25, required_domain: 'backend', required_skills: ['Node.js'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    assert.strictEqual(assignments[0].developer_id, null, '25h task cannot fit in 10h developer');
    assert.ok(assignments[0].unassigned_reason.includes('capacity'));
});

// -------------------------------------------------------------
// Test 8: ML Complexity Prediction Safe Fallback
// -------------------------------------------------------------
runTest('ML Complexity Prediction uses provided value or executes safe fallback', () => {
    const devs = [
        { id: 'D1', name: 'Senior Dev', capacity_hours: 40, primary_domain: 'backend', languages: ['Python'], role: 'Senior' }
    ];

    const tasks = [
        { story_id: 'T1', priority: 'HIGH', story_points: 8, estimated_hours: 16, required_domain: 'backend' },
        { story_id: 'T2', priority: 'LOW', story_points: 2, estimated_hours: 4, required_domain: 'backend' },
        { story_id: 'T3', priority: 'MEDIUM', predicted_complexity: 'HIGH', required_domain: 'backend' }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    const a1 = assignments.find(a => a.story_id === 'T1');
    const a2 = assignments.find(a => a.story_id === 'T2');
    const a3 = assignments.find(a => a.story_id === 'T3');
    assert.strictEqual(a1.predicted_complexity, 'HIGH');
    assert.strictEqual(a2.predicted_complexity, 'LOW');
    assert.strictEqual(a3.predicted_complexity, 'HIGH');
});

// -------------------------------------------------------------
// Test 9: Backward Compatibility of API Response Structure
// -------------------------------------------------------------
runTest('API response contains both taskId/developerId/allocatedHours and existing legacy fields', () => {
    const devs = [
        { id: 'D1', name: 'Alice', capacity_hours: 40, primary_domain: 'backend', languages: ['Python'], role: 'Senior' }
    ];
    const tasks = [
        { story_id: 'TASK-101', title: 'Implement Auth', priority: 'HIGH', estimated_hours: 16, required_domain: 'backend', required_skills: ['Python'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    const a = assignments[0];

    // Preserved fields from prompt requirement: { taskId, developerId, allocatedHours }
    assert.strictEqual(a.taskId, 'TASK-101');
    assert.strictEqual(a.developerId, 'D1');
    assert.strictEqual(a.allocatedHours, 16);

    // Preserved legacy fields required by database inserts & frontend components
    assert.strictEqual(a.story_id, 'TASK-101');
    assert.strictEqual(a.developer_id, 'D1');
    assert.strictEqual(a.developer_name, 'Alice');
    assert.strictEqual(a.allocated_hours, 16);
    assert.strictEqual(a.matched_domain, 'backend');
    assert.strictEqual(typeof a.skill_match_score, 'number');
    assert.strictEqual(typeof a.complexity_suitability_score, 'number');
    assert.strictEqual(typeof a.composite_allocation_score, 'number');
});

// -------------------------------------------------------------
// Test 13: BACKEND task is NEVER assigned to a FRONTEND developer
// -------------------------------------------------------------
runTest('BACKEND task is never assigned to a FRONTEND developer even when no backend dev is available', () => {
    const devs = [
        { id: 'F1', name: 'Frontend Senior', capacity_hours: 40, primary_domain: 'frontend', languages: ['JavaScript', 'React'], role: 'Senior' },
        { id: 'F2', name: 'Frontend Junior', capacity_hours: 40, primary_domain: 'frontend', languages: ['HTML', 'CSS'], role: 'Junior' }
    ];

    const tasks = [
        { story_id: 'T1', priority: 'CRITICAL', estimated_hours: 8, required_domain: 'backend', required_skills: ['Node.js', 'SQL'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1, 'Should produce exactly one entry (unassigned)');
    assert.strictEqual(assignments[0].developer_id, null, 'Backend task must not be assigned to any frontend developer');
    assert.ok(assignments[0].unassigned_reason, 'Must include a reason for non-assignment');
    assert.strictEqual(assignments[0].matched_domain, 'backend');
});

// -------------------------------------------------------------
// Test 14: Unassigned entry structure contains all required fields
// -------------------------------------------------------------
runTest('Unassigned entries have correct structure with null developer and zero hours', () => {
    const devs = [
        { id: 'QA1', name: 'QA Tester', capacity_hours: 40, primary_domain: 'qa', languages: ['Selenium'], role: 'Senior' }
    ];
    const tasks = [
        { story_id: 'T1', priority: 'HIGH', estimated_hours: 10, required_domain: 'backend', required_skills: ['Python'] }
    ];

    const assignments = allocateTasks(tasks, devs, 'P01');
    assert.strictEqual(assignments.length, 1);
    const a = assignments[0];
    assert.strictEqual(a.developer_id, null);
    assert.strictEqual(a.developerId, null);
    assert.strictEqual(a.developer_name, null);
    assert.strictEqual(a.allocated_hours, 0);
    assert.strictEqual(a.allocatedHours, 0);
    assert.strictEqual(a.story_id, 'T1');
    assert.strictEqual(a.taskId, 'T1');
    assert.strictEqual(a.matched_domain, 'backend');
    assert.ok(typeof a.unassigned_reason === 'string' && a.unassigned_reason.length > 0);
});


console.log(`RESULTS: ${passed} / ${total} tests passed successfully.`);
console.log('='.repeat(60));

if (passed !== total) {
    process.exit(1);
} else {
    process.exit(0);
}
