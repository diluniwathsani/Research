import os
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'ml_model') if os.path.exists(os.path.join(BASE_DIR, 'ml_model')) else os.path.join(BASE_DIR, 'ml_models')
PRIORITY_MODEL_PATH = os.path.join(MODEL_DIR, 'priority_model.pkl')
TFIDF_PATH = os.path.join(MODEL_DIR, 'priority_tfidf.pkl')
EFFORT_MODEL_PATH = os.path.join(MODEL_DIR, 'effort_model.pkl')

app = Flask(__name__)
CORS(app) 

priority_model = None
priority_tfidf = None
effort_model = None

try:
    if os.path.exists(PRIORITY_MODEL_PATH) and os.path.exists(TFIDF_PATH):
        priority_model = pickle.load(open(PRIORITY_MODEL_PATH, 'rb'))
        priority_tfidf = pickle.load(open(TFIDF_PATH, 'rb'))
        print(f"[OK] Priority AI models loaded successfully from {MODEL_DIR}!")
    if os.path.exists(EFFORT_MODEL_PATH):
        effort_model = pickle.load(open(EFFORT_MODEL_PATH, 'rb'))
        print(f"[OK] Effort AI model loaded successfully!")
except Exception as e:
    print(f"[WARN] Error/warning loading models: {e}")

# In-memory storage for sprint tasks
sprint_tasks = [
    {"sprint_number": 1, "story_id": "US001", "title": "Fix critical security vulnerability in login system", "priority": "HIGH", "story_points": 8, "estimated_hours": 64},
    {"sprint_number": 1, "story_id": "US004", "title": "Payment gateway crashes on checkout", "priority": "HIGH", "story_points": 13, "estimated_hours": 104},
    {"sprint_number": 1, "story_id": "US008", "title": "Database connection timeout under heavy load", "priority": "HIGH", "story_points": 8, "estimated_hours": 64},
    {"sprint_number": 2, "story_id": "US002", "title": "Add export to PDF feature for reports", "priority": "LOW", "story_points": 5, "estimated_hours": 40},
    {"sprint_number": 2, "story_id": "US005", "title": "Add search filter to user management", "priority": "LOW", "story_points": 5, "estimated_hours": 40},
    {"sprint_number": 2, "story_id": "US010", "title": "Add two factor authentication for admin users", "priority": "HIGH", "story_points": 8, "estimated_hours": 64},
]

@app.route('/api/replan-full', methods=['POST'])
def add_story_and_predict():
    try:
        data = request.json or {}
        title = data.get('title', '')
        description = data.get('description', '')
        story_id = data.get('story_id', f"US00{len(sprint_tasks)+1}")
        points = int(data.get('story_points', 3))
        
        full_text = title + " " + description
        
        if priority_model and priority_tfidf:
            try:
                text_features = priority_tfidf.transform([full_text])
                priority_pred = priority_model.predict(text_features)[0]
                priority_text = "HIGH" if priority_pred == 1 else "LOW"
            except Exception as model_err:
                print("Model prediction fallback:", model_err)
                priority_text = "HIGH" if (points >= 8 or any(kw in full_text.lower() for kw in ['security', 'crash', 'critical', 'auth', 'payment', 'timeout'])) else "LOW"
        else:
            priority_text = "HIGH" if (points >= 8 or any(kw in full_text.lower() for kw in ['security', 'crash', 'critical', 'auth', 'payment', 'timeout'])) else "LOW"
        
        estimated_hours = points * 8
        
        new_task = {
            "sprint_number": 1,
            "story_id": story_id,
            "title": title,
            "priority": priority_text,
            "story_points": points,
            "estimated_hours": estimated_hours
        }
        
        sprint_tasks.insert(0, new_task)
        
        return jsonify({
            "status": "success", 
            "tasks": [new_task]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/sprint-plan', methods=['GET'])
def get_sprint_plan():
    return jsonify({"status": "success", "tasks": sprint_tasks})

@app.route('/api/stories', methods=['GET'])
def get_stories():
    return jsonify({
        "status": "success",
        "stories": sprint_tasks
    })

if __name__ == '__main__':
    app.run(port=8080, debug=True)