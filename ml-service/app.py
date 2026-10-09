from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

import os

app = Flask(__name__)
CORS(app)

# Load model and encoders at startup using absolute script directory path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = joblib.load(os.path.join(BASE_DIR, 'simplified_model.pkl'))
le_priority = joblib.load(os.path.join(BASE_DIR, 'priority_encoder_simple.pkl'))
le_complex = joblib.load(os.path.join(BASE_DIR, 'complexity_encoder_simple.pkl'))

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()   # expects a list of tasks
    tasks = data.get('tasks', [])
    
    results = []
    for task in tasks:
        # Extract features
        priority = task['priority']          # e.g. "HIGH" or "LOW"
        est_hours = task['estimated_hours']
        story_points = task['story_points']
        
        # Map priority to training format
        priority_map = {'HIGH': 'High', 'LOW': 'Low'}
        priority_std = priority_map.get(priority, 'Medium')
        
        # Encode priority
        priority_enc = le_priority.transform([priority_std])[0]
        
        # Prepare feature array
        X = [[priority_enc, est_hours, story_points]]
        pred_enc = model.predict(X)[0]
        complexity = le_complex.inverse_transform([pred_enc])[0]
        
        results.append({
            'story_id': task['story_id'],
            'predicted_complexity': complexity
        })
    
    return jsonify({'predictions': results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)