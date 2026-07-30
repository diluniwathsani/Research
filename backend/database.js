// --- DATABASE CONFIGURATION ---
// This file initializes the SQLite connection and sets up the 'requirements' table.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolve the path to the SQLite database file
const dbPath = path.resolve(__dirname, 'requirements.db');

// Connect to the SQLite database (creates the file if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // --- SCHEMA INITIALIZATION ---
        // Create the requirements table with all necessary columns for NLP outcomes
        db.run(`CREATE TABLE IF NOT EXISTS requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requirement_sentence TEXT NOT NULL,
            completeness_status TEXT DEFAULT 'Pending',
            epic TEXT,
            feature TEXT,
            user_story TEXT,
            acceptance_criteria TEXT,
            batch_name TEXT DEFAULT 'Untitled Batch',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table", err);
            }
        });
    }
});

module.exports = db;
