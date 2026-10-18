import urllib.request
import json
import sys

def main():
    print("Fetching requirements from Express server (http://localhost:3000/api/requirements)...")
    req = urllib.request.Request("http://localhost:3000/api/requirements")
    with urllib.request.urlopen(req) as resp:
        all_reqs = json.loads(resp.read().decode('utf-8'))
    
    print(f"Total requirements found: {len(all_reqs)}")
    
    # Filter for Fleet project
    fleet_reqs = [r for r in all_reqs if 'Fleet' in str(r.get('batch_name', '')) or r.get('project_id') == 'P102293']
    if not fleet_reqs:
        # Fallback to all requirements if project name differs
        fleet_reqs = all_reqs
    print(f"Targeting {len(fleet_reqs)} requirements for Fleet and Engineering Management.")

    payload = {
        "requirements": fleet_reqs,
        "project_name": "Fleet and Engineering Management",
        "timeline_settings": {
            "start_date": "2026-10-19",
            "sprint_duration_weeks": 2,
            "working_days_per_week": 5,
            "target_sprint_count": 5,
            "velocity_per_sprint": 40,
            "planning_strategy": "ilp_optimal"
        }
    }

    print("POSTing to Python Sprint API (http://localhost:8082/api/import-requirements)...")
    post_data = json.dumps(payload).encode('utf-8')
    post_req = urllib.request.Request(
        "http://localhost:8082/api/import-requirements",
        data=post_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(post_req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print("Import response status:", res.get("status"))
            print("Message:", res.get("message"))
            print(f"Imported count: {res.get('imported_count')}, Total points: {res.get('total_points')}, Sprints: {res.get('sprints_count')}")
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode('utf-8'))
        sys.exit(1)

    print("\n--- Verifying Sprint 1 Allocation (MVP / Foundation) ---")
    plan_req = urllib.request.Request("http://localhost:8082/api/sprint-plan")
    with urllib.request.urlopen(plan_req) as resp:
        plan = json.loads(resp.read().decode('utf-8'))
    
    sprints = plan.get('sprints', {})
    print(f"Total Sprints in Plan: {len(sprints)}")
    sprint1_tasks = sprints.get("1", [])
    print(f"Sprint 1 Tasks Count: {len(sprint1_tasks)}")
    
    for t in sprint1_tasks[:10]:
        print(f"  [{t.get('story_id')}] Tier: {t.get('dependency_tier')} | Group: {t.get('process_group')} | Pts: {t.get('story_points')} | Prio: {t.get('priority_tier')} | Deps: {t.get('dependencies')} | Title: {t.get('title')[:55]}")

    print("\n--- Verifying Downstream Dependent Stories in Later Sprints ---")
    sprint_later = sprints.get("2", []) + sprints.get("3", []) + sprints.get("4", [])
    with_deps = [t for t in sprint_later if len(t.get('dependencies', [])) > 0]
    print(f"Stories in Later Sprints with explicitly enforced dependencies: {len(with_deps)}")
    for t in with_deps[:5]:
        print(f"  [{t.get('story_id')} in Sprint {t.get('sprint_number')}] Depends on {t.get('dependencies')} | Title: {t.get('title')[:55]}")

    print("\n--- Verifying Subtask Decomposition Efforts & Hours ---")
    decomposed = [t for t in sprint1_tasks + sprint_later if t.get('is_decomposed') and len(t.get('sub_tasks', [])) > 0]
    print(f"Total Decomposed Stories: {len(decomposed)}")
    if decomposed:
        sample = decomposed[0]
        parent_pts = sample.get('story_points')
        sub_pts_sum = sum(s.get('story_points', 0) for s in sample.get('sub_tasks', []))
        total_sub_hrs = sum(s.get('estimated_hours', 0) for s in sample.get('sub_tasks', []))
        print(f"Sample Story: {sample.get('story_id')} - Parent Points: {parent_pts}, Subtasks Points Sum: {sub_pts_sum} (Exact Match: {parent_pts == sub_pts_sum})")
        print(f"Total Subtask Hours: {total_sub_hrs} hrs")
        for st in sample.get('sub_tasks', []):
            print(f"    Subtask [{st.get('id')}]: {st.get('title')} -> {st.get('story_points')} pts, {st.get('estimated_hours')} hrs (Domain: {st.get('domain')})")

    print("\n--- Verifying Critical Path Method (CPM) Analytics ---")
    cpm_req = urllib.request.Request("http://localhost:8082/api/analytics/cpm")
    with urllib.request.urlopen(cpm_req) as resp:
        cpm = json.loads(resp.read().decode('utf-8'))
    print(f"Total Stories Analyzed: {cpm.get('total_stories_count')}")
    print(f"Critical Path Stories Count: {cpm.get('critical_path_stories_count')}")
    print(f"Critical Path Ratio: {cpm.get('critical_path_ratio_pct')}%")
    print(f"Early Bottleneck Warnings: {len(cpm.get('early_warnings', []))}")
    if cpm.get('early_warnings'):
        safe_msg = cpm['early_warnings'][0].get('message', '').encode('ascii', 'replace').decode('ascii')
        print("Sample Bottleneck Warning:", safe_msg)

if __name__ == '__main__':
    main()
