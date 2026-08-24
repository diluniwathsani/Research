import pandas as pd
import os
import pickle
import numpy as np

print("=" * 60)
print("SPRINT ALLOCATOR")
print("=" * 60)

base = os.path.join("C:", os.sep, "Users", "lap.lk", "Desktop", "Research 4.1")

# ============================================
print("\n[STEP 1] LOADING SAVED MODELS...")
# ============================================

# Load priority model
with open(os.path.join(base, "priority_model.pkl"), "rb") as f:
    priority_model = pickle.load(f)

with open(os.path.join(base, "priority_tfidf.pkl"), "rb") as f:
    tfidf = pickle.load(f)

# Load effort model
with open(os.path.join(base, "effort_model.pkl"), "rb") as f:
    effort_model = pickle.load(f)

print("Priority model loaded ✅")
print("Effort model loaded   ✅")

# ============================================
print("\n[STEP 2] DEFINING SAMPLE USER STORIES...")
# ============================================

# These simulate what Member 1 would send to your component
user_stories = pd.DataFrame({
    "id": ["US001", "US002", "US003", "US004", "US005",
           "US006", "US007", "US008", "US009", "US010"],
    "title": [
        "Fix critical security vulnerability in login system",
        "Add export to PDF feature for reports",
        "Update color scheme on dashboard page",
        "Payment gateway crashes on checkout",
        "Add search filter to user management",
        "Fix broken email notifications",
        "Add dark mode toggle to settings",
        "Database connection timeout under heavy load",
        "Update help documentation links",
        "Add two factor authentication for admin users",
    ],
    "description": [
        "Users can bypass authentication using SQL injection attack",
        "Users need to export their monthly reports as PDF files",
        "Minor visual update to match new brand guidelines",
        "Checkout process fails with 500 error for all users",
        "Allow admins to filter users by role and status",
        "Email notifications not being sent after recent deployment",
        "Users requested dark mode option in profile settings",
        "Server times out when more than 100 users are connected",
        "Several documentation links return 404 errors",
        "Admins need 2FA to improve account security",
    ],
    "story_points": [8, 5, 2, 13, 5, 3, 3, 8, 1, 8],
})

print(f"Total user stories received: {len(user_stories)}")
print(user_stories[["id", "title", "story_points"]].to_string(index=False))

# ============================================
print("\n[STEP 3] PREDICTING PRIORITY FOR EACH STORY...")
# ============================================

# Combine title and description for prediction
user_stories["full_text"] = (
    user_stories["title"] + " " + user_stories["description"]
)

# Transform text using TF-IDF
text_features = tfidf.transform(user_stories["full_text"])

# Predict priority
user_stories["priority_label"] = priority_model.predict(text_features)
user_stories["priority_text"] = user_stories["priority_label"].map({
    1: "HIGH", 0: "LOW"
})

# Get confidence scores
proba = priority_model.predict_proba(text_features)
user_stories["priority_confidence"] = (
    np.max(proba, axis=1) * 100
).round(1)

print("\nPriority predictions:")
print("-" * 70)
for _, row in user_stories.iterrows():
    icon = "🔴" if row["priority_text"] == "HIGH" else "🟢"
    print(f"{row['id']} | {icon} {row['priority_text']:<5} "
          f"({row['priority_confidence']}%) | {row['title'][:45]}")

# ============================================
print("\n[STEP 4] SORTING BY PRIORITY AND STORY POINTS...")
# ============================================

# Sort: HIGH priority first, then by story points (smaller first)
user_stories_sorted = user_stories.sort_values(
    by=["priority_label", "story_points"],
    ascending=[False, True]
).reset_index(drop=True)

print("\nStories sorted by priority:")
print("-" * 70)
for rank, (_, row) in enumerate(user_stories_sorted.iterrows(), 1):
    icon = "🔴" if row["priority_text"] == "HIGH" else "🟢"
    print(f"Rank {rank}: {row['id']} | {icon} {row['priority_text']:<5} | "
          f"{row['story_points']} pts | {row['title'][:40]}")

# ============================================
print("\n[STEP 5] ALLOCATING STORIES INTO SPRINTS...")
# ============================================

# Sprint capacity = how many story points fit in one sprint
# Based on average from your sprint dataset
SPRINT_CAPACITY = 30  # story points per sprint
SPRINT_LENGTH = 14    # days
NUM_DEVELOPERS = 5

print(f"\nSprint settings:")
print(f"  Capacity per sprint : {SPRINT_CAPACITY} story points")
print(f"  Sprint length       : {SPRINT_LENGTH} days")
print(f"  Team size           : {NUM_DEVELOPERS} developers")

# Allocate stories to sprints using greedy bin-packing
sprints = {}
current_sprint = 1
current_load = 0

for _, story in user_stories_sorted.iterrows():
    points = story["story_points"]

    # If story fits in current sprint, add it
    if current_load + points <= SPRINT_CAPACITY:
        if current_sprint not in sprints:
            sprints[current_sprint] = []
        sprints[current_sprint].append(story)
        current_load += points
    else:
        # Move to next sprint
        current_sprint += 1
        current_load = points
        if current_sprint not in sprints:
            sprints[current_sprint] = []
        sprints[current_sprint].append(story)

# ============================================
print("\n[STEP 6] DISPLAYING SPRINT PLAN...")
# ============================================

print("\n" + "=" * 60)
print("GENERATED SPRINT PLAN")
print("=" * 60)

total_sprints = len(sprints)
sprint_results = []

for sprint_num, stories in sprints.items():
    sprint_points = sum(s["story_points"] for s in stories)
    high_count = sum(1 for s in stories if s["priority_text"] == "HIGH")
    low_count = sum(1 for s in stories if s["priority_text"] == "LOW")

    print(f"\n📅 SPRINT {sprint_num}  "
          f"({sprint_points}/{SPRINT_CAPACITY} story points) "
          f"| 🔴 {high_count} HIGH  🟢 {low_count} LOW")
    print("-" * 60)

    for story in stories:
        icon = "🔴" if story["priority_text"] == "HIGH" else "🟢"
        print(f"  {story['id']} | {icon} {story['priority_text']:<5} | "
              f"{story['story_points']:>2} pts | {story['title'][:40]}")

    sprint_results.append({
        "sprint": sprint_num,
        "total_points": sprint_points,
        "num_stories": len(stories),
        "high_priority": high_count,
        "low_priority": low_count,
    })

# ============================================
print("\n[STEP 7] SPRINT PLAN SUMMARY...")
# ============================================

print("\n" + "=" * 60)
print("SPRINT PLAN SUMMARY")
print("=" * 60)
print(f"{'Sprint':<10} {'Stories':<10} {'Points':<10} "
      f"{'HIGH':<8} {'LOW':<8} {'Capacity Used'}")
print("-" * 60)

for s in sprint_results:
    capacity_pct = (s["total_points"] / SPRINT_CAPACITY * 100)
    bar = "█" * int(capacity_pct / 5)
    print(f"Sprint {s['sprint']:<4} {s['num_stories']:<10} "
          f"{s['total_points']:<10} {s['high_priority']:<8} "
          f"{s['low_priority']:<8} {capacity_pct:.0f}% {bar}")

total_points = sum(s["total_points"] for s in sprint_results)
print("-" * 60)
print(f"TOTAL: {len(user_stories)} stories across "
      f"{total_sprints} sprints | {total_points} story points")

# ============================================
print("\n[STEP 8] SAVING SPRINT PLAN...")
# ============================================

# Save full sprint plan to CSV
output_rows = []
for sprint_num, stories in sprints.items():
    for story in stories:
        output_rows.append({
            "sprint_number": sprint_num,
            "story_id": story["id"],
            "title": story["title"],
            "priority": story["priority_text"],
            "priority_confidence": story["priority_confidence"],
            "story_points": story["story_points"],
        })

df_output = pd.DataFrame(output_rows)
output_path = os.path.join(base, "sprint_plan_output.csv")
df_output.to_csv(output_path, index=False)

print(f"\nSprint plan saved as: sprint_plan_output.csv ✅")
print("\nThis output goes to Member 3 (Resource Allocation)!")

print("\n" + "=" * 60)
print("SPRINT ALLOCATOR COMPLETE!")
print("=" * 60)