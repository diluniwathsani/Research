/**
 * Hybrid User Story Decomposition Engine
 * Decomposes Agile User Stories into Atomic Technical Work Items
 * (Frontend, Backend, and QA components with required skills and estimations)
 */

function extractDomainAndSkills(titleOrText) {
    const text = (titleOrText || '').toLowerCase();

    if (/\b(machine learning|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch|classifier|ai service|ml model|training dataset)\b/i.test(text)) {
        return { domain: 'AI', required_skills: ['Python', 'ML', 'Scikit-Learn'] };
    }
    if (/\b(enter|input|form|ui|ux|frontend|react|dashboard|dark mode|css|tailwind|export|pdf|excel|component|layout|view|display|screen|button|render)\b/i.test(text)) {
        return { domain: 'Frontend', required_skills: ['JavaScript', 'React', 'Tailwind'] };
    }
    if (/\b(test|qa|cypress|selenium|unit test|jest|audit check|verification|verify|validation|validate)\b/i.test(text)) {
        return { domain: 'QA', required_skills: ['QA Automation', 'Cypress'] };
    }
    if (/\b(devops|docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|nginx|dockerfile)\b/i.test(text)) {
        return { domain: 'DevOps', required_skills: ['Docker', 'DevOps', 'AWS'] };
    }
    return { domain: 'Backend', required_skills: ['JavaScript', 'Node.js', 'PostgreSQL'] };
}

async function decomposeUserStory(story) {
    const sid = story.story_id || story.id || story.user_story_id || 'US-001';
    const cleanSid = String(sid).replace(/[^a-zA-Z0-9]/g, '');
    const title = story.title || story.user_story || story.requirement_sentence || `Story ${sid}`;
    const projectId = story.project_id || 'P00001';
    const detected = extractDomainAndSkills(title);

    const workItems = [
        {
            work_item_id: `WI-${cleanSid}-FE`,
            story_id: String(sid),
            parent_story_title: title,
            project_id: projectId,
            title: `[Frontend] UI Component & Input Flow for ${title.substring(0, 60)}`,
            description: `Implement responsive user interface, validation forms, and state management for story: ${title}`,
            domain: 'Frontend',
            required_skills: ['JavaScript', 'React', 'Tailwind'],
            estimated_hours: 8,
            story_points: 2,
            status: 'generated'
        },
        {
            work_item_id: `WI-${cleanSid}-BE`,
            story_id: String(sid),
            parent_story_title: title,
            project_id: projectId,
            title: `[Backend] Service Logic & Data Persistence for ${title.substring(0, 60)}`,
            description: `Develop backend business logic, database transaction handling, and RESTful APIs for story: ${title}`,
            domain: detected.domain === 'AI' ? 'AI' : 'Backend',
            required_skills: detected.required_skills,
            estimated_hours: 12,
            story_points: 3,
            status: 'generated'
        },
        {
            work_item_id: `WI-${cleanSid}-QA`,
            story_id: String(sid),
            parent_story_title: title,
            project_id: projectId,
            title: `[QA] Acceptance Criteria Verification & End-to-End Tests for ${title.substring(0, 60)}`,
            description: `Author automated Cypress tests and perform integration testing against acceptance criteria for story: ${title}`,
            domain: 'QA',
            required_skills: ['QA Automation', 'Cypress'],
            estimated_hours: 6,
            story_points: 1,
            status: 'generated'
        }
    ];

    return {
        story_id: sid,
        parent_story_title: title,
        work_items: workItems
    };
}

module.exports = {
    decomposeUserStory,
    extractDomainAndSkills
};
