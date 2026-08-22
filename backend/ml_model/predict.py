# backend/ml_model/predict.py
import sys
import json
import joblib
import numpy as np
import pandas as pd
import os

def predict_impact(input_data):
    """Predict impact using trained model with all 19 required features"""

    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))

        model  = joblib.load(os.path.join(script_dir, 'impact_model.pkl'))
        scaler = joblib.load(os.path.join(script_dir, 'impact_scaler.pkl'))

        features_path = os.path.join(script_dir, 'feature_columns.pkl')
        metadata_path = os.path.join(script_dir, 'final_metadata.json')
        if os.path.exists(features_path):
            feature_columns = joblib.load(features_path)
        elif os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                feature_columns = json.load(f)['feature_columns']
        else:
            raise FileNotFoundError("Neither feature_columns.pkl nor final_metadata.json was found.")

        # ── Raw numeric inputs ──────────────────────────────────────────────
        estimated_hours  = float(input_data.get('estimated_hours') if input_data.get('estimated_hours') is not None else 48)
        budget_usd       = float(input_data.get('budget_usd') if input_data.get('budget_usd') is not None else 100000)
        team_size        = float(input_data.get('team_size') if input_data.get('team_size') is not None else 8)
        progress_percent = float(input_data.get('progress_percent') if input_data.get('progress_percent') is not None else 25)
        affected_sprint  = float(input_data.get('affected_sprint') if input_data.get('affected_sprint') is not None else 2)

        priority_raw    = str(input_data.get('priority') or 'Medium')
        risk_raw        = str(input_data.get('risk_level') or 'Medium')
        complexity_raw  = str(input_data.get('complexity_level') or 'Medium')
        urgency_raw     = str(input_data.get('urgency') or 'MEDIUM')

        # ── Ordinal mappings ────────────────────────────────────────────────
        priority_map   = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}
        risk_map       = {'Low': 1, 'Medium': 2, 'High': 3}
        complexity_map = {'Low': 1, 'Medium': 2, 'High': 3}
        urgency_map    = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}

        priority_score   = priority_map.get(priority_raw, 2)
        risk_score       = risk_map.get(risk_raw, 2)
        complexity_score = complexity_map.get(complexity_raw, 2)
        urgency_score    = urgency_map.get(urgency_raw.upper(), 2)

        # ── Feature 1: story_points ─────────────────────────────────────────
        story_points = min(round(estimated_hours / 6), 21)

        # ── Feature 2: priority_score (already computed above) ──────────────

        # ── Feature 3: risk_score (already computed above) ──────────────────

        # ── Feature 4: complexity_score (already computed above) ────────────

        # ── Feature 5: change_severity ──────────────────────────────────────
        change_severity = priority_score * risk_score * complexity_score

        # ── Normalised values ────────────────────────────────────────────────
        team_size_norm  = team_size / 20.0
        hours_norm      = estimated_hours / 200.0           # cap at 200 h
        budget_norm     = budget_usd / 500000.0             # cap at 500 k
        story_points_norm = story_points / 21.0

        # ── Feature 6: team_size_impact ──────────────────────────────────────
        team_size_impact = team_size_norm

        # ── Feature 7: budget_impact ─────────────────────────────────────────
        budget_impact = budget_norm

        # ── Feature 8: hours_per_member_norm ─────────────────────────────────
        hours_per_member = estimated_hours / max(team_size, 1)
        hours_per_member_norm = hours_per_member / 50.0     # cap at 50 h/person

        # ── Feature 9: progress_stage ─────────────────────────────────────────
        progress_stage = min(int(progress_percent / 25), 3)

        # ── Feature 10: progress_risk ─────────────────────────────────────────
        progress_risk = progress_stage * risk_score

        # ── Feature 11: sprint_number ─────────────────────────────────────────
        sprint_number = float(affected_sprint)

        # ── Feature 12: sprint_risk ───────────────────────────────────────────
        sprint_risk = sprint_number * risk_score

        # ── Feature 13: priority_risk ─────────────────────────────────────────
        priority_risk = priority_score * risk_score

        # ── Feature 14: priority_complexity ──────────────────────────────────
        priority_complexity = priority_score * complexity_score

        # ── Feature 15: risk_complexity ───────────────────────────────────────
        risk_complexity = risk_score * complexity_score

        # ── Feature 16: team_budget ───────────────────────────────────────────
        team_budget = team_size_norm * budget_norm

        # ── Feature 17: progress_priority ────────────────────────────────────
        progress_priority = progress_stage * priority_score

        # ── Feature 18: story_points_norm ────────────────────────────────────
        # (already computed above)

        # ── Feature 19: urgency_story ─────────────────────────────────────────
        urgency_story = urgency_score * story_points

        # ── Assemble feature dict in exact column order ───────────────────────
        features = {
            'story_points':         story_points,
            'priority_score':       priority_score,
            'risk_score':           risk_score,
            'complexity_score':     complexity_score,
            'change_severity':      change_severity,
            'team_size_impact':     team_size_impact,
            'budget_impact':        budget_impact,
            'hours_per_member_norm':hours_per_member_norm,
            'progress_stage':       progress_stage,
            'progress_risk':        progress_risk,
            'sprint_number':        sprint_number,
            'sprint_risk':          sprint_risk,
            'priority_risk':        priority_risk,
            'priority_complexity':  priority_complexity,
            'risk_complexity':      risk_complexity,
            'team_budget':          team_budget,
            'progress_priority':    progress_priority,
            'story_points_norm':    story_points_norm,
            'urgency_story':        urgency_story,
        }

        # Build DataFrame with columns in the exact order the model was trained on
        X = pd.DataFrame([features])[feature_columns]

        # Scale and predict
        X_scaled = scaler.transform(X)
        pred     = model.predict(X_scaled)[0]
        proba    = model.predict_proba(X_scaled)[0]

        label_map = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}

        return {
            'impact_level':  label_map[int(pred)],
            'confidence':    float(round(max(proba) * 100, 1)),
            'probabilities': {
                'LOW':    float(round(proba[0], 4)),
                'MEDIUM': float(round(proba[1], 4)),
                'HIGH':   float(round(proba[2], 4)),
            }
        }

    except Exception as e:
        return {
            'impact_level': 'MEDIUM',
            'confidence':   50.0,
            'error':        str(e)
        }


if __name__ == '__main__':
    if len(sys.argv) > 1:
        input_data = json.loads(sys.argv[1])
        result = predict_impact(input_data)
        print(json.dumps(result))
    else:
        print(json.dumps({'error': 'No input provided'}))