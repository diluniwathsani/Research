import os
import sys
import json
import re
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=" * 65)
print("PHASE 2: TEXT-TO-STORY POINT MODEL TRAINING PIPELINE")
print("Automated Effort Estimation directly from Agile User Story Text")
print("=" * 65)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "sprint-models")
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "story_point_model.pkl")
TFIDF_SAVE_PATH = os.path.join(MODELS_DIR, "story_point_tfidf.pkl")
META_SAVE_PATH = os.path.join(MODELS_DIR, "story_point_meta.json")

# =====================================================================
# STEP 1: CONSTRUCT COMPREHENSIVE TRAINING CORPUS OF AGILE USER STORIES
# =====================================================================
print("\n[STEP 1] Generating diverse dataset of Agile user stories with Fibonacci ground truth...")

raw_data = [
    # --- 1 STORY POINT (Trivial / Cosmetic / Config / Minor Copy) ---
    ("Fix typo in login screen placeholder", "Change 'usernam' to 'username' on login input field.", 1),
    ("Update copyright year to 2026 in footer", "Update hardcoded 2025 to 2026 in layout footer component.", 1),
    ("Change primary button color to brand navy", "Update hex color code in tailwind config for primary button.", 1),
    ("Add tooltip to info icon on settings page", "Display simple hover tooltip explaining notification preferences.", 1),
    ("Fix broken link in documentation sidebar", "Point the user guide link to the new documentation URL.", 1),
    ("Center align user profile avatar image", "Adjust CSS padding and alignment for profile picture display.", 1),
    ("Update terms of service version link", "Change hyperlink in registration modal to v2.1 terms.", 1),
    ("Increase font size of error message", "Change text size from 12px to 14px on form validation errors.", 1),
    ("Hide beta badge from navigation menu", "Remove the beta pill tag from the analytics tab.", 1),
    ("Adjust spacing between table rows in dashboard", "Increase table row padding from 4px to 8px for readability.", 1),
    ("Change favicon on web application", "Replace default vite logo with official corporate favicon.", 1),
    ("Remove unused console log statements in auth module", "Clean up debug console statements from production bundle.", 1),
    ("Update help email in contact modal", "Replace support@old.com with support@company.com.", 1),
    ("Capitalize table column headers", "Ensure all table columns start with uppercase letter.", 1),
    ("Add placeholder text to search bar", "Add 'Search products or orders...' placeholder in navbar.", 1),

    # --- 2 STORY POINTS (Small straightforward adjustments, simple validations) ---
    ("Add password visibility toggle icon", "Allow users to show or hide plain text in password input field.", 2),
    ("Validate email format on client side registration", "Add regex check for valid email before form submission.", 2),
    ("Add clear button to search input", "Add an X icon to reset search query and clear results in one click.", 2),
    ("Sort user table alphabetically by last name", "Add client-side sorting function to the existing users table.", 2),
    ("Show confirmation modal before logout", "Prompt user with 'Are you sure you want to log out?' popup.", 2),
    ("Display character countdown in comment input", "Show remaining characters out of 250 in review input textarea.", 2),
    ("Add loading spinner to save profile button", "Disable button and show animated spinner while save request resolves.", 2),
    ("Persist selected language in localStorage", "Save user language choice in browser storage across page refreshes.", 2),
    ("Add empty state illustration when list is empty", "Show friendly SVG icon and 'No items found' message when array is empty.", 2),
    ("Trim whitespace from text inputs before submit", "Automatically strip leading and trailing whitespace on form submission.", 2),
    ("Add copy to clipboard button for invoice ID", "Add button to copy invoice reference string with toast confirmation.", 2),
    ("Format currency numbers with commas and decimals", "Use Intl.NumberFormat to display $1,250.00 consistently across tables.", 2),
    ("Enable enter key to submit search query", "Listen for onKeyDown Enter event on the search box.", 2),
    ("Display badge showing number of unread alerts", "Add count badge over bell icon when unread notifications exist.", 2),
    ("Add back to top scroll button on long pages", "Floating button appears when scrolling down more than 300px.", 2),

    # --- 3 STORY POINTS (Standard CRUD, straightforward backend API & UI) ---
    ("Create CRUD endpoints for managing product categories", "Implement GET, POST, PUT, DELETE REST endpoints with validation.", 3),
    ("Build user profile edit form with avatar upload", "Allow updating name, bio, and uploading image to S3 bucket.", 3),
    ("Implement basic keyword search across articles", "Backend SQL LIKE query to search article titles and tags.", 3),
    ("Add pagination to order history table", "Support page and pageSize parameters in API and UI pagination bar.", 3),
    ("Send welcome email upon successful user registration", "Integrate SendGrid mailer service to trigger welcome template on sign up.", 3),
    ("Implement dark mode toggle across entire application", "Create ThemeContext in React and toggle dark class on html root.", 3),
    ("Export order list to CSV format", "Generate downloadable CSV file from current filtered table rows.", 3),
    ("Create feedback submission form with ratings", "Build 5-star rating component and save feedback to database table.", 3),
    ("Add date range filter to transactions table", "Datepicker UI allowing start and end date query to backend.", 3),
    ("Implement basic role check for admin navigation tab", "Only render admin menu item if user.role equals 'admin'.", 3),
    ("Build customer support ticket creation modal", "Form with subject, category, urgency, and description sent to backend.", 3),
    ("Add remember me checkbox to login session", "Set 30-day expiration on JWT cookie if remember me is checked.", 3),
    ("Create bookmark favorites feature for users", "Allow users to save items to personal favorites list with toggle button.", 3),
    ("Implement soft delete for customer records", "Set is_deleted boolean flag in database instead of permanent deletion.", 3),
    ("Add activity log audit trail for user profile changes", "Record timestamp, changed field, and previous value in audit table.", 3),

    # --- 5 STORY POINTS (Multi-step features, complex queries, 3rd party APIs) ---
    ("Implement multi-step checkout workflow with shipping and billing", "3-step checkout wizard with address validation, shipping rates, and order summary.", 5),
    ("Integrate Google Maps API for store locator with geolocation", "Show nearby branch stores on interactive map based on user GPS or zip code.", 5),
    ("Build advanced data table with multi-column sorting, filtering, and export", "Dynamic SQL query builder supporting multiple filter conditions and Excel export.", 5),
    ("Implement role-based access control (RBAC) across all API routes", "Middleware enforcing permissions: SuperAdmin, Manager, Editor, Viewer with granular checks.", 5),
    ("Add full-text search with fuzzy matching using Elasticsearch", "Index catalog documents, support typos, auto-complete suggestions, and facets.", 5),
    ("Integrate Twilio SMS for two-factor authentication (2FA)", "Generate 6-digit OTP, send via SMS, verify with 5-minute expiry and rate limiting.", 5),
    ("Build user dashboard with interactive charts and metrics", "Aggregate monthly revenue, active users, and churn rate using Recharts.", 5),
    ("Implement file upload with virus scanning and background thumbnail generation", "Upload documents to cloud storage, run ClamAV scan, and generate image thumbnails.", 5),
    ("Create automated daily email digest for team managers", "Cron job aggregating pending tasks, approvals, and team activity into HTML report.", 5),
    ("Implement password reset flow with secure one-time tokens", "Cryptographically secure token generation, expiration tracking, and email verification.", 5),
    ("Build notification center with real-time in-app alerts", "Server-sent events (SSE) broadcasting notifications to active user sessions.", 5),
    ("Integrate Slack webhook for deployment and error monitoring", "Post formatted alerts to Slack channel on critical API 500 exceptions.", 5),
    ("Create bulk import for customer records via CSV", "Parse large CSV, validate schema, handle duplicates, and batch insert records.", 5),
    ("Implement subscription tier upgrade and downgrade logic", "Handle pro-rated billing calculation and adjust feature limits dynamically.", 5),
    ("Build customizable user notification preferences matrix", "Matrix of email, SMS, push notifications per event type with instant save.", 5),

    # --- 8 STORY POINTS (Architectural complexity, payment integrations, security protocols) ---
    ("Integrate Stripe payment gateway with webhooks and recurring subscriptions", "Full Stripe payment flow handling 3D Secure, customer cards, failed payments, webhooks, and invoice generation.", 8),
    ("Implement OAuth2 Single Sign-On (SSO) with Google, GitHub, and Microsoft", "Full OAuth authorization code flow with PKCE, token refresh, and user account linking.", 8),
    ("Build real-time collaborative document editing with WebSockets", "WebSocket server with operational transformation or CRDTs for multi-user live document syncing.", 8),
    ("Implement end-to-end audit logging system for HIPAA/GDPR compliance", "Immutable cryptographic audit trail for all PII data access, exports, and modifications.", 8),
    ("Create asynchronous background job processing queue with Redis and Bull", "Worker queue architecture handling video processing, retries, exponential backoff, and dead-letter queues.", 8),
    ("Migrate monolithic relational database to multi-tenant sharded schema", "Database schema migration separating tenant data with zero-downtime replication strategy.", 8),
    ("Implement automated automated fraud detection scoring for transactions", "Rule-based and heuristic engine analyzing IP velocity, geolocation, order amount, and risk score.", 8),
    ("Build comprehensive analytics pipeline with ETL and data warehouse ingestion", "Extract event streams, transform payloads, and load into Snowflake/BigQuery for BI reporting.", 8),
    ("Implement dynamic form builder with custom validation rules and conditional logic", "Admins can create custom schemas, nested fields, dependent visibility, and export responses.", 8),
    ("Integrate external ERP system (SAP / NetSuite) two-way synchronization", "Bidirectional sync for inventory, customers, and purchase orders with conflict resolution.", 8),
    ("Build automated CI/CD deployment pipeline with multi-environment promotion and canary tests", "Docker containerization, Kubernetes manifests, automated integration tests, and blue-green deploy.", 8),
    ("Implement rate limiting and DDoS mitigation across public API gateway", "Token bucket algorithm with Redis backing, IP throttling, and automated captchas for suspicious traffic.", 8),
    ("Create automated invoice generation and tax calculation engine with Avalara", "Calculate regional VAT/sales tax based on zip code, generate PDF invoices, and file tax ledger.", 8),
    ("Build customer onboarding tour with dynamic checklist and progress tracking", "Interactive guided tour with step completion, tooltips, analytics telemetry, and skip logic.", 8),
    ("Implement end-to-end data encryption at rest and in transit for sensitive records", "AES-256 field-level encryption for credit card tokens and PII with AWS KMS key management.", 8),

    # --- 13 STORY POINTS (Subsystem architectural refactoring, distributed systems) ---
    ("Architect and build distributed event-driven microservices architecture with Apache Kafka", "Decompose monolithic ordering system into autonomous microservices communicating via event streams with saga pattern.", 13),
    ("Implement zero-downtime database migration from MongoDB to PostgreSQL with dual-write replication", "Dual-write strategy, data backfill verification scripts, schema normalization, and live traffic cutover.", 13),
    ("Build real-time video streaming and WebRTC conferencing module with screen sharing", "Media soup SFU server, peer-to-peer WebRTC connections, audio mixing, recording, and adaptive bitrate streaming.", 13),
    ("Implement multi-region active-active database replication with conflict-free data types (CRDT)", "Cross-region latency mitigation, eventual consistency conflict resolution, and automatic failover clustering.", 13),
    ("Create enterprise AI workflow orchestrator with tool-calling agents and sandboxed code execution", "Multi-agent coordination system with state persistence, Dockerized sandboxed code runner, and memory checkpoints.", 13),
    ("Build complete compliant healthcare telehealth platform with video, EHR integration, and billing", "HIPAA-certified video rooms, HL7 FHIR EHR connector, automated appointment reminders, and insurance claim processing.", 13),
    ("Architect high-frequency algorithmic trade matching engine with sub-millisecond execution", "In-memory order book matching limit and market orders with atomic lock-free data structures and FIX protocol.", 13),
    ("Build custom distributed caching and query federation layer over heterogeneous databases", "In-memory query planner unifying PostgreSQL, Cassandra, and ElasticSearch queries with cache invalidation.", 13)
]

# Create DataFrame
df_stories = pd.DataFrame(raw_data, columns=["title", "description", "story_points"])
df_stories["full_text"] = df_stories["title"] + " " + df_stories["description"]
print(f"Total training user stories: {len(df_stories)}")
print("Story Points distribution:")
print(df_stories["story_points"].value_counts().sort_index())

# =====================================================================
# STEP 2: LINGUISTIC & DOMAIN FEATURE ENGINEERING
# =====================================================================
print("\n[STEP 2] Extracting Linguistic, Semantic & Technical Complexity Features...")

TECH_KEYWORDS = {
    "arch": ["architect", "distributed", "microservices", "kafka", "crdt", "webrtc", "sharded", "saga"],
    "sec": ["oauth", "sso", "encryption", "cve", "vulnerability", "auth", "token", "jwt", "2fa", "hipaa", "gdpr"],
    "db": ["migration", "schema", "postgres", "sql", "crud", "database", "redis", "elasticsearch", "dual-write"],
    "api": ["api", "webhook", "endpoints", "stripe", "sendgrid", "rest", "integration", "twilio"],
    "ui": ["color", "typo", "button", "padding", "css", "icon", "tooltip", "font", "alignment", "avatar"]
}

def extract_features(text):
    t = text.lower()
    words = t.split()
    word_count = len(words)
    char_count = len(text)
    
    # Counts
    arch_score = sum(1 for w in TECH_KEYWORDS["arch"] if w in t)
    sec_score = sum(1 for w in TECH_KEYWORDS["sec"] if w in t)
    db_score = sum(1 for w in TECH_KEYWORDS["db"] if w in t)
    api_score = sum(1 for w in TECH_KEYWORDS["api"] if w in t)
    ui_score = sum(1 for w in TECH_KEYWORDS["ui"] if w in t)
    
    # Conditional logic count (scope breadth)
    conditions = sum(1 for c in ["if", "when", "unless", "supporting", "handling", "validation", "multiple"] if c in t)
    
    return [word_count, char_count, arch_score, sec_score, db_score, api_score, ui_score, conditions]

feature_names = ["word_count", "char_count", "arch_score", "sec_score", "db_score", "api_score", "ui_score", "conditions"]
dense_feats = np.array([extract_features(t) for t in df_stories["full_text"]])

# TF-IDF Vectorization
tfidf = TfidfVectorizer(max_features=400, ngram_range=(1, 2), stop_words="english")
X_tfidf = tfidf.fit_transform(df_stories["full_text"]).toarray()

# Combine TF-IDF with dense engineered features
X = np.hstack([X_tfidf, dense_feats])
y = df_stories["story_points"].values

print(f"Feature matrix shape: {X.shape} (TF-IDF: {X_tfidf.shape[1]} + Engineered: {dense_feats.shape[1]})")

# =====================================================================
# STEP 3: TRAIN & COMPARE ML MODELS
# =====================================================================
print("\n[STEP 3] Training & Benchmarking Regressors (Random Forest vs Gradient Boosting vs Ridge)...")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.22, random_state=42)

models = {
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=120, max_depth=4, learning_rate=0.08, random_state=42),
    "Random Forest": RandomForestRegressor(n_estimators=150, max_depth=6, random_state=42, n_jobs=-1),
    "Ridge Regression": Ridge(alpha=1.0)
}

FIBONACCI = np.array([1, 2, 3, 5, 8, 13, 21])

def snap_to_fibonacci(preds):
    return np.array([FIBONACCI[np.argmin(np.abs(FIBONACCI - p))] for p in preds])

best_model_name = None
best_mae = float("inf")
best_model = None
benchmark_results = []

for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred_cont = model.predict(X_test)
    y_pred_fib = snap_to_fibonacci(y_pred_cont)
    
    mae = mean_absolute_error(y_test, y_pred_cont)
    r2 = r2_score(y_test, y_pred_cont)
    
    # Within 1-step Fibonacci accuracy (standard SE benchmark)
    fib_indices = {val: i for i, val in enumerate(FIBONACCI)}
    within_one = sum(abs(fib_indices[act] - fib_indices[pred]) <= 1 for act, pred in zip(y_test, y_pred_fib))
    within_one_acc = (within_one / len(y_test)) * 100.0
    exact_acc = (sum(y_test == y_pred_fib) / len(y_test)) * 100.0
    
    benchmark_results.append({
        "model": name,
        "mae": round(mae, 2),
        "r2": round(r2, 3),
        "exact_acc": round(exact_acc, 1),
        "within_one_step_acc": round(within_one_acc, 1)
    })
    
    print(f"\nModel: {name}")
    print(f"  Mean Absolute Error (MAE): {mae:.2f} story points")
    print(f"  R² Score                  : {r2:.3f}")
    print(f"  Exact Fibonacci Match     : {exact_acc:.1f}%")
    print(f"  Within-1-Step Accuracy    : {within_one_acc:.1f}%")
    
    if mae < best_mae:
        best_mae = mae
        best_model = model
        best_model_name = name

print(f"\n🏆 Best Model Selected: {best_model_name} with MAE: {best_mae:.2f} story points!")

# =====================================================================
# STEP 4: SAVE TRAINED MODELS & METADATA
# =====================================================================
print("\n[STEP 4] Saving Trained Model and Vectorizer to disk...")

with open(MODEL_SAVE_PATH, "wb") as f:
    pickle.dump(best_model, f)

with open(TFIDF_SAVE_PATH, "wb") as f:
    pickle.dump(tfidf, f)

meta = {
    "model_name": best_model_name,
    "mae": round(best_mae, 2),
    "r2": round(r2_score(y_test, best_model.predict(X_test)), 3),
    "benchmarks": benchmark_results,
    "fibonacci_scale": [1, 2, 3, 5, 8, 13, 21],
    "sample_count": len(df_stories)
}

with open(META_SAVE_PATH, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

print(f"Model saved to: {MODEL_SAVE_PATH} [OK]")
print(f"TFIDF saved to: {TFIDF_SAVE_PATH} [OK]")
print(f"Meta saved to : {META_SAVE_PATH} [OK]")

# =====================================================================
# STEP 5: VERIFICATION TEST ON REALISTIC UNSEEN USER STORIES
# =====================================================================
print("\n[STEP 5] Live Verification on Test User Stories:")
print("-" * 65)

test_scenarios = [
    ("Update error text on registration failure", "Fix grammatical mistake on warning alert message."),
    ("Add search autocomplete dropdown to product catalog", "Show top 5 matching product titles as user types."),
    ("Integrate PayPal checkout with IPN instant payment notifications", "Full payment gateway with sandbox testing, webhook listeners, and transaction rollback."),
    ("Re-architect microservices event bus with Kafka cluster and dead-letter queues", "Replace sync HTTP calls with resilient Kafka broker supporting multi-partition scaling."),
]

for title, desc in test_scenarios:
    txt = title + " " + desc
    t_feats = tfidf.transform([txt]).toarray()
    d_feats = np.array([extract_features(txt)])
    vec = np.hstack([t_feats, d_feats])
    raw_pt = best_model.predict(vec)[0]
    fib_pt = FIBONACCI[np.argmin(np.abs(FIBONACCI - raw_pt))]
    hrs = fib_pt * 8
    print(f"Story: {title}")
    print(f"  → Predicted Story Points: {fib_pt} pts ({raw_pt:.2f} raw) | Estimated Hours: {hrs} hrs\n")

print("=" * 65)
print("PHASE 2 MODEL TRAINING COMPLETE! [READY FOR API & UI WIRING]")
print("=" * 65)
