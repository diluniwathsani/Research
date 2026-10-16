const fs = require('fs');

const content = fs.readFileSync('./backend/server.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('/api/') || line.includes('upload') || line.includes('requirements')) {
        if (line.includes('app.') || line.includes('router.')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
