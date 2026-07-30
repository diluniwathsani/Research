const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'requirements.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("ALTER TABLE requirements ADD COLUMN created_at TEXT", (err) => {
        if (err) {
            console.error("Migration Error:", err.message);
        } else {
            console.log("Migration Success: Column 'created_at' added.");
        }
        db.close();
    });
});
