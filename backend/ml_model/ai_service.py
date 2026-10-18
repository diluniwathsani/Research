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
        # Require an actual action verb (not solely a modal auxiliary)
        has_verb = any(token.pos_ == 'VERB' for token in doc) or any(token.pos_ == 'AUX' and token.lemma_.lower() not in ['shall', 'should', 'must', 'will', 'can', 'may', 'could', 'might'] for token in doc)

        if not has_subject:
            return "Incomplete: Missing a subject (Who/What?)"
        if not has_verb:
            return "Incomplete: Missing an action (Does what?)"
    else:
        # Fallback check if spaCy model is unavailable
        action_verb_regex = r'\b(add|adds|edit|edits|create|creates|delete|deletes|remove|removes|update|updates|modify|modifies|change|changes|manage|manages|enter|enters|input|inputs|allow|allows|permit|permits|enable|enables|disable|disables|prevent|prevents|prohibit|prohibits|restrict|restricts|display|displays|show|shows|hide|hides|view|views|see|sees|record|records|log|logs|track|tracks|capture|captures|store|stores|save|saves|retrieve|retrieves|fetch|fetches|load|loads|export|exports|import|imports|upload|uploads|download|downloads|send|sends|receive|receives|notify|notifies|alert|alerts|prompt|prompts|request|requests|respond|responds|approve|approves|reject|rejects|review|reviews|validate|validates|verify|verifies|authenticate|authenticates|authorize|authorizes|calculate|calculates|compute|computes|estimate|estimates|determine|determines|assess|assesses|evaluate|evaluates|consider|considers|process|processes|generate|generates|produce|produces|assign|assigns|allocate|allocates|distribute|distributes|schedule|schedules|select|selects|choose|chooses|filter|filters|search|searches|sort|sorts|order|orders|query|queries|maintain|maintains|support|supports|provide|provides|offer|offers|ensure|ensures|enforce|enforces|apply|applies|perform|performs|execute|executes|run|runs|initiate|initiates|trigger|triggers|start|starts|stop|stops|halt|halts|pause|pauses|resume|resumes|cancel|cancels|close|closes|open|opens|complete|completes|finish|finishes|archive|archives|attach|attaches|convert|converts|format|formats|parse|parses|extract|extracts|sync|syncs|synchronize|synchronizes|connect|connects|disconnect|disconnects|integrate|integrates|link|links|be|been|have|has|contain|contains|include|includes|consist|consists|require|requires|accept|accepts|refuse|refuses|handle|handles|use|uses|used|using|obtain|obtains|obtained|obtaining|utilize|utilizes|utilized|utilizing|consume|consumes|employ|employs|operate|operates|transfer|transfers|transmit|transmits|identify|identifies|identified|identifying|find|finds|found|detect|detects|detected)\b'

        modal_match = re.search(r'\b(shall|should|must|will|can|could|may|needs?\s+to|need\s+to|is\s+required\s+to|are\s+required\s+to|has\s+to|have\s+to|is\s+able\s+to|are\s+able\s+to)\b', clean_text, re.I)
        if modal_match:
            before_modal = clean_text[:modal_match.start()].strip()
            before_modal = re.sub(r'^(?:(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*[:.\-–—\s]+|\d+(?:\.\d+)*[\.\)\:\-–—]\s+|[-•*–—▪▫◦•]\s+|Requirement\s*\d*[:.\-–—\s]+)\s*', '', before_modal, flags=re.I).strip()
            if not before_modal:
                return "Incomplete: Missing a subject (Who/What?)"

            after_modal = clean_text[modal_match.end():].strip()
            if not after_modal:
                return "Incomplete: Missing an action (Does what?)"

            after_modal_clean = re.sub(r'^(?:not|never|always|automatically|only|promptly|immediately|periodically|dynamically|securely|directly)\s+', '', after_modal, flags=re.I).strip()
            first_word = after_modal_clean.split()[0].lower() if after_modal_clean else ''
            invalid_first_words = {'a', 'an', 'the', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'to', 'into', 'about', 'his', 'her', 'their', 'my', 'our', 'its', 'them', 'him', 'it', 'me', 'us'}

            if invalid_first_words and first_word in invalid_first_words and not re.search(action_verb_regex, after_modal_clean, re.I):
                return "Incomplete: Missing an action (Does what?)"

            if not re.search(action_verb_regex, after_modal, re.I):
                return "Incomplete: Missing an action (Does what?)"
        else:
            clean_no_prefix = re.sub(r'^(?:(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*[:.\-–—\s]+|\d+(?:\.\d+)*[\.\)\:\-–—]\s+|[-•*–—▪▫◦•]\s+|Requirement\s*\d*[:.\-–—\s]+)\s*', '', clean_text, flags=re.I).strip()
            if not re.search(action_verb_regex, clean_no_prefix, re.I):
                return "Incomplete: Missing an action (Does what?)"

            first_word = clean_no_prefix.split()[0].lower() if clean_no_prefix else ''
            imperative_verbs = r'^(add|edit|create|delete|remove|update|modify|change|manage|enter|input|record|log|track|capture|store|save|retrieve|fetch|load|export|import|upload|download|send|receive|notify|alert|prompt|request|respond|approve|reject|review|validate|verify|authenticate|authorize|calculate|compute|estimate|determine|assess|evaluate|process|generate|produce|assign|allocate|distribute|schedule|select|choose|filter|search|sort|maintain|provide|support|execute|run|start|stop|cancel|close|open|complete|convert|sync|connect|disconnect|integrate|link|obtain|utilize|operate|transfer|transmit)$'
            if re.match(imperative_verbs, first_word, re.I):
                return "Incomplete: Missing a subject (Who/What?)"

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

        role_list = [
            'onshore engineer', 'onshore engineers',
            'workshop manager', 'workshop managers',
            'project manager', 'project managers',
            'team leader', 'team leaders',
            'team member', 'team members',
            'supervisor', 'supervisors',
            'administrator', 'administrators', 'admin',
            'system user', 'system users',
            'engineer', 'engineers',
            'manager', 'managers',
            'user', 'users'
        ]

        actor = 'System User'
        clean_action = action

        for role in role_list:
            role_pattern = rf'^(?:the|a|an)?\s*{re.escape(role)}\b'
            if re.search(role_pattern, clean_action, re.I):
                actor = role
                clean_action = re.sub(role_pattern, '', clean_action, flags=re.I).strip()
                break

        actor_lower = actor.lower()
        if actor_lower.endswith('s') and not actor_lower.endswith('ss') and not actor_lower.endswith('us'):
            actor = actor[:-1]
        actor = ' '.join(w.capitalize() for w in actor.split())

        clean_action = re.sub(
            r'^(?:as a system user, i want to|the system shall allow users to|the system shall|the system must|the platform shall|the platform must|users shall be allowed to|engineers shall be allowed to|allow users to|users shall|users must|need to|needs to|shall be able to|must be able to|is required to|are required to|shall|must|can|should|will|the)\s*',
            '',
            clean_action,
            flags=re.IGNORECASE
        ).strip()

        verb_uninflect = {
            'enters': 'enter', 'approves': 'approve', 'rejects': 'reject', 'assigns': 'assign',
            'updates': 'update', 'selects': 'select', 'maintains': 'maintain', 'calculates': 'calculate',
            'provides': 'provide', 'allows': 'allow', 'supports': 'support', 'displays': 'display',
            'stores': 'store', 'obtains': 'obtain', 'uses': 'use', 'creates': 'create', 'manages': 'manage',
            'searches': 'search', 'views': 'view', 'identifies': 'identify', 'receives': 'receive'
        }
        first_w = clean_action.split()[0].lower() if clean_action.split() else ''
        if first_w in verb_uninflect:
            clean_action = verb_uninflect[first_w] + clean_action[len(first_w):]

        clean_action = clean_action.strip().rstrip('.')
        goal = goal.strip().rstrip('.')
        article = 'an' if actor[0].lower() in 'aeiou' else 'a'
        user_story = f"As {article} {actor}, I want to {clean_action[:1].lower() + clean_action[1:]} so that {goal}."

        ac = (
            f"Scenario: Verify {feature_name}\n"
            f"1. Given the system is operational and ready for {feature_name.lower()}\n"
            f"2. When the {actor.lower()} performs: {clean_action[:1].lower() + clean_action[1:]}\n"
            f"3. Then the system must validate the input according to {epic_name.lower()} rules\n"
            f"4. And the {feature_name.lower()} records should be updated successfully."
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
