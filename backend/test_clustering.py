import json, sys
from ai_service import process_all_requirements

reqs = [
    "The system shall create a single patient record for each patient.",
    "The system shall store and link key identifier information.",
    "The system shall store more than one identifier for each patient.",
    "The system shall include demographic information in the patient record.",
    "The system shall maintain and make available historical demographic data.",
    "The system shall modify demographic information.",
    "The system shall capture and maintain diagnosis as discrete data.",
    "The system shall capture and maintain surgical history.",
]

results = process_all_requirements(reqs)
for r in results:
    epic = r["epic"]
    feat = r["feature"]
    req = r["requirement"][:55]
    print(f"Epic: {epic:30s} | Feature: {feat:25s} | {req}")
