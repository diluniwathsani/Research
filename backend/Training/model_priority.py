import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

print("=" * 60)
print("PRIORITY PREDICTION MODEL")
print("=" * 60)

# ============================================
print("\n[STEP 1] LOADING CLEANED DATASET...")
# ============================================

base = os.path.join("C:", os.sep, "Users", "lap.lk", "Desktop", "Research 4.1")
df = pd.read_csv(os.path.join(base, "clean_priority.csv"))

print(f"Dataset shape: {df.shape}")
print(f"Priority distribution:")
print(df["priority_label"].value_counts())

# ============================================
print("\n[STEP 2] PREPARING FEATURES AND TARGET...")
# ============================================

# X = the input (full text of the issue)
X = df["full_text"]

# y = the target (1=HIGH priority, 0=LOW priority)
y = df["priority_label"]

print(f"Total samples: {len(X)}")
print(f"HIGH priority issues: {(y==1).sum()}")
print(f"LOW priority issues:  {(y==0).sum()}")

# ============================================
print("\n[STEP 3] SPLITTING INTO TRAIN AND TEST SETS...")
# ============================================

# 80% for training, 20% for testing
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y  # ensures both HIGH and LOW are balanced in train/test
)

print(f"Training samples: {len(X_train)}")
print(f"Testing samples:  {len(X_test)}")

# ============================================
print("\n[STEP 4] CONVERTING TEXT TO NUMBERS (TF-IDF)...")
# ============================================

# TF-IDF converts text into numbers the ML model can understand
# max_features=5000 means we use the 5000 most important words
tfidf = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))

X_train_tfidf = tfidf.fit_transform(X_train)
X_test_tfidf = tfidf.transform(X_test)

print(f"TF-IDF matrix shape (train): {X_train_tfidf.shape}")
print(f"TF-IDF matrix shape (test):  {X_test_tfidf.shape}")

# ============================================
print("\n[STEP 5] TRAINING RANDOM FOREST MODEL...")
# ============================================

# n_estimators=100 means we build 100 decision trees
# This takes about 1-2 minutes to run
rf_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    n_jobs=-1  # uses all CPU cores to train faster
)

print("Training... (this may take 1-2 minutes)")
rf_model.fit(X_train_tfidf, y_train)
print("Training complete! ✅")

# ============================================
print("\n[STEP 6] EVALUATING THE MODEL...")
# ============================================

# Make predictions on the test set
y_pred = rf_model.predict(X_test_tfidf)

# Calculate accuracy
accuracy = accuracy_score(y_test, y_pred)
print(f"\nModel Accuracy: {accuracy * 100:.2f}%")

# Detailed report
print("\nDetailed Classification Report:")
print(classification_report(y_test, y_pred,
      target_names=["LOW Priority", "HIGH Priority"]))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(f"                 Predicted LOW  Predicted HIGH")
print(f"Actual LOW       {cm[0][0]:<15} {cm[0][1]}")
print(f"Actual HIGH      {cm[1][0]:<15} {cm[1][1]}")

# ============================================
print("\n[STEP 7] TESTING WITH A SAMPLE USER STORY...")
# ============================================

# Test with a fake user story to see if the model works
sample_stories = [
    "fix critical security vulnerability login authentication bypass",
    "update button color on settings page minor ui change",
    "payment gateway crash blocking all transactions urgent fix needed",
    "add tooltip to help icon low priority enhancement",
]

print("\nSample predictions:")
print("-" * 55)
for story in sample_stories:
    story_tfidf = tfidf.transform([story])
    prediction = rf_model.predict(story_tfidf)[0]
    probability = rf_model.predict_proba(story_tfidf)[0]
    label = "HIGH PRIORITY 🔴" if prediction == 1 else "LOW PRIORITY 🟢"
    confidence = max(probability) * 100
    print(f"Story: {story[:50]}...")
    print(f"  → Prediction: {label} (Confidence: {confidence:.1f}%)")
    print()

# ============================================
print("\n[STEP 8] SAVING THE MODEL...")
# ============================================

import pickle

model_path = os.path.join(base, "priority_model.pkl")
tfidf_path = os.path.join(base, "priority_tfidf.pkl")

with open(model_path, "wb") as f:
    pickle.dump(rf_model, f)

with open(tfidf_path, "wb") as f:
    pickle.dump(tfidf, f)

print(f"Model saved as: priority_model.pkl ✅")
print(f"TF-IDF saved as: priority_tfidf.pkl ✅")

print("\n" + "=" * 60)
print("PRIORITY PREDICTION MODEL COMPLETE!")
print("=" * 60)


from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

print("\n" + "=" * 60)
print("COMPARING MULTIPLE MODELS")
print("=" * 60)

models = {
    "Random Forest":      rf_model,
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Naive Bayes":        MultinomialNB(),
    "Linear SVM":         LinearSVC(random_state=42, max_iter=2000),
}

results = []

for name, model in models.items():
    # Train if not already trained
    if name != "Random Forest":
        model.fit(X_train_tfidf, y_train)

    # Predict
    pred = model.predict(X_test_tfidf)
    acc = accuracy_score(y_test, pred) * 100

    from sklearn.metrics import f1_score
    f1 = f1_score(y_test, pred, average="weighted")

    results.append({"Model": name, "Accuracy": f"{acc:.2f}%", "F1 Score": f"{f1:.3f}"})
    print(f"{name:<25} Accuracy: {acc:.2f}%   F1: {f1:.3f}")

print("\nBest model will be used for your final system!")