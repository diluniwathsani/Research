import sys
import json
import os
import joblib
import pandas as pd
import warnings

# --- CONFIGURATION ---
# Ignore warnings to keep the output clean for the Node.js caller
warnings.filterwarnings('ignore')

# --- SPACY NLP INITIALIZATION ---
# Load the English NLP model for lemmatization and POS tagging
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

# Attempt to load ML models from the current directory (backend) or parent directory (Research)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)

SVM_PATH = os.path.join(CURRENT_DIR, 'model_svm_tuned.pkl')
if not os.path.exists(SVM_PATH):
    SVM_PATH = os.path.join(BASE_DIR, 'model_svm_tuned.pkl')

TFIDF_PATH = os.path.join(CURRENT_DIR, 'tfidf_vectorizer.pkl')
if not os.path.exists(TFIDF_PATH):
    TFIDF_PATH = os.path.join(BASE_DIR, 'tfidf_vectorizer.pkl')

best_model = None
tfidf = None

try:
    if os.path.exists(SVM_PATH) and os.path.exists(TFIDF_PATH):
        best_model = joblib.load(SVM_PATH)
        tfidf = joblib.load(TFIDF_PATH)
except Exception as e:
    sys.stderr.write(f"Model load warning: {str(e)}\n")

def check_completeness(text):
    """
    Validates if a requirement sentence follows standard engineering rules.
    Checks for: Length, Subject, Verb, and Modal Keywords (shall/must).
    """
    if not nlp:
        return "Complete" # Fallback if spacy is missing
    
    doc = nlp(text)
    if len(text.split()) < 5:
        return "Incomplete: Too short"
    
    # NLP Dependency Parsing to find subject and verb
    has_subject = any(token.dep_ in ('nsubj', 'nsubjpass') for token in doc)
    has_verb = any(token.pos_ in ('VERB', 'AUX') for token in doc)
    # Check for mandatory language (RFC 2119)
    has_modal = any(token.lemma_.lower() in ['shall', 'should', 'must', 'will'] for token in doc)
    
    if not has_subject:
        return "Incomplete: Missing a subject (Who/What?)"
    if not has_verb:
        return "Incomplete: Missing an action (Does what?)"
    if not has_modal:
        return "Incomplete: Missing a requirement keyword (shall/must)"
    return "Complete"

# --- NLP FILTERING DICTIONARIES ---
# Words to skip during extraction to avoid generic domain noise
SKIP_VERBS = ['allow', 'ensure', 'provide', 'require', 'make', 'use', 'need',
              'be', 'have', 'do', 'include', 'support', 'enable', 'let', 'give']
SKIP_NOUNS = ['system', 'user', 'ability', 'feature', 'way', 'order', 'need',
              'capability', 'functionality', 'option', 'manner', 'thing', 'level']

# --- Verb synonyms: merge similar actions into one Feature name ---
VERB_GROUPS = {
    'create': ['create', 'add', 'register', 'generate', 'build', 'insert', 'establish'],
    'update': ['update', 'edit', 'modify', 'change', 'revise', 'amend', 'alter'],
    'delete': ['delete', 'remove', 'discard', 'purge', 'clear'],
    'retrieve': ['retrieve', 'fetch', 'get', 'access', 'view', 'display', 'show', 'read', 'look'],
    'search': ['search', 'find', 'query', 'filter', 'locate', 'lookup'],
    'store': ['store', 'save', 'persist', 'keep', 'retain', 'hold', 'preserve', 'maintain'],
    'track': ['track', 'monitor', 'log', 'audit', 'trace', 'observe', 'follow'],
    'manage': ['manage', 'handle', 'administer', 'oversee', 'control', 'govern'],
    'export': ['export', 'download', 'output', 'extract'],
    'import': ['import', 'upload', 'ingest', 'load'],
    'capture': ['capture', 'collect', 'gather', 'record', 'enter', 'input', 'document'],
    'report': ['report', 'summarize', 'analyze', 'aggregate'],
    'notify': ['notify', 'alert', 'warn', 'remind', 'send'],
    'validate': ['validate', 'verify', 'check', 'confirm', 'ensure'],
    'assign': ['assign', 'allocate', 'link', 'associate', 'map', 'attach', 'connect'],
    'merge': ['merge', 'combine', 'consolidate', 'unify', 'integrate'],
    'classify': ['classify', 'categorize', 'tag', 'label', 'sort', 'group'],
}

def normalize_verb(verb):
    """Map a verb to its canonical group name."""
    for canonical, synonyms in VERB_GROUPS.items():
        if verb in synonyms:
            return canonical
    return verb

# Fix common spaCy lemmatization issues
NOUN_NORMALIZE = {
    'datum': 'data', 'criterion': 'criteria', 'medium': 'media',
    'index': 'index', 'appendix': 'appendix', 'info': 'information',
    'doc': 'document', 'lab': 'laboratory', 'med': 'medication',
    'admin': 'administration', 'auth': 'authentication', 'config': 'configuration',
}

def normalize_noun(noun):
    """Fix known lemmatization quirks."""
    return NOUN_NORMALIZE.get(noun, noun)


def parse_requirement(req_sentence):
    """Extract ALL meaningful nouns (including adjective modifiers) and the primary action verb."""
    clean = req_sentence.replace("The system shall", "").replace("the system shall", "").strip()
    
    if not nlp:
        return ["general"], "manage", clean
    
    doc = nlp(clean.lower())
    
    # Extract meaningful words from noun chunks (includes adjectives like "demographic")
    nouns = []
    for chunk in doc.noun_chunks:
        for token in chunk:
            if token.pos_ in ('NOUN', 'PROPN', 'ADJ') and token.lemma_ not in SKIP_NOUNS and len(token.lemma_) > 2:
                normalized = normalize_noun(token.lemma_)
                if normalized not in nouns:
                    nouns.append(normalized)
    
    # Extract the primary action verb
    verb = "manage"
    for token in doc:
        if token.pos_ == 'VERB' and token.lemma_ not in SKIP_VERBS:
            verb = token.lemma_
            break
    
    if not nouns:
        nouns = ["general"]
    
    verb = normalize_verb(verb)
    
    return nouns, verb, clean


import re

def classify_requirement_domain(req_sentence):
    text = (req_sentence or '').strip()
    lower = text.lower()

    epic = "General System Operations"
    feature = "Core Functional Feature"

    # 1. User Access & Role Governance
    if re.search(r'\b(permission|auth|login|access control|role|password|encrypt|sso|jwt|oauth|restrict|permitted|user account|privilege)\b', lower):
        epic = "User Access Control & Role Governance"
        if re.search(r'\b(restrict|permission|role|action|privilege)\b', lower):
            feature = "Role Permission & Action Restriction"
        elif re.search(r'\b(login|auth|password|user account|account)\b', lower):
            feature = "User Access & Authentication Management"
        else:
            feature = "Security & Access Governance"

    # 2. Defect & Quality Management
    elif re.search(r'\b(defect|defects|issue|severity|priority|quality|inspection|repair|repairs|repair request)\b', lower):
        epic = "Defect & Quality Management"
        if re.search(r'\b(priority|severity|assign|level)\b', lower):
            feature = "Repair Priority & Severity Management"
        elif re.search(r'\b(status|update|change|supervisor)\b', lower):
            feature = "Defect Status & Repair Tracking"
        elif re.search(r'\b(create|manage|log|record)\b', lower):
            feature = "Defect Logging & Record Management"
        else:
            feature = "Defect & Repair Management"

    # 3. Labour & Cost Management
    elif re.search(r'\b(labour|labor|overtime|hourly|rate|cost|salary|timesheet|costing)\b', lower):
        epic = "Labour & Cost Management"
        if re.search(r'\b(overtime)\b', lower):
            feature = "Overtime Rules & Calculation"
        elif re.search(r'\b(rate|cost|calculate|costing|hourly)\b', lower):
            feature = "Labour Rate & Cost Calculation"
        else:
            feature = "Labour Resource Management"

    # 4. Communication & Notification Management
    elif re.search(r'\b(notification|notifications|email|template|alert|cc|export|print|job card)\b', lower):
        epic = "Job Card & Communication Management"
        if re.search(r'\b(template|soc|approved)\b', lower):
            feature = "Email Template Approval"
        elif re.search(r'\b(print|export|job card|pdf|excel)\b', lower):
            feature = "Job Card Export & Communication"
        else:
            feature = "Email Notification Management"

    # 5. System Configuration & Field Management
    elif re.search(r'\b(rename|configuration|field|setup|field name|specifications|power rating)\b', lower):
        epic = "System Configuration & Equipment Setup"
        feature = "Equipment & Field Naming Configuration"

    # 6. Equipment & Vessel Asset Management
    elif re.search(r'\b(vessel|equipment|material|materials|asset)\b', lower):
        epic = "Equipment & Vessel Asset Management"
        if re.search(r'\b(allocated|display|material|equipment)\b', lower):
            feature = "Equipment & Material Allocation Display"
        elif re.search(r'\b(select|vessel|create)\b', lower):
            feature = "Vessel & Equipment Maintenance Log"
        else:
            feature = "Asset & Equipment Management"

    # 7. Work Order & Maintenance Management
    elif re.search(r'\b(work order|work orders|maintenance|servicing|schedule|start date|end date|date/time|workshop|supervisor)\b', lower) or ('work' in lower and 'order' in lower):
        epic = "Work Order & Maintenance Management"
        if re.search(r'\b(edit|update|detail|modify|change)\b', lower):
            feature = "Work Order Data Modification & Updates"
        elif re.search(r'\b(start date|end date|date/time|schedule|time)\b', lower):
            feature = "Work Order Schedule & Time Entry"
        elif re.search(r'\b(approve|approval|sign-off|manager|workshop)\b', lower):
            feature = "Work Order Approval Workflow"
        elif re.search(r'\b(status|display|current)\b', lower):
            feature = "Work Order Status Tracking"
        else:
            feature = "Work Order Core Processing"

    # 8. Engineering Audit & Reporting Analytics
    elif re.search(r'\b(audit|history|version|trail|search|filter|report|reports|activity|query|engineering)\b', lower):
        epic = "Engineering & Audit Management"
        if re.search(r'\b(search|filter|query)\b', lower):
            feature = "Engineering Search & Filter Querying"
        elif re.search(r'\b(audit|history|version|trail|activity)\b', lower):
            feature = "Audit Trail & Version History Tracking"
        elif re.search(r'\b(report|reports|analytics)\b', lower):
            feature = "Engineering Reporting & Data Analytics"
        else:
            feature = "Engineering Activity Tracking"

    return epic, feature

def process_all_requirements(reqs):
    """
    Process requirements into relevant and accurate Epics, Features, User Stories, and Acceptance Criteria.
    """
    results = []
    for req in reqs:
        status = check_completeness(req)
        clean = (req or '').replace("The system shall", "").replace("the system shall", "").strip()
        req_lower = clean.lower()

        epic_name, feature_name = classify_requirement_domain(req)

        # Dynamic User Story Generation
        goal = f"the {feature_name.lower()} is executed correctly"
        action = clean

        for indicator in ["so that", "in order to", "to ensure", "to allow"]:
            if indicator in req_lower:
                parts = clean.split(indicator)
                action = parts[0].strip()
                goal = parts[1].strip()
                break

        clean_action = re.sub(r'^(the system shall allow users to|the system shall|the system must|the platform must|allow users to|users shall be allowed to|engineers shall be allowed to|engineers shall|the supervisor shall|the onshore engineer shall|onshore engineers shall|the workshop manager shall|workshop managers shall|administrators shall|the administrator shall)\s*', '', action, flags=re.IGNORECASE).strip().rstrip('.')
        goal = goal.strip().rstrip('.')
        user_story = f"As a System User, I want to {clean_action.lower()} so that {goal}."

        ac = (
            f"Scenario: Verify {clean_action.lower()}\n"
            f"1. Given the system is ready for {feature_name.lower()}\n"
            f"2. When the user initiates: {clean_action.lower()}\n"
            f"3. Then the system must validate the request against {epic_name.lower()} rules\n"
            f"4. And the {feature_name.lower()} state should be updated successfully."
        )

        results.append({
            "requirement": req,
            "status": status,
            "epic": epic_name,
            "feature": feature_name,
            "user_story": user_story,
            "acceptance_criteria": ac
        })

    return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command argument"}))
        return

    command = sys.argv[1]
    if len(sys.argv) >= 3:
        data = sys.argv[2]
    else:
        data = sys.stdin.read()
    
    try:
        reqs = json.loads(data)
    except Exception as e:
        print(json.dumps({"error": "Invalid JSON input"}))
        return
        
    results = []
    
    if command == "validate":
        for req in reqs:
            status = check_completeness(req)
            results.append({"requirement": req, "status": status})
            
    elif command == "process":
        results = process_all_requirements(reqs)
            
    print(json.dumps(results))

if __name__ == "__main__":
    main()
