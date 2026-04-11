"""
check_all.py - Run from project root
Checks: adaptive_goals.py state, notifications, predictor
"""
import os

# ── Check adaptive_goals.py current state ──────────────────────
path = os.path.join("backend", "routes", "adaptive_goals.py")
print("=" * 60)
print("CHECKING adaptive_goals.py")
print("=" * 60)

with open(path, encoding="utf-8") as f:
    content = f.read()
    lines = content.split("\n")

print(f"Total lines: {len(lines)}")

issues = []
if "title.replace" in content:
    issues.append("ERROR: 'title' undefined variable still present")
if "{style_rule}" in content:
    issues.append("ERROR: 'style_rule' undefined variable still present")
if "learning_style" not in content:
    issues.append("ERROR: 'learning_style' not found at all")
if "LEARNING STYLE" not in content and "learning_style" in content:
    issues.append("WARNING: No strict learning style enforcement in prompt")

if issues:
    print("\nISSUES FOUND:")
    for iss in issues:
        print(" ", iss)
else:
    print("\nNo issues found in adaptive_goals.py")

# Show lines around learning_style usage
print("\nlearning_style lines:")
for i, line in enumerate(lines, 1):
    if "learning_style" in line:
        print(f"  {i}: {line.strip()}")

# Show system_prompt context
print("\nSystem prompt context (first 20 lines after 'system_prompt ='):")
for i, line in enumerate(lines, 1):
    if "system_prompt" in line and "=" in line:
        for j in range(i, min(i+20, len(lines))):
            print(f"  {j}: {lines[j-1]}")
        break

# ── Check if predictor route exists ──────────────────────────
pred_path = os.path.join("backend", "routes", "predictor.py")
print("\n" + "=" * 60)
print("CHECKING predictor.py")
print("=" * 60)

if os.path.exists(pred_path):
    with open(pred_path, encoding="utf-8") as f:
        pred = f.read()
    print(f"File exists: {len(pred)} bytes")
    # Find route definitions
    for i, line in enumerate(pred.split("\n"), 1):
        if "@" in line and "route" in line.lower():
            print(f"  Route line {i}: {line.strip()}")
    # Check what query it uses for predictions
    if "completed" in pred:
        print("  OK: References 'completed' field")
    if "goal_steps" in pred or "goals" in pred:
        print("  OK: References goals table")
else:
    print("ERROR: predictor.py not found!")

# ── Check notification backend route ─────────────────────────
notif_files = ["checkin.py", "gamification.py", "motivation.py"]
print("\n" + "=" * 60)
print("CHECKING notification-related routes")
print("=" * 60)
for nf in notif_files:
    fp = os.path.join("backend", "routes", nf)
    if os.path.exists(fp):
        with open(fp, encoding="utf-8") as f:
            nc = f.read()
        routes = [l.strip() for l in nc.split("\n") if "@" in l and "route" in l]
        print(f"\n{nf} routes:")
        for r in routes:
            print(f"  {r}")
    else:
        print(f"\n{nf}: NOT FOUND")

print("\n" + "=" * 60)
print("DONE - share this output")
print("=" * 60)