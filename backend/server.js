require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const db = require('./database'); // PostgreSQL pool

const app = express();
// Enable Cross-Origin Resource Sharing for the React frontend
app.use(cors());
// Parse incoming JSON payloads
app.use(express.json());

// Configure Multer for Excel file uploads
const upload = multer({ dest: 'uploads/' });

// --- ENDPOINT: Upload Excel ---
// Receives an Excel file, parses it, and saves requirements to Neon PostgreSQL database.
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const { batch_name } = req.body;
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Use a single timestamp for all requirements in this upload session
        const uploadTime = new Date().toISOString();

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            for (const row of data) {
                // Support multiple column names for the requirement text
                const text = row['Requirement Description'] 
                          || row['Requirement'] 
                          || row['requirement_sentence'] 
                          || row['Description']
                          || (Object.keys(row).length > 1 ? row[Object.keys(row)[1]] : row[Object.keys(row)[0]]);
                if (text) {
                    await client.query(
                        "INSERT INTO requirements (requirement_sentence, created_at, batch_name) VALUES ($1, $2, $3)",
                        [text, uploadTime, batch_name || 'Untitled Batch']
                    );
                }
            }

            await client.query('COMMIT');
            res.json({ message: 'File uploaded and parsed successfully' });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Upload DB error:', dbErr);
            res.status(500).json({ error: 'Failed to insert requirements into database' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('File process error:', err);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Get Requirements
app.get('/api/requirements', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM requirements ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update a requirement manually
app.put('/api/requirements/:id', async (req, res) => {
    const { requirement_sentence } = req.body;
    try {
        await db.query(
            "UPDATE requirements SET requirement_sentence = $1, completeness_status = 'Completed by User' WHERE id = $2",
            [requirement_sentence, req.params.id]
        );
        res.json({ message: 'Requirement updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- ENDPOINT: Rename a Batch ---
// Updates the batch_name for all requirements that share a specific created_at timestamp.
app.put('/api/batches/:timestamp', async (req, res) => {
    const { batch_name } = req.body;
    const { timestamp } = req.params;
    
    try {
        const result = await db.query(
            "UPDATE requirements SET batch_name = $1 WHERE created_at = $2",
            [batch_name, timestamp]
        );
        res.json({ message: 'Batch renamed successfully', count: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- ENDPOINT: Process Requirements (Validation & Generation) ---
// Triggers the Python AI service to perform NLP analysis and artifact generation.
app.post('/api/process', async (req, res) => {
    try {
        const result = await db.query("SELECT id, requirement_sentence FROM requirements");
        const rows = result.rows;

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
        
        pythonProcess.on('close', async (code) => {
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
                
                await updateDatabase(fallbackResults, res);
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
                await updateDatabase(finalResults, res);
            } catch (parseErr) {
                console.error("Parse error:", parseErr, stdout);
                res.status(500).json({ error: 'Failed to parse AI service output' });
            }
        });
        
        // Send requirements data to Python via stdin
        pythonProcess.stdin.write(JSON.stringify(sentences));
        pythonProcess.stdin.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

async function updateDatabase(results, res) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        for (const r of results) {
            await client.query(
                `UPDATE requirements 
                 SET completeness_status = $1, 
                     epic = $2, feature = $3, user_story = $4, acceptance_criteria = $5
                 WHERE id = $6`,
                [
                    r.status, 
                    r.epic || '', 
                    r.feature || '', 
                    r.user_story || '', 
                    r.acceptance_criteria || '', 
                    r.id
                ]
            );
        }
        await client.query('COMMIT');
        res.json({ message: "Processing complete", count: results.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("DB Update Error:", err);
        res.status(500).json({ error: "DB Update Failed" });
    } finally {
        client.release();
    }
}

// Export specific batch to Excel
app.get('/api/export/batch', async (req, res) => {
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'Timestamp is required' });

    try {
        const result = await db.query("SELECT * FROM requirements WHERE created_at = $1", [timestamp]);
        const rows = result.rows;
        if (rows.length === 0) return res.status(404).json({ error: 'No requirements found for this batch' });
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Batch Artifacts");
        
        const fileName = `requirement_set_${timestamp.replace(/[:.]/g, '-')}.xlsx`;
        const filePath = path.join(__dirname, fileName);
        xlsx.writeFile(workbook, filePath);
        
        res.download(filePath, (downloadErr) => {
            if (!downloadErr) {
                const fs = require('fs');
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Export all to Excel
app.get('/api/export', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM requirements ORDER BY id ASC");
        const rows = result.rows;
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "All Artifacts");
        
        const filePath = path.join(__dirname, 'all_requirements.xlsx');
        xlsx.writeFile(workbook, filePath);
        
        res.download(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT} with Neon PostgreSQL`);
});
