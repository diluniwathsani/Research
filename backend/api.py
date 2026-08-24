from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os

app = Flask(__name__)
CORS(app) 

# File paths pointing to your folder structure
PRIORITY_MODEL_PATH = os.path.join('Training', 'sprint-models', 'priority_model.pkl')
TFIDF_PATH = os.path.join('Training', 'sprint-models', 'priority_tfidf.pkl')
EFFORT_MODEL_PATH = os.path.join('Training', 'sprint-models', 'effort_model.pkl')

try:
    priority_model = pickle.load(open(PRIORITY_MODEL_PATH, 'rb'))
    priority_tfidf = pickle.load(open(TFIDF_PATH, 'rb'))
    effort_model = pickle.load(open(EFFORT_MODEL_PATH, 'rb'))
    print("✅ All AI models loaded successfully!")
except FileNotFoundError as e:
    print(f"❌ Error loading models: {e}")

@app.route('/api/replan-full', methods=['POST'])
def add_story_and_predict():
    try:
        data = request.json
        title = data.get('title', '')
        description = data.get('description', '')
        
        full_text = title + " " + description
        text_features = priority_tfidf.transform([full_text])
        
        priority_pred = priority_model.predict(text_features)[0]
        priority_text = "HIGH" if priority_pred == 1 else "LOW"
        
        estimated_hours = int(data.get('story_points', 3)) * 8
        
        return jsonify({
            "status": "success", 
            "tasks": [{"title": title, "priority": priority_text, "estimated_hours": estimated_hours}]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/sprint-plan', methods=['GET'])
def get_sprint_plan():
    return jsonify({"status": "success", "tasks": []})

if __name__ == '__main__':
    app.run(port=8080, debug=True)