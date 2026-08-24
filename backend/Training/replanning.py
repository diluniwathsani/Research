import pandas as pd
import os
import pickle
import numpy as np
import json
from datetime import datetime

print("=" * 60)
print("DYNAMIC RE-PLANNING MODULE")
print("(Triggered by Member 4 - Change Management)")
print("=" * 60)

base = os.path.join("C:", os.sep, "Users", "lap.lk",
                    "Desktop", "Research 4.1")

# ============================================
print("\n[STEP 1] LOADING EXISTING SPRINT PLAN...")
# ============================================

# Load latest sprint plan
updated_path = os.path.join(base, "sprint_plan_updated.csv")
original_path = os.path.join(base, "sprint_plan_output.csv")

if os.path.exists(updated_path):
    df_plan = pd.read_csv(updated_path)
    print("Loaded: sprint_plan_updated.csv")
else:
    df_plan = pd.read_csv(original_path)
    print("Loaded: sprint_plan_output.csv")

print(f"Current plan: {len(df_plan)} stories across "
      f"{df_plan['sprint_number'].nunique()} sprints")

# ============================================
print("\n[STEP 2] READING CHANGE ALERT FROM MEMBER 4...")
# ============================================

change_alert_path = os.path.join(base, "change_alert.json")

# Check if Member 4 has sent a change alert
if os.path.exists(change_alert_path):
    # Read the change alert from Member 4
    with open(change_alert_path, "r") as f:
        change_alert = json.load(f)
    print("Change alert received from Member 4! ✅")
else:
    # No alert found — create a sample one for testing
    print("No change_alert.json found.")
    print("Creating a sample change alert for demonstration...")

    change_alert = {
        "change_type": "NEW_STORY_ADDED",
        "story_id": "US011",
        "title": "Critical bug causing data loss in production database",
        "description": "Users reporting data loss when saving urgent fix",
        "story_points": 13,
        "urgency": "CRITICAL",
        "reason": "Production issue discovered after sprint planning",
        "affected_sprint": 1,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    # Save it so Member 4 knows the format to use
    with open(change_alert_path, "w") as f:
        json.dump(change_alert, f, indent=2)
    print(f"Sample change_alert.json created at: {change_alert_path}")
    print("Share this format with Member 4!")

# Display the change alert
print(f"""
Change Alert Details:
  Type        : {change_alert['change_type']}
  Story ID    : {change_alert['story_id']}
  Title       : {change_alert['title']}
  Points      : {change_alert['story_points']}
  Urgency     : {change_alert['urgency']}
  Reason      : {change_alert['reason']}
  Timestamp   : {change_alert.get('timestamp', 'N/A')}
""")

# ============================================
print("[STEP 3] PROCESSING CHANGE BASED ON TYPE...")
# ============================================

# Load priority model
with open(os.path.join(base, "priority_model.pkl"), "rb") as f:
    priority_model = pickle.load(f)
with open(os.path.join(base, "priority_tfidf.pkl"), "rb") as f:
    tfidf = pickle.load(f)

change_type = change_alert["change_type"]
print(f"Processing change type: {change_type}")

if change_type == "NEW_STORY_ADDED":
    print("\n→ A new story is being added to the backlog")

    # Predict priority of new story
    full_text = (change_alert["title"] + " " +
                 change_alert["description"])
    text_features = tfidf.transform([full_text])
    priority_pred = priority_model.predict(text_features)[0]
    priority_proba = priority_model.predict_proba(text_features)[0]
    priority_text = "HIGH" if priority_pred == 1 else "LOW"
    confidence = max(priority_proba) * 100

    print(f"  Predicted priority : {priority_text} ({confidence:.1f}%)")

    # Add new story to plan
    new_row = {
        "sprint_number": None,
        "story_id": change_alert["story_id"],
        "title": change_alert["title"],
        "priority": priority_text,
        "priority_confidence": round(confidence, 1),
        "story_points": change_alert["story_points"],
    }
    df_plan = pd.concat(
        [df_plan, pd.DataFrame([new_row])],
        ignore_index=True
    )
    print(f"  Story {change_alert['story_id']} added to backlog")

elif change_type == "STORY_REMOVED":
    print(f"\n→ Story {change_alert['story_id']} is being removed")
    before = len(df_plan)
    df_plan = df_plan[
        df_plan["story_id"] != change_alert["story_id"]
    ].reset_index(drop=True)
    after = len(df_plan)
    print(f"  Removed {before - after} story from plan")

elif change_type == "STORY_MODIFIED":
    print(f"\n→ Story {change_alert['story_id']} is being modified")
    mask = df_plan["story_id"] == change_alert["story_id"]

    if "story_points" in change_alert:
        old_pts = df_plan.loc[mask, "story_points"].values[0]
        df_plan.loc[mask, "story_points"] = change_alert["story_points"]
        print(f"  Story points updated: {old_pts} → "
              f"{change_alert['story_points']}")

    if "title" in change_alert:
        df_plan.loc[mask, "title"] = change_alert["title"]
        print(f"  Title updated")

elif change_type == "PRIORITY_CHANGED":
    print(f"\n→ Priority of {change_alert['story_id']} is being changed")
    mask = df_plan["story_id"] == change_alert["story_id"]
    old_priority = df_plan.loc[mask, "priority"].values[0]
    new_priority = change_alert.get("new_priority", "HIGH")
    df_plan.loc[mask, "priority"] = new_priority
    print(f"  Priority changed: {old_priority} → {new_priority}")

else:
    print(f"Unknown change type: {change_type}")
    print("No changes made to sprint plan")

# ============================================
print("\n[STEP 4] RE-ALLOCATING SPRINTS...")
# ============================================

SPRINT_CAPACITY = 30

# Re-sort stories by priority and story points
df_plan["priority_num"] = df_plan["priority"].map({
    "HIGH": 1, "LOW": 0
})
df_sorted = df_plan.sort_values(
    by=["priority_num", "story_points"],
    ascending=[False, True]
).reset_index(drop=True)

# Re-allocate into sprints
new_sprints = {}
current_sprint = 1
current_load = 0

for _, story in df_sorted.iterrows():
    points = story["story_points"]
    if current_load + points <= SPRINT_CAPACITY:
        if current_sprint not in new_sprints:
            new_sprints[current_sprint] = []
        new_sprints[current_sprint].append(story.to_dict())
        current_load += points
    else:
        current_sprint += 1
        current_load = points
        if current_sprint not in new_sprints:
            new_sprints[current_sprint] = []
        new_sprints[current_sprint].append(story.to_dict())

print(f"Re-allocation complete: {len(new_sprints)} sprints")

# ============================================
print("\n[STEP 5] UPDATED SPRINT PLAN...")
# ============================================

print("\n" + "=" * 60)
print("UPDATED SPRINT PLAN")
print("=" * 60)

updated_rows = []
for sprint_num, stories in new_sprints.items():
    sprint_points = sum(s["story_points"] for s in stories)
    high_count = sum(1 for s in stories if s["priority"] == "HIGH")
    low_count  = sum(1 for s in stories if s["priority"] == "LOW")

    print(f"\n📅 SPRINT {sprint_num}  "
          f"({sprint_points}/{SPRINT_CAPACITY} points) "
          f"| 🔴 {high_count} HIGH  🟢 {low_count} LOW")
    print("-" * 60)

    for story in stories:
        icon = "🔴" if story["priority"] == "HIGH" else "🟢"
        is_new = (" ⭐ NEW" if story["story_id"] ==
                  change_alert["story_id"] else "")
        print(f"  {story['story_id']} | {icon} {story['priority']:<5} | "
              f"{story['story_points']:>2} pts | "
              f"{str(story['title'])[:38]}{is_new}")

        updated_rows.append({
            "sprint_number": sprint_num,
            "story_id": story["story_id"],
            "title": story["title"],
            "priority": story["priority"],
            "story_points": story["story_points"],
        })

# ============================================
print("\n[STEP 6] BEFORE vs AFTER COMPARISON...")
# ============================================

original = pd.read_csv(original_path)
print(f"\n{'Metric':<30} {'Before':>10} {'After':>10}")
print("-" * 52)
print(f"{'Total Stories':<30} "
      f"{len(original):>10} {len(updated_rows):>10}")
print(f"{'Total Story Points':<30} "
      f"{original['story_points'].sum():>10} "
      f"{sum(r['story_points'] for r in updated_rows):>10}")
print(f"{'Number of Sprints':<30} "
      f"{original['sprint_number'].nunique():>10} "
      f"{len(new_sprints):>10}")
print(f"{'Change Applied':<30} "
      f"{'No':>10} {'Yes':>10}")

# ============================================
print("\n[STEP 7] SAVING EVERYTHING...")
# ============================================

# Save updated sprint plan
df_updated = pd.DataFrame(updated_rows)
df_updated.to_csv(
    os.path.join(base, "sprint_plan_updated.csv"),
    index=False
)
print("sprint_plan_updated.csv saved ✅")

# Save updated output for Member 3
df_updated["estimated_hours"] = df_updated["story_points"] * 8
df_updated["sprint_length_days"] = 14
df_updated["team_size"] = 5
df_updated.to_csv(
    os.path.join(base, "output_for_member3.csv"),
    index=False
)
print("output_for_member3.csv updated ✅")

# Save re-planning log
log = {
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "change_received": change_alert,
    "sprints_before": original["sprint_number"].nunique(),
    "sprints_after": len(new_sprints),
    "stories_before": len(original),
    "stories_after": len(updated_rows),
}
with open(os.path.join(base, "replanning_log.json"), "w") as f:
    json.dump(log, f, indent=2)
print("replanning_log.json saved ✅")

# Delete the processed change alert
os.remove(change_alert_path)
print("change_alert.json deleted (processed) ✅")

print("\n" + "=" * 60)
print("RE-PLANNING COMPLETE!")
print("=" * 60)