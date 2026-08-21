// backend/ml_model/modelLoader.js
const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

class ModelLoader {
    constructor() {
        this.isLoaded = false;
    }

    async loadModel() {
        try {
            console.log('🔄 Loading ML model...');

            const modelPath    = path.join(__dirname, 'impact_model.pkl');
            const scalerPath   = path.join(__dirname, 'impact_scaler.pkl');
            const featuresPath = path.join(__dirname, 'feature_columns.pkl');
            const metadataPath = path.join(__dirname, 'final_metadata.json');

            if (!fs.existsSync(modelPath)) {
                throw new Error(`Model file not found at ${modelPath}`);
            }
            if (!fs.existsSync(scalerPath)) {
                throw new Error(`Scaler file not found at ${scalerPath}`);
            }
            if (!fs.existsSync(featuresPath) && !fs.existsSync(metadataPath)) {
                throw new Error(`Neither feature_columns.pkl nor final_metadata.json found at ${__dirname}`);
            }

            this.isLoaded = true;
            console.log('✅ ML Model files verified');
            return true;
        } catch (error) {
            console.error('❌ Failed to load model:', error.message);
            this.isLoaded = false;
            return false;
        }
    }

    async predict(changeRequest) {
        if (!this.isLoaded) {
            await this.loadModel();
        }

        // Use spawn() instead of exec() — avoids shell injection and handles
        // JSON with special characters safely.
        return new Promise((resolve) => {
            const pythonScript = path.join(__dirname, 'predict.py');
            const inputJson    = JSON.stringify(changeRequest);

            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

            const py = spawn(pythonCmd, [pythonScript, inputJson]);
            if (py.stdin) {
                py.stdin.end();
            }

            let stdout = '';
            let stderr = '';

            py.stdout.on('data', (data) => { stdout += data.toString(); });
            py.stderr.on('data', (data) => { stderr += data.toString(); });

            py.on('close', (code) => {
                if (stderr) {
                    console.error('Python stderr:', stderr);
                }

                try {
                    const result = JSON.parse(stdout.trim());

                    // If predict.py itself caught an error and returned it, log it
                    if (result.error) {
                        console.error('Prediction script error:', result.error);
                    }

                    resolve(result);
                } catch (parseError) {
                    console.error('Failed to parse prediction output:', stdout);
                    resolve(this.getDefaultPrediction(changeRequest));
                }
            });

            py.on('error', (err) => {
                console.error('Failed to start Python process:', err.message);
                resolve(this.getDefaultPrediction(changeRequest));
            });
        });
    }

    // Rule-based fallback used only when Python completely fails to run
    getDefaultPrediction(changeRequest) {
        const urgency     = (changeRequest.urgency || 'MEDIUM').toUpperCase();
        const storyPoints = changeRequest.story_points || 5;
        const priority    = changeRequest.priority || 'Medium';

        if (urgency === 'CRITICAL' || priority === 'Critical' || storyPoints > 13) {
            return {
                impact_level:  'HIGH',
                confidence:    65.0,
                probabilities: { LOW: 0.1, MEDIUM: 0.25, HIGH: 0.65 }
            };
        } else if (urgency === 'HIGH' || priority === 'High' || storyPoints > 8) {
            return {
                impact_level:  'MEDIUM',
                confidence:    60.0,
                probabilities: { LOW: 0.2, MEDIUM: 0.60, HIGH: 0.20 }
            };
        } else {
            return {
                impact_level:  'LOW',
                confidence:    70.0,
                probabilities: { LOW: 0.70, MEDIUM: 0.20, HIGH: 0.10 }
            };
        }
    }
}

module.exports = new ModelLoader();