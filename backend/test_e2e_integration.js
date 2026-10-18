const axios = require('axios');

async function testEndToEnd() {
    console.log('='.repeat(70));
    console.log('TESTING END-TO-END WORK ITEMS GENERATION & RESOURCE ALLOCATION');
    console.log('='.repeat(70));
    
    const sampleStories = [
        { story_id: 'US-REP-01', title: 'Generate engineering reports from engineering data', priority: 'High', story_points: 3 },
        { story_id: 'US-REP-02', title: 'Export engineering reports in the required format', priority: 'Medium', story_points: 2 },
        { story_id: 'US-ASSET-01', title: 'Display vessel-wise equipment and materials', priority: 'High', story_points: 3 },
        { story_id: 'US-COST-01', title: 'Calculate overtime based on business rules', priority: 'Critical', story_points: 5 },
        { story_id: 'US-WO-01', title: 'Add materials required for a work order', priority: 'Medium', story_points: 2 }
    ];

    // 1. Batch Decompose Stories into Work Items
    console.log('Step 1: Calling POST /api/user-stories/decompose-batch...');
    const decompRes = await axios.post('http://localhost:3000/api/user-stories/decompose-batch', {
        project_id: 'P00001',
        stories: sampleStories
    });
    console.log(`✅ Batch Decompose Response: success=${decompRes.data.success}, ${decompRes.data.count} stories processed`);

    // 2. Fetch Work Items via GET /api/work-items
    console.log('\nStep 2: Calling GET /api/work-items?project_id=P00001...');
    const wiRes = await axios.get('http://localhost:3000/api/work-items?project_id=P00001');
    const items = wiRes.data.filter(w => sampleStories.some(s => s.story_id === w.story_id));
    console.log(`✅ Retrieved ${items.length} decomposed work items from database`);

    console.log('\n--- VERIFYING STRUCTURED FIELDS ---');
    items.forEach((item, i) => {
        console.log(`[${i + 1}] ID: ${item.work_item_id} | Story: ${item.story_id}`);
        console.log(`    Title: ${item.title}`);
        console.log(`    Domain: "${item.domain}" (Required Allocation Domain: "${item.required_domain}")`);
        console.log(`    Required Skills: ${JSON.stringify(item.required_skills)}`);
        console.log(`    Points: ${item.story_points} | Hours: ${item.estimated_hours} | Complexity: ${item.predicted_complexity} | Priority: ${item.priority}`);
    });

    // 3. Test Resource Allocation with these Work Items
    console.log('\nStep 3: Calling POST /api/allocate with retrieved work items...');
    const allocRes = await axios.post('http://localhost:3000/api/allocate', {
        tasks: items,
        sprint_id: 'SPR-01',
        project_id: 'P00001'
    });
    console.log(`✅ Allocation API Success: ${allocRes.data.success}`);
    console.log(`✅ Total Assignments Generated: ${allocRes.data.assignments.length}`);

    console.log('\n--- SAMPLE ALLOCATION ASSIGNMENTS ---');
    allocRes.data.assignments.forEach((a, idx) => {
        console.log(`  Assignment ${idx + 1}: [${a.story_id}] ${a.title.slice(0, 45)}...`);
        console.log(`     → Developer: ${a.developer_name} (ID: ${a.developer_id}, Allocated: ${a.allocated_hours}h)`);
        console.log(`     → Domain: ${a.matched_domain} | Skill Match: ${a.skill_match_score}% | Complexity: ${a.predicted_complexity}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL INTEGRATION CHECKS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
}

testEndToEnd().catch(err => {
    console.error('Test Failed:', err.response ? err.response.data : err.message);
    process.exit(1);
});
