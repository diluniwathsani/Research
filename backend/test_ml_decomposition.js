const decompositionEngine = require('./services/decompositionEngine');

async function runTests() {
    console.log('=== TEST 1: Decomposing User Story with Live ML Service ===');
    const sampleStory = {
        story_id: 'US-TEST-01',
        title: 'Generate monthly engineering analytics and export PDF report',
        description: 'As an engineer I want to generate analytics and export PDF reports.',
        acceptance_criteria: 'Given engineering data when report is generated then export as PDF',
        priority: 'HIGH',
        story_points: 5
    };

    const res1 = await decompositionEngine.decomposeUserStory(sampleStory);
    console.log(`Success: ${res1.success}`);
    console.log(`Work items generated: ${res1.work_items.length}`);
    res1.work_items.forEach((item, idx) => {
        console.log(`  [${idx + 1}] ID: ${item.work_item_id}`);
        console.log(`      Title: ${item.title}`);
        console.log(`      Domain: ${item.domain} -> ${item.required_domain}`);
        console.log(`      Hours: ${item.estimated_hours}, Points: ${item.story_points}, Priority: ${item.priority}`);
        console.log(`      Predicted Complexity: ${item.predicted_complexity}`);
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(item.predicted_complexity)) {
            throw new Error(`Invalid complexity value: ${item.predicted_complexity}`);
        }
    });

    console.log('\n=== TEST 2: Single Work Item ML Prediction ===');
    const predHigh = await decompositionEngine.predictComplexityWithML('HIGH', 40, 13, 'WI-HEAVY-1');
    const predLow = await decompositionEngine.predictComplexityWithML('LOW', 4, 1, 'WI-LIGHT-1');
    console.log(`  Heavy task (HIGH, 40h, 13pts) -> Predicted: ${predHigh}`);
    console.log(`  Light task (LOW, 4h, 1pt) -> Predicted: ${predLow}`);

    console.log('\n=== TEST 3: Fallback Behavior (Simulating ML Service Outage) ===');
    const originalUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = 'http://127.0.0.1:59999/unreachable_predict';

    const resFallback = await decompositionEngine.decomposeUserStory({
        story_id: 'US-TEST-FALLBACK',
        title: 'Display vessel-wise equipment and materials',
        description: 'View equipment on vessels',
        priority: 'MEDIUM',
        story_points: 3
    });

    console.log(`Fallback success: ${resFallback.success}`);
    console.log(`Fallback work items count: ${resFallback.work_items.length}`);
    resFallback.work_items.forEach((item, idx) => {
        console.log(`  [${idx + 1}] ${item.title}: Complexity = ${item.predicted_complexity}`);
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(item.predicted_complexity)) {
            throw new Error(`Fallback returned invalid complexity: ${item.predicted_complexity}`);
        }
    });

    // Restore URL
    if (originalUrl) {
        process.env.ML_SERVICE_URL = originalUrl;
    } else {
        delete process.env.ML_SERVICE_URL;
    }

    console.log('\n=== TEST 4: Missing Values and Edge Cases ===');
    const resEdge = await decompositionEngine.decomposeUserStory({
        id: null,
        title: null,
        user_story: 'Vague task without priority or points',
        priority: undefined,
        story_points: null
    });
    console.log(`Edge case success: ${resEdge.success}`);
    resEdge.work_items.forEach(item => {
        console.log(`  Work Item: ${item.work_item_id}, Complexity: ${item.predicted_complexity}, Priority: ${item.priority}`);
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(item.predicted_complexity)) {
            throw new Error(`Edge case produced invalid complexity: ${item.predicted_complexity}`);
        }
    });

    console.log('\n✅ ALL ML INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
