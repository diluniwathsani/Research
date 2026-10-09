import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from collections import defaultdict, deque

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "sprint-models")

# Tier weight multiplier for value maximization in Knapsack
TIER_VALUE_MULTIPLIER = {
    "CRITICAL": 2.5,
    "HIGH": 1.8,
    "MEDIUM": 1.2,
    "LOW": 0.8
}

class DependencyGraph:
    """Manages User Story dependency relationships and DAG sequencing."""
    def __init__(self, stories):
        self.stories = {s['story_id']: s for s in stories}
        self.adj = defaultdict(list)          # prerequisite -> dependents
        self.rev_adj = defaultdict(list)      # dependent -> prerequisites
        self.in_degree = defaultdict(int)
        self._build_graph()

    def _build_graph(self):
        for sid in self.stories:
            self.in_degree[sid] = 0
            
        for sid, story in self.stories.items():
            deps = story.get('dependencies', [])
            if isinstance(deps, str):
                deps = [d.strip() for d in deps.split(',') if d.strip()]
            story['dependencies'] = [d for d in deps if d in self.stories]
            
            for dep in story['dependencies']:
                self.adj[dep].append(sid)
                self.rev_adj[sid].append(dep)
                self.in_degree[sid] += 1

    def detect_cycles(self):
        """Returns True if there is a circular dependency in the backlog."""
        in_deg = dict(self.in_degree)
        queue = deque([sid for sid, deg in in_deg.items() if deg == 0])
        visited_count = 0
        
        while queue:
            node = queue.popleft()
            visited_count += 1
            for neighbor in self.adj[node]:
                in_deg[neighbor] -= 1
                if in_deg[neighbor] == 0:
                    queue.append(neighbor)
                    
        return visited_count < len(self.stories)

    def get_topological_order(self):
        """Returns valid execution order respecting all prerequisites."""
        in_deg = dict(self.in_degree)
        queue = deque([sid for sid, deg in in_deg.items() if deg == 0])
        order = []
        
        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbor in self.adj[node]:
                in_deg[neighbor] -= 1
                if in_deg[neighbor] == 0:
                    queue.append(neighbor)
                    
        # Append remaining unvisited if cycle exists as fallback
        for sid in self.stories:
            if sid not in order:
                order.append(sid)
                
        return order

    def get_transitive_dependents_count(self, story_id):
        """Count how many total downstream stories depend on this story (Blocking power)."""
        visited = set()
        queue = deque(self.adj[story_id])
        while queue:
            cur = queue.popleft()
            if cur not in visited:
                visited.add(cur)
                for nxt in self.adj[cur]:
                    queue.append(nxt)
        return len(visited)


class SprintOptimizer:
    """0/1 Multi-Knapsack & Dependency-Aware Sprint Allocator and Replanner."""
    
    def __init__(self, sprint_capacity=30, sprint_length_days=14, team_size=5):
        self.sprint_capacity = sprint_capacity
        self.sprint_length_days = sprint_length_days
        self.team_size = team_size

    def calculate_story_value(self, story, dep_graph):
        """
        Calculates business/technical value for 0/1 Knapsack objective function:
        Value = (Priority Score * (Confidence/100) * Tier Multiplier) + (Unblocking Power Bonus)
        """
        tier = story.get('priority_tier', 'MEDIUM')
        mult = TIER_VALUE_MULTIPLIER.get(tier, 1.0)
        score = float(story.get('priority_score', 50))
        conf = float(story.get('confidence', 80)) / 100.0
        
        # Unblocking bonus: stories that unblock other stories get higher scheduling value
        unblock_count = dep_graph.get_transitive_dependents_count(story['story_id'])
        unblock_bonus = unblock_count * 15.0
        
        raw_val = (score * conf * mult) + unblock_bonus
        return round(raw_val, 2)

    def optimize_allocation(self, stories, capacity=None):
        """
        Runs optimal Multi-Knapsack Allocation with Dependency Constraint.
        Returns:
            - sprints: dict { sprint_num: [stories] }
            - comparison: { greedy_metrics, optimal_metrics, value_boost_pct }
            - stats: overall summary metrics
        """
        if capacity is None:
            capacity = self.sprint_capacity

        if not stories:
            return {"sprints": {}, "comparison": {}, "stats": {}}

        # Deep copy stories and ensure clean types
        story_list = []
        for s in stories:
            item = dict(s)
            item['story_points'] = int(item.get('story_points', 3))
            item['estimated_hours'] = item.get('estimated_hours', item['story_points'] * 8)
            item['dependencies'] = item.get('dependencies', [])
            if isinstance(item['dependencies'], str):
                item['dependencies'] = [d.strip() for d in item['dependencies'].split(',') if d.strip()]
            story_list.append(item)

        dep_graph = DependencyGraph(story_list)
        has_cycle = dep_graph.detect_cycles()

        # Attach value to each story
        for item in story_list:
            item['optimization_value'] = self.calculate_story_value(item, dep_graph)
            item['unblock_count'] = dep_graph.get_transitive_dependents_count(item['story_id'])

        # 1. Optimal Allocation using Dependency-Constrained Multi-Knapsack (DP)
        sprints = {}
        scheduled = set()
        unallocated = list(story_list)
        sprint_idx = 1
        max_sprints = 10

        while unallocated and sprint_idx <= max_sprints:
            # Candidate stories: all whose prerequisites are ALREADY scheduled in earlier sprints
            # or can be scheduled in this current sprint
            eligible = [
                s for s in unallocated
                if all(dep in scheduled for dep in s['dependencies'])
            ]

            if not eligible:
                # Break circular or stuck deadlocks gracefully
                eligible = unallocated

            # 0/1 Knapsack on eligible items for this sprint capacity
            chosen_indices = self._solve_knapsack_dp(eligible, capacity)
            
            current_sprint_stories = []
            current_load = 0

            for idx in chosen_indices:
                story = eligible[idx]
                story['sprint_number'] = sprint_idx
                current_sprint_stories.append(story)
                current_load += story['story_points']
                scheduled.add(story['story_id'])
                unallocated = [u for u in unallocated if u['story_id'] != story['story_id']]

            if current_sprint_stories:
                sprints[sprint_idx] = current_sprint_stories
                sprint_idx += 1
            else:
                # If a single huge story exceeds capacity, allocate it solely to the sprint
                forced = unallocated.pop(0)
                forced['sprint_number'] = sprint_idx
                sprints[sprint_idx] = [forced]
                scheduled.add(forced['story_id'])
                sprint_idx += 1

        # 2. Run Greedy Baseline for Benchmark Comparison
        greedy_sprints, greedy_val = self._solve_greedy(story_list, capacity)
        optimal_val = sum(
            sum(s['optimization_value'] for s in sprint_stories)
            for sprint_stories in sprints.values()
        )

        total_pts = sum(s['story_points'] for s in story_list)
        sprint_count = len(sprints)
        
        # Calculate comparison metrics
        greedy_sprint1_val = sum(s['optimization_value'] for s in greedy_sprints.get(1, []))
        optimal_sprint1_val = sum(s['optimization_value'] for s in sprints.get(1, []))
        
        boost = 0.0
        if greedy_sprint1_val > 0:
            boost = round(((optimal_sprint1_val - greedy_sprint1_val) / greedy_sprint1_val) * 100, 1)

        critical_high_count = sum(1 for s in story_list if s.get('priority_tier') in ['CRITICAL', 'HIGH'])
        sprint1_critical_count = sum(1 for s in sprints.get(1, []) if s.get('priority_tier') in ['CRITICAL', 'HIGH'])

        summary = {
            "total_stories": len(story_list),
            "total_story_points": total_pts,
            "total_sprints": sprint_count,
            "sprint_capacity": capacity,
            "has_circular_dependency": has_cycle,
            "sprint1_utilization_pct": round((sum(s['story_points'] for s in sprints.get(1, [])) / capacity) * 100, 1),
            "sprint1_value": optimal_sprint1_val,
            "critical_high_fulfillment_sprint1_pct": round((sprint1_critical_count / max(1, critical_high_count)) * 100, 1),
            "value_boost_vs_greedy_pct": max(0.0, boost)
        }

        comparison = {
            "greedy": {
                "name": "Standard Greedy Bin-Packing",
                "sprint1_value": greedy_sprint1_val,
                "total_sprints": len(greedy_sprints),
                "sprint1_points": sum(s['story_points'] for s in greedy_sprints.get(1, []))
            },
            "knapsack": {
                "name": "0/1 Knapsack Optimizer (Proposed)",
                "sprint1_value": optimal_sprint1_val,
                "total_sprints": len(sprints),
                "sprint1_points": sum(s['story_points'] for s in sprints.get(1, [])),
                "boost_percentage": max(0.0, boost)
            }
        }

        return {
            "sprints": sprints,
            "stats": summary,
            "comparison": comparison,
            "flattened_tasks": [s for slist in sprints.values() for s in slist]
        }

    def _solve_knapsack_dp(self, items, capacity):
        """0/1 Knapsack Dynamic Programming solution to maximize value within capacity."""
        n = len(items)
        if n == 0 or capacity <= 0:
            return []

        weights = [min(capacity, max(1, it['story_points'])) for it in items]
        values = [max(1, int(it['optimization_value'])) for it in items]

        dp = [[0 for _ in range(capacity + 1)] for _ in range(n + 1)]

        for i in range(1, n + 1):
            w = weights[i - 1]
            v = values[i - 1]
            for c in range(capacity + 1):
                if w <= c:
                    dp[i][c] = max(dp[i - 1][c], dp[i - 1][c - w] + v)
                else:
                    dp[i][c] = dp[i - 1][c]

        # Traceback to find chosen items
        chosen = []
        c = capacity
        for i in range(n, 0, -1):
            if dp[i][c] != dp[i - 1][c]:
                chosen.append(i - 1)
                c -= weights[i - 1]

        chosen.reverse()
        return chosen

    def _solve_greedy(self, stories, capacity):
        """Greedy heuristic: sorts by value/weight ratio."""
        sorted_stories = sorted(
            stories,
            key=lambda x: (x.get('optimization_value', 1) / max(1, x.get('story_points', 1))),
            reverse=True
        )
        sprints = defaultdict(list)
        cur_sprint = 1
        cur_load = 0
        total_val = 0

        for s in sorted_stories:
            pts = s.get('story_points', 3)
            val = s.get('optimization_value', 10)
            if cur_load + pts <= capacity:
                sprints[cur_sprint].append(s)
                cur_load += pts
                total_val += val
            else:
                cur_sprint += 1
                cur_load = pts
                sprints[cur_sprint].append(s)
                total_val += val

        return sprints, total_val

    def replan_mid_sprint(self, current_tasks, change_event):
        """
        Executes Dynamic Replanning with Blast Radius & Impact Analysis.
        Handles change_event:
            - NEW_STORY_ADDED
            - STORY_REMOVED
            - STORY_MODIFIED
            - PRIORITY_CHANGED
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        before_tasks = [dict(t) for t in current_tasks]
        before_sprint_map = {t['story_id']: t.get('sprint_number', 1) for t in before_tasks}
        before_points = sum(t.get('story_points', 0) for t in before_tasks)

        change_type = change_event.get('change_type', 'NEW_STORY_ADDED')
        target_id = change_event.get('story_id')
        
        updated_backlog = [dict(t) for t in current_tasks]

        if change_type == 'NEW_STORY_ADDED':
            # Add new story to backlog
            new_story = {
                "story_id": target_id or f"US_ALERT_{len(updated_backlog)+1}",
                "title": change_event.get('title', 'Urgent Scope Addition'),
                "description": change_event.get('description', ''),
                "priority": change_event.get('priority', 'HIGH'),
                "priority_tier": change_event.get('priority_tier', 'CRITICAL'),
                "priority_score": change_event.get('priority_score', 95),
                "confidence": change_event.get('confidence', 95.0),
                "story_points": int(change_event.get('story_points', 8)),
                "estimated_hours": int(change_event.get('story_points', 8)) * 8,
                "dependencies": change_event.get('dependencies', []),
                "reason": change_event.get('reason', 'Mid-sprint critical change request'),
                "badge_color": change_event.get('badge_color', 'rose'),
                "is_new": True
            }
            updated_backlog.insert(0, new_story)

        elif change_type == 'STORY_REMOVED':
            updated_backlog = [t for t in updated_backlog if t['story_id'] != target_id]

        elif change_type == 'STORY_MODIFIED':
            for t in updated_backlog:
                if t['story_id'] == target_id:
                    if 'story_points' in change_event:
                        t['story_points'] = int(change_event['story_points'])
                        t['estimated_hours'] = t['story_points'] * 8
                    if 'title' in change_event:
                        t['title'] = change_event['title']
                    if 'priority_tier' in change_event:
                        t['priority_tier'] = change_event['priority_tier']
                    t['is_modified'] = True

        elif change_type == 'PRIORITY_CHANGED':
            for t in updated_backlog:
                if t['story_id'] == target_id:
                    t['priority_tier'] = change_event.get('new_priority_tier', 'CRITICAL')
                    t['priority'] = 'HIGH' if t['priority_tier'] in ['CRITICAL', 'HIGH'] else 'LOW'
                    t['priority_score'] = change_event.get('priority_score', 90)
                    t['is_modified'] = True

        # Run optimization on updated backlog
        opt_res = self.optimize_allocation(updated_backlog, self.sprint_capacity)
        after_tasks = opt_res['flattened_tasks']
        after_sprint_map = {t['story_id']: t.get('sprint_number', 1) for t in after_tasks}

        # Calculate Blast Radius / Ripple Effect
        displaced_stories = []
        promoted_stories = []
        unchanged_stories = []

        for t in after_tasks:
            sid = t['story_id']
            prev_sprint = before_sprint_map.get(sid)
            new_sprint = after_sprint_map.get(sid)

            if prev_sprint is not None:
                if new_sprint > prev_sprint:
                    displaced_stories.append({
                        "story_id": sid,
                        "title": t['title'],
                        "story_points": t['story_points'],
                        "from_sprint": prev_sprint,
                        "to_sprint": new_sprint,
                        "shift": f"Shifted Sprint {prev_sprint} ➔ Sprint {new_sprint}"
                    })
                elif new_sprint < prev_sprint:
                    promoted_stories.append({
                        "story_id": sid,
                        "title": t['title'],
                        "story_points": t['story_points'],
                        "from_sprint": prev_sprint,
                        "to_sprint": new_sprint,
                        "shift": f"Promoted Sprint {prev_sprint} ➔ Sprint {new_sprint}"
                    })
                else:
                    unchanged_stories.append(sid)

        blast_radius_score = len(displaced_stories) * 2 + len(promoted_stories)
        risk_level = "LOW" if blast_radius_score <= 2 else ("MEDIUM" if blast_radius_score <= 5 else "HIGH")

        impact_summary = {
            "timestamp": timestamp,
            "change_type": change_type,
            "affected_story_id": target_id,
            "risk_level": risk_level,
            "blast_radius_score": blast_radius_score,
            "displaced_count": len(displaced_stories),
            "promoted_count": len(promoted_stories),
            "displaced_stories": displaced_stories,
            "promoted_stories": promoted_stories,
            "sprints_before": max(before_sprint_map.values()) if before_sprint_map else 0,
            "sprints_after": len(opt_res['sprints']),
            "points_before": before_points,
            "points_after": sum(t.get('story_points', 0) for t in after_tasks),
            "reallocation_reason": change_event.get('reason', 'Dynamic scope adjustment')
        }

        # Save artifacts to disk
        self._export_artifacts(after_tasks, impact_summary, change_event)

        return {
            "status": "success",
            "impact_summary": impact_summary,
            "comparison": opt_res['comparison'],
            "stats": opt_res['stats'],
            "sprints": opt_res['sprints'],
            "tasks": after_tasks
        }

    def _export_artifacts(self, tasks, impact_summary, change_event):
        """Exports updated plans and logs to CSV and JSON for Member 3 and Member 4."""
        try:
            # 1. sprint_plan_updated.csv
            df_updated = pd.DataFrame([
                {
                    "sprint_number": t.get('sprint_number', 1),
                    "story_id": t.get('story_id'),
                    "title": t.get('title'),
                    "priority": t.get('priority', 'HIGH'),
                    "priority_tier": t.get('priority_tier', 'HIGH'),
                    "story_points": t.get('story_points', 5),
                    "estimated_hours": t.get('estimated_hours', 40),
                    "dependencies": ",".join(t.get('dependencies', []))
                }
                for t in tasks
            ])
            df_updated.to_csv(os.path.join(BASE_DIR, "sprint_plan_updated.csv"), index=False, encoding='utf-8')

            # 2. output_for_member3.csv (Standard integration contract)
            df_member3 = df_updated.copy()
            df_member3["sprint_length_days"] = self.sprint_length_days
            df_member3["team_size"] = self.team_size
            df_member3.to_csv(os.path.join(BASE_DIR, "output_for_member3.csv"), index=False, encoding='utf-8')

            # 3. replanning_log.json
            log_data = {
                "timestamp": impact_summary['timestamp'],
                "change_event": change_event,
                "impact_summary": impact_summary
            }
            with open(os.path.join(BASE_DIR, "replanning_log.json"), "w", encoding='utf-8') as f:
                json.dump(log_data, f, indent=2)

            print("[OK] Replanning artifacts exported successfully (CSV & JSON).")
        except Exception as e:
            print(f"[WARN] Error exporting replanning artifacts: {e}")

# Global Optimizer Singleton
sprint_optimizer = SprintOptimizer(sprint_capacity=30, sprint_length_days=14, team_size=5)

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING SPRINT OPTIMIZER & REPLANNING ENGINE")
    print("=" * 60)

    sample_stories = [
        {"story_id": "US001", "title": "Fix critical security vulnerability in login system", "priority_tier": "CRITICAL", "priority_score": 98, "confidence": 98.0, "story_points": 8, "dependencies": []},
        {"story_id": "US004", "title": "Payment gateway crashes on checkout", "priority_tier": "CRITICAL", "priority_score": 97, "confidence": 97.0, "story_points": 13, "dependencies": []},
        {"story_id": "US008", "title": "Database connection timeout under heavy load", "priority_tier": "HIGH", "priority_score": 88, "confidence": 88.0, "story_points": 8, "dependencies": []},
        {"story_id": "US002", "title": "Add export to PDF feature for reports", "priority_tier": "MEDIUM", "priority_score": 45, "confidence": 65.0, "story_points": 5, "dependencies": ["US008"]},
        {"story_id": "US005", "title": "Add search filter to user management", "priority_tier": "MEDIUM", "priority_score": 42, "confidence": 62.0, "story_points": 5, "dependencies": ["US008"]},
        {"story_id": "US010", "title": "Add two factor authentication for admin users", "priority_tier": "HIGH", "priority_score": 85, "confidence": 85.0, "story_points": 8, "dependencies": ["US001"]},
        {"story_id": "US003", "title": "Update color scheme on dashboard page", "priority_tier": "LOW", "priority_score": 20, "confidence": 90.0, "story_points": 2, "dependencies": []},
        {"story_id": "US006", "title": "Fix broken email notifications", "priority_tier": "MEDIUM", "priority_score": 50, "confidence": 75.0, "story_points": 3, "dependencies": []},
        {"story_id": "US007", "title": "Add dark mode toggle to settings", "priority_tier": "LOW", "priority_score": 18, "confidence": 92.0, "story_points": 3, "dependencies": []},
        {"story_id": "US009", "title": "Update help documentation links", "priority_tier": "LOW", "priority_score": 15, "confidence": 95.0, "story_points": 1, "dependencies": []},
    ]

    print("\n[TEST 1] Running 0/1 Knapsack Optimal Allocation:")
    res = sprint_optimizer.optimize_allocation(sample_stories, capacity=30)
    for s_num, s_list in res['sprints'].items():
        pts = sum(s['story_points'] for s in s_list)
        val = sum(s['optimization_value'] for s in s_list)
        print(f"\n📅 Sprint {s_num} ({pts}/30 pts | Total Value: {val:.1f}):")
        for s in s_list:
            deps_str = f" [Deps: {','.join(s['dependencies'])}]" if s.get('dependencies') else ""
            print(f"  - [{s['priority_tier']:<8}] {s['story_id']}: {s['title'][:40]} ({s['story_points']} pts){deps_str}")

    print("\nComparison vs Greedy:")
    print(json.dumps(res['comparison'], indent=2))

    print("\n[TEST 2] Testing Dynamic Replanning Event (New Urgent Bug US011):")
    change = {
        "change_type": "NEW_STORY_ADDED",
        "story_id": "US011",
        "title": "Critical data corruption during bulk user import",
        "priority_tier": "CRITICAL",
        "priority_score": 99,
        "confidence": 99.0,
        "story_points": 13,
        "reason": "Production emergency data corruption bug"
    }
    replan_res = sprint_optimizer.replan_mid_sprint(sample_stories, change)
    print("\nBlast Radius Summary:")
    print(json.dumps(replan_res['impact_summary'], indent=2))
