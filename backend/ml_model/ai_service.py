import sys
import json
import os
import re
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
    Validates if a requirement sentence is Complete, Incomplete, Inconsistent, or Ambiguous.
    Standards:
    - Incomplete: Missing Subject (Actor), Missing Action (Verb), Missing RFC 2119 Modal keyword (shall/must), or Too short / unfinished clause.
    - Inconsistent: Conflicting affirmative and negative directives (shall vs shall not), conflicting permissions, contradictory states/retention, or conflicting timing.
    - Ambiguous: Subjective non-verifiable quality terms (fast, user-friendly, robust), vague quantifiers (etc., and/or, various), weak modals (if possible, as needed).
    - Complete: Meets all syntactic and semantic quality criteria.
    """
    if not text or not isinstance(text, str):
        return "Incomplete: Empty text"
    
    clean_text = text.strip()
    words = clean_text.split()
    lower_text = clean_text.lower()
    
    # -------------------------------------------------------------
    # 1. INCOMPLETE CHECKS (Basic Structure & Placeholders)
    # -------------------------------------------------------------
    if len(words) < 5 or len(clean_text) < 15:
        return "Incomplete: Too short"

    # Check for placeholder tokens
    if re.search(r'\b(tbd|tba|todo|to be determined|to be decided|placeholder)\b', lower_text):
        return "Incomplete: Contains unfinished placeholder (TBD/TODO)"

    # Check for truncated/dangling endings
    if re.search(r'(\.{3,}|…|\bsuch as\s*[.,;:]*$|\bincluding\s*[.,;:]*$|\be\.g\.?\s*[.,;:]*$|\bi\.e\.?\s*[.,;:]*$|\band\s*[.,;:]*$|\bor\s*[.,;:]*$|\bwith\s*[.,;:]*$|\bto\s*[.,;:]*$)', clean_text, re.I):
        return "Incomplete: Trailing incomplete clause or ellipsis"

    # NLP Dependency Parsing (if spaCy is available)
    if nlp:
        doc = nlp(clean_text)
        has_subject = any(token.dep_ in ('nsubj', 'nsubjpass') for token in doc)
        # Require an actual action verb (not solely the modal auxiliary like 'shall')
        has_verb = any(token.pos_ == 'VERB' for token in doc) or any(token.pos_ == 'AUX' and token.lemma_.lower() not in ['shall', 'should', 'must', 'will', 'can', 'may', 'could', 'might'] for token in doc)
        has_modal = any(token.lemma_.lower() in ['shall', 'should', 'must', 'will'] for token in doc)

        if not has_subject:
            return "Incomplete: Missing a subject (Who/What?)"
        if not has_verb:
            return "Incomplete: Missing an action (Does what?)"
        if not has_modal:
            return "Incomplete: Missing a requirement keyword (shall/must)"
    else:
        # Fallback regex check if spaCy model is unavailable
        has_modal = bool(re.search(r'\b(shall|should|must|will)\b', lower_text))
        has_actor = bool(re.search(r'\b(system|user|users|engineer|engineers|platform|application|admin|administrator|manager|supervisor|api|service|module|portal|database|client|customer)\b', lower_text))
        if not has_actor:
            return "Incomplete: Missing a subject (Who/What?)"
        if not has_modal:
            return "Incomplete: Missing a requirement keyword (shall/must)"

    # -------------------------------------------------------------
    # 2. INCONSISTENT CHECKS (Direct Contradictions & Conflicts)
    # -------------------------------------------------------------
    # Contradiction A: Affirmative vs Negative Modals (e.g. "shall" AND "shall not", "must" AND "must not")
    neg_modal_regex = r'\b(shall\s+not|must\s+not|cannot|can\s+not|shall\s+never|must\s+never|shall\s+under\s+no\s+circumstance)\b'
    has_neg_modal = bool(re.search(neg_modal_regex, lower_text))
    text_without_neg_modals = re.sub(neg_modal_regex, '', lower_text)
    has_pos_modal = bool(re.search(r'\b(shall|must)\b', text_without_neg_modals))
    if has_pos_modal and has_neg_modal:
        return "Inconsistent: Conflicting affirmative and negative directives ('shall' vs 'shall not')"

    # Contradiction B: Conflicting Permission / Access Control
    has_public_access = bool(re.search(r'\b(without authentication|unauthenticated\s+access|anonymous\s+access|publicly accessible|all users without login|any user without credentials|open to everyone)\b', lower_text))
    has_restricted_access = bool(re.search(r'\b(restricted to|only authorized|admin only|only administrators|requires login|confidential|private access|restricted access)\b', lower_text))
    if has_public_access and has_restricted_access:
        return "Inconsistent: Conflicting access rules (public/unauthenticated vs restricted access)"

    # Contradiction C: Conflicting Directives (Allow vs Prohibit the action)
    has_shall_allow = bool(re.search(r'\b(shall allow|must allow|shall permit|must permit|shall enable)\b', lower_text))
    has_shall_prohibit = bool(re.search(r'\b(shall prohibit|must prohibit|shall disallow|must disallow|shall prevent|must prevent|shall disable)\b', lower_text))
    if has_shall_allow and has_shall_prohibit:
        return "Inconsistent: Conflicting action directives (allow/permit vs prohibit/disallow)"

    # Contradiction D: Data Lifecycle (Permanently Delete vs Retain Indefinitely)
    has_delete = bool(re.search(r'\b(permanently delete|permanently deleted|purge|purged|destroy|destroyed)\b', lower_text))
    has_retain = bool(re.search(r'\b(retain indefinitely|keep forever|archive permanently|store permanently|retained forever)\b', lower_text))
    if has_delete and has_retain:
        return "Inconsistent: Conflicting data lifecycle rules (permanently delete vs retain indefinitely)"

    # Contradiction E: Plaintext vs Encrypted
    has_store_plaintext = bool(re.search(r'\b(store in plain\s*text|save as plain\s*text|transmit in plain\s*text|stored unencrypted|transmitted unencrypted|as plain\s*text)\b', lower_text))
    has_encrypt = bool(re.search(r'\b(encrypt|encrypted|encryption|hashed|hash)\b', lower_text))
    is_negated_plaintext = bool(re.search(r'\b(never|not|no|prevent|prohibit|disallow)\s+(?:store in\s+|transmit in\s+|save as\s+|in\s+)?(?:plain\s*text|unencrypted)\b', lower_text))
    if has_store_plaintext and has_encrypt and not is_negated_plaintext:
        return "Inconsistent: Conflicting security directives (plaintext vs encrypted)"

    # Contradiction F: Real-time vs Batch Delay
    has_realtime = bool(re.search(r'\b(real-time|real time|instantaneously|immediately|zero latency)\b', lower_text))
    has_batch = bool(re.search(r'\b(daily batch|overnight batch|end of day|end of month|monthly batch|delayed processing)\b', lower_text))
    if has_realtime and has_batch:
        return "Inconsistent: Conflicting timing constraints (real-time vs batch processing)"

    # Contradiction G: Mandatory vs Optional
    has_mandatory = bool(re.search(r'\b(mandatory|compulsory|strictly required)\b', lower_text))
    has_optional = bool(re.search(r'\b(optional|discretionary|not required|if desired)\b', lower_text))
    if has_mandatory and has_optional:
        return "Inconsistent: Conflicting requirement necessity (mandatory vs optional)"

    # -------------------------------------------------------------
    # 3. AMBIGUOUS CHECKS (Vague, Subjective, or Non-verifiable Terms)
    # -------------------------------------------------------------
    # Category A: Subjective Performance & Usability Adjectives
    ambiguous_subjective_patterns = [
        (r'\b(user-friendly|user friendly)\b', "user-friendly"),
        (r'\b(easy to use|easy to learn|simple to use)\b', "easy to use"),
        (r'\bfast(?!\s*-\s*forward)\b|\b(quickly|very quick|super fast)\b', "fast/quickly"),
        (r'\b(high performance|high-performance|high quality|high-quality|state of the art|state-of-the-art)\b', "high performance/quality"),
        (r'\b(optimal|optimally)\b', "optimal"),
        (r'\b(seamless|seamlessly)\b', "seamless"),
        (r'\b(robust|robustly)\b', "robust"),
        (r'\b(efficient|efficiently)\b', "efficient"),
        (r'\b(intuitive|intuitively)\b', "intuitive"),
        (r'\b(sufficient|sufficiently|adequate|adequately|acceptable)\b', "sufficient/adequate"),
        (r'\b(reasonable|reasonably|convenient|conveniently)\b', "reasonable/convenient"),
        (r'\b(as much as possible|as soon as possible|as far as possible|asap)\b', "as soon/much as possible"),
        (r'\b(best possible|highest possible|minimal delay|minimal effort)\b', "best/minimal possible"),
    ]

    for pattern, term in ambiguous_subjective_patterns:
        if re.search(pattern, lower_text):
            return f"Ambiguous: Subjective term '{term}' lacks verifiable acceptance criteria"

    # Category B: Vague Quantifiers & Open-ended Qualifiers
    ambiguous_quantifier_patterns = [
        (r'\b(etc\.?|and/or|and or|so on|and so forth)\b', "etc/and-or"),
        (r'\b(various|several|some|roughly|approximately|about\s+\d+|nearly|almost)\b', "vague quantifier"),
        (r'\b(as needed|as required|as appropriate|if necessary|if possible|when appropriate)\b', "open-ended conditional"),
        (r'\b(might|may perhaps|can perhaps|could possibly)\b', "non-committal modal"),
    ]

    for pattern, term in ambiguous_quantifier_patterns:
        if re.search(pattern, lower_text):
            match = re.search(pattern, lower_text)
            matched_word = match.group(0) if match else term
            return f"Ambiguous: Open-ended qualifier '{matched_word}' is non-verifiable"

    # -------------------------------------------------------------
    # 4. COMPLETE (All Quality Standards Satisfied)
    # -------------------------------------------------------------
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
