const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { execFile } = require('child_process');
const path = require('path');
const db = require('./database');

const app = express();
// Enable Cross-Origin Resource Sharing for the React frontend
app.use(cors());
// Parse incoming JSON payloads
app.use(express.json());

// Configure Multer for Excel file uploads
const upload = multer({ dest: 'uploads/' });

// --- ENDPOINT: Upload Excel ---
// Receives an Excel file, parses it, and saves requirements to the SQLite database.
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const { batch_name } = req.body;
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Use a single timestamp for all requirements in this upload session
        const uploadTime = new Date().toISOString();

        // Prepare database insertion statement
        const stmt = db.prepare("INSERT INTO requirements (requirement_sentence, created_at, batch_name) VALUES (?, ?, ?)");
        data.forEach(row => {
            // Support multiple column names for the requirement text
            const text = row['Requirement Description'] 
                      || row['Requirement'] 
                      || row['requirement_sentence'] 
                      || row['Description']
                      || (Object.keys(row).length > 1 ? row[Object.keys(row)[1]] : row[Object.keys(row)[0]]);
            if (text) {
                stmt.run(text, uploadTime, batch_name || 'Untitled Batch');
            }
        });
        stmt.finalize(() => {
            res.json({ message: 'File uploaded and parsed successfully' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Get Requirements
app.get('/api/requirements', (req, res) => {
    db.all("SELECT * FROM requirements ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update a requirement manually
app.put('/api/requirements/:id', (req, res) => {
    const { requirement_sentence } = req.body;
    db.run(
        "UPDATE requirements SET requirement_sentence = ?, completeness_status = 'Completed by User' WHERE id = ?",
        [requirement_sentence, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Requirement updated successfully' });
        }
    );
});

// --- NEW ENDPOINT: Rename a Batch ---
// Updates the batch_name for all requirements that share a specific created_at timestamp.
app.put('/api/batches/:timestamp', (req, res) => {
    const { batch_name } = req.body;
    const { timestamp } = req.params;
    
    db.run(
        "UPDATE requirements SET batch_name = ? WHERE created_at = ?",
        [batch_name, timestamp],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Batch renamed successfully', count: this.changes });
        }
    );
});

// --- ENDPOINT: Process Requirements (Validation & Generation) ---
// Triggers the Python AI service to perform NLP analysis and artifact generation.
app.post('/api/process', (req, res) => {
    db.all("SELECT id, requirement_sentence FROM requirements", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(400).json({ error: 'No requirements found' });

        const sentences = rows.map(r => r.requirement_sentence);
        const scriptPath = path.join(__dirname, 'ai_service.py');

        // Spawn a child process to run the Python script
        const { spawn } = require('child_process');
        const pythonProcess = spawn('python', [scriptPath, 'process']);
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python script error:", stderr);
                // Fallback to simple logic if Python is not available or fails
                const fallbackResults = rows.map(r => ({
                    id: r.id,
                    status: r.requirement_sentence.length > 20 ? 'Complete' : 'Incomplete: Too short',
                    epic: 'Pending Generation',
                    feature: 'Pending',
                    user_story: 'Pending',
                    acceptance_criteria: 'Pending'
                }));
                
                updateDatabase(fallbackResults, res);
                return;
            }

            try {
                // Parse the JSON output from the Python script
                const results = JSON.parse(stdout);
                const idLookup = {};
                rows.forEach(r => { idLookup[r.requirement_sentence] = r.id; });
                
                // Map results back to original DB IDs
                const finalResults = results.map(resultItem => ({
                    ...resultItem,
                    id: idLookup[resultItem.requirement]
                }));
                updateDatabase(finalResults, res);
            } catch (parseErr) {
                console.error("Parse error:", parseErr, stdout);
                res.status(500).json({ error: 'Failed to parse AI service output' });
            }
        });
        
        // Send requirements data to Python via stdin
        pythonProcess.stdin.write(JSON.stringify(sentences));
        pythonProcess.stdin.end();
    });
});

function updateDatabase(results, res) {
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(`
            UPDATE requirements 
            SET completeness_status = ?, 
                epic = ?, feature = ?, user_story = ?, acceptance_criteria = ?
            WHERE id = ?
        `);
        results.forEach(r => {
            stmt.run(
                r.status, 
                r.epic || '', 
                r.feature || '', 
                r.user_story || '', 
                r.acceptance_criteria || '', 
                r.id
            );
        });
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: "DB Update Failed" });
            res.json({ message: "Processing complete", count: results.length });
        });
    });
}

// Export specific batch to Excel
app.get('/api/export/batch', (req, res) => {
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'Timestamp is required' });

    db.all("SELECT * FROM requirements WHERE created_at = ?", [timestamp], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ error: 'No requirements found for this batch' });
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Batch Artifacts");
        
        const fileName = `requirement_set_${timestamp.replace(/[:.]/g, '-')}.xlsx`;
        const filePath = path.join(__dirname, fileName);
        xlsx.writeFile(workbook, filePath);
        
        res.download(filePath, (downloadErr) => {
            if (!downloadErr) {
                // Optional: delete file after download to keep server clean
                const fs = require('fs');
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
    });
});

// Export all to Excel
app.get('/api/export', (req, res) => {
    db.all("SELECT * FROM requirements", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "All Artifacts");
        
        const filePath = path.join(__dirname, 'all_requirements.xlsx');
        xlsx.writeFile(workbook, filePath);
        
        res.download(filePath);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
