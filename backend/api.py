import os
import pickle
import json
import urllib.request
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

def fetch_dynamic_sprint_tasks(project_id='P00001'):
    """Dynamically fetch real sprint allocation tasks from primary Express/PostgreSQL backend."""
    try:
        url = f"http://localhost:3000/api/sprint-plan?project_id={project_id}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Flask-API'})
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data and data.get("status") == "success" and data.get("tasks"):
                    return data.get("tasks")
    except Exception as err:
        print("Notice fetching dynamic sprint plan from Express backend:", err)
    return []

@app.route('/api/replan-full', methods=['POST'])
def add_story_and_predict():
    try:
        data = request.json or {}
        title = data.get('title', '')
        description = data.get('description', '')
        project_id = data.get('project_id', 'P00001')
        points = int(data.get('story_points', 3))
        
        full_text = title + " " + description
        
        if priority_model and priority_tfidf:
            try:
                text_features = priority_tfidf.transform([full_text])
                priority_pred = priority_model.predict(text_features)[0]
                priority_text = "HIGH" if priority_pred == 1 else "LOW"
            except Exception as model_err:
                print("Model prediction notice:", model_err)
                priority_text = "HIGH" if (points >= 8 or any(kw in full_text.lower() for kw in ['security', 'crash', 'critical', 'auth', 'payment', 'timeout'])) else "LOW"
        else:
            priority_text = "HIGH" if (points >= 8 or any(kw in full_text.lower() for kw in ['security', 'crash', 'critical', 'auth', 'payment', 'timeout'])) else "LOW"
        
        estimated_hours = points * 6
        generated_id = data.get('story_id', f"US-{int(os.urandom(2).hex(), 16)}")
        
        new_task = {
            "sprint_number": 1,
            "story_id": generated_id,
            "title": title,
            "priority": priority_text,
            "story_points": points,
            "estimated_hours": estimated_hours
        }
        
        # Forward story to Express server to persist dynamically in PostgreSQL DB
        try:
            req_data = json.dumps({
                "story_id": generated_id,
                "project_id": project_id,
                "title": title,
                "description": description,
                "story_points": points,
                "priority": priority_text
            }).encode('utf-8')
            req = urllib.request.Request("http://localhost:3000/api/user-stories", data=req_data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=3)
        except Exception as fwd_err:
            print("Notice forwarding story to Express backend:", fwd_err)

        return jsonify({
            "status": "success", 
            "tasks": [new_task]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/sprint-plan', methods=['GET'])
def get_sprint_plan():
    pid = request.args.get('project_id', 'P00001')
    tasks = fetch_dynamic_sprint_tasks(pid)
    return jsonify({"status": "success", "tasks": tasks})

@app.route('/api/stories', methods=['GET'])
def get_stories():
    pid = request.args.get('project_id', 'P00001')
    tasks = fetch_dynamic_sprint_tasks(pid)
    return jsonify({
        "status": "success",
        "stories": tasks
    })

if __name__ == '__main__':
    app.run(port=8080, debug=True)