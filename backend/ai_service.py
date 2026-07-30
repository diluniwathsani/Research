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
except ImportError:
    nlp = None
except OSError:
    # Auto-download the model if it's missing on the system
    os.system('python -m spacy download en_core_web_sm')
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
    except:
        nlp = None

# Attempt to load ML models from the parent directory (Research)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVM_PATH = os.path.join(BASE_DIR, 'model_svm_tuned.pkl')
TFIDF_PATH = os.path.join(BASE_DIR, 'tfidf_vectorizer.pkl')

best_model = None
tfidf = None

try:
    if os.path.exists(SVM_PATH) and os.path.exists(TFIDF_PATH):
        best_model = joblib.load(SVM_PATH)
        tfidf = joblib.load(TFIDF_PATH)
except Exception as e:
    print(json.dumps({"error": f"Model load error: {str(e)}"}))
    sys.exit(1)

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


def process_all_requirements(reqs):
    """
    Process ALL requirements as a batch with intelligent clustering:
    
    PHASE 1: Parse every requirement and extract all nouns + primary verb
    PHASE 2: Count noun frequency across ALL requirements to find domain topics
    PHASE 3: Use the most frequent nouns as Epic anchors
    PHASE 4: Assign each requirement to the Epic whose anchor noun it contains
    PHASE 5: Within each Epic, group by normalized verb → Features
    PHASE 6: Generate User Stories and Acceptance Criteria
    """
    from collections import Counter
    
    # --- PHASE 1: Parse every requirement ---
    parsed = []
    all_nouns = []
    
    for req in reqs:
        status = check_completeness(req)
        nouns, verb, clean = parse_requirement(req)
        parsed.append({
            "requirement": req,
            "status": status,
            "nouns": nouns,
            "verb": verb,
            "clean": clean
        })
        all_nouns.extend(nouns)
    
    # --- PHASE 2: Find the most common nouns (these become Epic themes) ---
    noun_freq = Counter(all_nouns)
    
    # Epic anchors: nouns appearing in 2+ requirements, ordered by frequency
    epic_anchors = [noun for noun, count in noun_freq.most_common() if count >= 2]
    
    # If no noun appears twice, use the top nouns
    if not epic_anchors:
        epic_anchors = [noun for noun, _ in noun_freq.most_common(5)]
    
    # --- PHASE 3: Assign each requirement to an Epic AND identify sub-topic ---
    for item in parsed:
        assigned = None
        for anchor in epic_anchors:
            if anchor in item["nouns"]:
                assigned = anchor
                break
        if not assigned:
            assigned = item["nouns"][0]
        item["epic_key"] = assigned
        
        # Sub-topic: the other nouns BESIDES the epic key (these define the Feature)
        sub_nouns = [n for n in item["nouns"] if n != assigned]
        item["sub_nouns"] = sub_nouns
    
    # --- PHASE 4: Group into Epics ---
    epic_groups = {}
    for item in parsed:
        key = item["epic_key"]
        if key not in epic_groups:
            epic_groups[key] = []
        epic_groups[key].append(item)
    
    results = []
    
    for noun_key, items in epic_groups.items():
        epic_name = f"{noun_key.title()} Management"
        
        # --- PHASE 5: Within this Epic, group by sub-topic noun → Feature ---
        # Count sub-topic nouns to find the dominant sub-themes
        sub_noun_freq = Counter()
        for item in items:
            sub_noun_freq.update(item["sub_nouns"])
        
        # Feature anchors: sub-nouns that appear in 2+ requirements in this epic
        feature_anchors = [n for n, c in sub_noun_freq.most_common() if c >= 2]
        
        # Assign each requirement to a Feature based on its sub-topic
        for item in items:
            assigned_feature = None
            for anchor in feature_anchors:
                if anchor in item["sub_nouns"]:
                    assigned_feature = anchor
                    break
            if not assigned_feature:
                # Use the first sub-noun, or fall back to the epic noun itself
                assigned_feature = item["sub_nouns"][0] if item["sub_nouns"] else noun_key
            item["feature_key"] = assigned_feature
        
        # Group by feature key
        feature_groups = {}
        for item in items:
            fk = item["feature_key"]
            if fk not in feature_groups:
                feature_groups[fk] = []
            feature_groups[fk].append(item)
        
        # --- PHASE 6: Merge tiny features (1 item) into the largest feature ---
        if len(feature_groups) > 1:
            largest_key = max(feature_groups, key=lambda k: len(feature_groups[k]))
            tiny_keys = [k for k, v in feature_groups.items() if len(v) == 1 and k != largest_key]
            for tk in tiny_keys:
                feature_groups[largest_key].extend(feature_groups[tk])
                del feature_groups[tk]
        
        # --- PHASE 7: Generate artifacts for each Feature ---
        for feat_key, feat_items in feature_groups.items():
            # Avoid double names like "Information Information"
            if feat_key == noun_key:
                feature_name = f"{noun_key.title()} Operations"
            else:
                feature_name = f"{feat_key.title()} {noun_key.title()}"
            
            for item in feat_items:
                clean = item["clean"]
                req_lower = clean.lower()
                
                # --- Dynamic User Story Generation ---
                # Attempt to extract an existing goal from the requirement
                goal = "the system's functional requirements are satisfied"
                action = clean
                
                # Look for common goal indicators
                for indicator in ["so that", "in order to", "to ensure", "to allow"]:
                    if indicator in req_lower:
                        parts = clean.split(indicator)
                        action = parts[0].strip()
                        goal = parts[1].strip()
                        break
                
                # If no goal found, create a specific one based on the feature
                if goal == "the system's functional requirements are satisfied":
                    goal = f"the {feature_name.lower()} is processed correctly"

                user_story = f"As a System User, I want to {action.lower()} so that {goal}."
                
                # --- Dynamic Acceptance Criteria ---
                ac = (
                    f"Scenario: Verify {action.lower()}\n"
                    f"1. Given the system is ready for {feature_name.lower()}\n"
                    f"2. When the user initiates: {action.lower()}\n"
                    f"3. Then the system must validate the request against {epic_name.lower()} rules\n"
                    f"4. And the {feature_name.lower()} state should be updated successfully."
                )
                
                results.append({
                    "requirement": item["requirement"],
                    "status": item["status"],
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
