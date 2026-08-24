import pandas as pd
import os
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
import pickle

print("=" * 60)
print("EFFORT ESTIMATION MODEL")
print("=" * 60)

# ============================================
print("\n[STEP 1] LOADING CLEANED SPRINT DATASET...")
# ============================================

base = os.path.join("C:", os.sep, "Users", "lap.lk", "Desktop", "Research 4.1")
df = pd.read_csv(os.path.join(base, "clean_sprints.csv"))

print(f"Dataset shape: {df.shape}")
print(f"\nProject distribution:")
print(df["project"].value_counts())
print(f"\nSprint velocity stats:")
print(df["sprint_velocity"].describe().round(2))

# ============================================
print("\n[STEP 2] PREPARING FEATURES AND TARGET...")
# ============================================

# Features the model uses to predict effort
feature_cols = [
    "SprintLength",
    "NoOfDevelopers",
    "totalNumberOfIssues",
    "completedIssuesCount",
    "completedIssuesInitialEstimateSum",
    "issuesNotCompletedInCurrentSprint",
    "puntedIssues",
    "issuesCompletedInAnotherSprint",
    "completion_rate",
    "scope_creep",
    "estimation_accuracy",
    "points_per_dev_per_day",
]

# Target = sprint velocity (story points completed)
X = df[feature_cols]
y = df["sprint_velocity"]

print(f"\nFeatures used: {len(feature_cols)}")
for f in feature_cols:
    print(f"  - {f}")
print(f"\nTarget variable: sprint_velocity")
print(f"Min: {y.min():.1f}  Max: {y.max():.1f}  Mean: {y.mean():.1f}")

# ============================================
print("\n[STEP 3] SPLITTING INTO TRAIN AND TEST SETS...")
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"Training samples: {len(X_train)}")
print(f"Testing samples:  {len(X_test)}")

# ============================================
print("\n[STEP 4] TRAINING RANDOM FOREST REGRESSOR...")
# ============================================

rf_regressor = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    n_jobs=-1
)

rf_regressor.fit(X_train, y_train)
print("Training complete! ✅")

# ============================================
print("\n[STEP 5] EVALUATING THE MODEL...")
# ============================================

y_pred = rf_regressor.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\nMean Absolute Error (MAE): {mae:.2f} story points")
print(f"R² Score: {r2:.3f}")
print(f"\nWhat this means:")
print(f"  On average, predictions are off by {mae:.1f} story points")
print(f"  The model explains {r2*100:.1f}% of the variance in sprint velocity")

# Cross validation
cv_scores = cross_val_score(rf_regressor, X, y, cv=5, scoring="r2")
print(f"\n5-Fold Cross Validation R² scores: {cv_scores.round(3)}")
print(f"Average CV R²: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

# ============================================
print("\n[STEP 6] COMPARING WITH OTHER MODELS...")
# ============================================

lr_model = LinearRegression()
lr_model.fit(X_train, y_train)
lr_pred = lr_model.predict(X_test)
lr_mae = mean_absolute_error(y_test, lr_pred)
lr_r2 = r2_score(y_test, lr_pred)

print(f"\n{'Model':<25} {'MAE':>10} {'R² Score':>10}")
print("-" * 45)
print(f"{'Random Forest':<25} {mae:>10.2f} {r2:>10.3f}")
print(f"{'Linear Regression':<25} {lr_mae:>10.2f} {lr_r2:>10.3f}")

# ============================================
print("\n[STEP 7] FEATURE IMPORTANCE...")
# ============================================

importances = pd.Series(
    rf_regressor.feature_importances_,
    index=feature_cols
).sort_values(ascending=False)

print("\nMost important features for predicting effort:")
for feat, imp in importances.items():
    bar = "█" * int(imp * 50)
    print(f"  {feat:<40} {imp:.3f} {bar}")

# ============================================
print("\n[STEP 8] TESTING WITH SAMPLE SPRINTS...")
# ============================================

sample_sprints = pd.DataFrame({
    "SprintLength":                    [14, 14, 7],
    "NoOfDevelopers":                  [5,  8,  3],
    "totalNumberOfIssues":             [20, 30, 10],
    "completedIssuesCount":            [15, 25,  8],
    "completedIssuesInitialEstimateSum":[80, 120, 40],
    "issuesNotCompletedInCurrentSprint":[5,   5,  2],
    "puntedIssues":                    [2,   3,  1],
    "issuesCompletedInAnotherSprint":  [1,   2,  0],
    "completion_rate":                 [0.75, 0.83, 0.80],
    "scope_creep":                     [0,   1,   0],
    "estimation_accuracy":             [0.9, 0.85, 0.95],
    "points_per_dev_per_day":          [1.1, 1.2, 1.5],
})

predictions = rf_regressor.predict(sample_sprints)

print("\nSample sprint effort predictions:")
print("-" * 50)
for i, pred in enumerate(predictions):
    devs = sample_sprints["NoOfDevelopers"].iloc[i]
    days = sample_sprints["SprintLength"].iloc[i]
    issues = sample_sprints["totalNumberOfIssues"].iloc[i]
    print(f"Sprint {i+1}: {devs} developers, {days} days, {issues} issues")
    print(f"  → Predicted effort: {pred:.1f} story points")
    print()

# ============================================
print("\n[STEP 9] SAVING THE MODEL...")
# ============================================

with open(os.path.join(base, "effort_model.pkl"), "wb") as f:
    pickle.dump(rf_regressor, f)

print("Model saved as: effort_model.pkl ✅")

print("\n" + "=" * 60)
print("EFFORT ESTIMATION MODEL COMPLETE!")
print("=" * 60)