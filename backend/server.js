// Research/backend/server.js
// ==========================================================
// UNIFIED RESEARCH & CHANGE MANAGEMENT BACKEND SERVER
// Supports:
// 1. Requirements Ingestion & Clustering Pipeline (Port 3000)
// 2. ReqChange AI Change Request Management & Impact Analysis
// ==========================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Database connectors
const db = require('./database'); // Neon PostgreSQL pool for requirements pipeline
const { initializeDatabase, getDatabase } = require('./models/database'); // Change Management DB
const modelLoader = require('./ml_model/modelLoader'); // Change Management ML Model Loader

// Routes
const changeRequestRoutes = require('./routes/changeRequestRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Attach Change Management DB to requests if available
app.use((req, res, next) => {
    try {
        req.db = getDatabase();
        next();
    } catch (error) {
        next();
    }
});

// Configure Multer for Excel file uploads
const upload = multer({ dest: 'uploads/' });

// ==========================================================
// 1. CHANGE MANAGEMENT MODULE ROUTES
// ==========================================================
app.use('/api/change-requests', changeRequestRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Unified Research & Change Management Server is active',
        timestamp: new Date().toISOString()
    });
});

// ==========================================================
// 2. REQUIREMENTS PIPELINE ROUTES
// ==========================================================

// --- ENDPOINT: Upload Excel ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const { batch_name } = req.body;
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const uploadTime = new Date().toISOString();
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            for (const row of data) {
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

// Rename a Batch
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

// Process Requirements (Validation & Generation via Python)
app.post('/api/process', async (req, res) => {
    try {
        const result = await db.query("SELECT id, requirement_sentence FROM requirements");
        const rows = result.rows;

        if (rows.length === 0) return res.status(400).json({ error: 'No requirements found' });

        const sentences = rows.map(r => r.requirement_sentence);
        const scriptPath = path.join(__dirname, 'ai_service.py');

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
                const results = JSON.parse(stdout);
                const idLookup = {};
                rows.forEach(r => { idLookup[r.requirement_sentence] = r.id; });
                
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

// ==========================================================
// 3. SERVER INITIALIZATION
// ==========================================================
async function startServer() {
    try {
        console.log('🚀 Initializing Unified Research & Change Management Server...');

        // Initialize Change Management DB Schema
        try {
            await initializeDatabase();
            console.log('✅ Change Management Database initialized');
        } catch (dbErr) {
            console.warn('⚠️ Change Management Database warning:', dbErr.message);
        }

        // Initialize ML Impact Model
        try {
            await modelLoader.loadModel();
            console.log('✅ ReqChange AI ML Model loaded successfully');
        } catch (modelError) {
            console.warn('⚠️ ReqChange AI ML Model warning:', modelError.message);
        }

        app.listen(PORT, () => {
            console.log(`\n======================================================`);
            console.log(`🚀 Unified Backend Server active on http://localhost:${PORT}`);
            console.log(`======================================================`);
            console.log(`📋 Change Management Endpoints:`);
            console.log(`   GET  http://localhost:${PORT}/api/change-requests/projects`);
            console.log(`   GET  http://localhost:${PORT}/api/change-requests/all`);
            console.log(`   POST http://localhost:${PORT}/api/change-requests/submit`);
            console.log(`   GET  http://localhost:${PORT}/api/change-requests/stats`);
            console.log(`📋 Requirements Pipeline Endpoints:`);
            console.log(`   GET  http://localhost:${PORT}/api/requirements`);
            console.log(`   POST http://localhost:${PORT}/api/upload`);
            console.log(`   POST http://localhost:${PORT}/api/process`);
            console.log(`   GET  http://localhost:${PORT}/api/export`);
            console.log(`======================================================\n`);
        });

    } catch (error) {
        console.error('❌ Server startup error:', error);
    }
}

startServer();
