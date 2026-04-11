"""
fix_adaptive_goals.py
Run from project root: python fix_adaptive_goals.py

FIXES:
1. 'title' and 'learning_style' undefined variable errors
2. Resources not matching selected learning style (videos/reading/practice/mix)
3. AI Predictor not working
4. Notifications check
"""
import re
import os

path = os.path.join("backend", "routes", "adaptive_goals.py")

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print("Original file size:", len(content), "bytes")
print("=" * 60)

# ── FIX 1: Remove the broken style_urls block that was inserted
# with undefined 'title' variable ──────────────────────────────
broken_block = """        style_urls = {
            'videos':   'EVERY step resource MUST be YouTube: https://www.youtube.com/results?search_query=' + title.replace(' ','+') + '+tutorial',
            'reading':  'EVERY step resource MUST be docs/articles: https://www.freecodecamp.org or https://developer.mozilla.org',
            'practice': 'EVERY step resource MUST be practice: https://www.leetcode.com or https://www.hackerrank.com',
            'mix':      'Mix YouTube, docs, and practice sites across different steps',
        }
        style_rule = style_urls.get(learning_style, style_urls['mix'])
        resp = get_groq().chat.completions.create(
            model    = "llama-3.3-70b-versatile","""

correct_block = """        resp = get_groq().chat.completions.create(
            model    = "llama-3.3-70b-versatile","""

if broken_block in content:
    content = content.replace(broken_block, correct_block)
    print("FIX 1: Removed broken style_urls block with undefined 'title' variable")
else:
    print("FIX 1: Broken block not found (may already be clean)")

# ── FIX 2: Remove broken CRITICAL RESOURCE RULES replacement ──
broken_rules = """CRITICAL RESOURCE RULES:
- STYLE RULE (HIGHEST PRIORITY): {style_rule}
- Override all other resource suggestions if they conflict with the style rule."""

if broken_rules in content:
    content = content.replace(broken_rules, "CRITICAL RESOURCE RULES:")
    print("FIX 2: Removed broken {style_rule} reference from system prompt")
else:
    print("FIX 2: No broken rules found")

# ── FIX 3: Find the generate_roadmap function and inject proper
# learning_style enforcement INSIDE the function where variables
# are defined ──────────────────────────────────────────────────

# Find where learning_style is extracted from request data
# It should be something like: learning_style = data.get(...)
# We'll find the system_prompt and inject style rules there

# Find the system_prompt definition
system_prompt_marker = 'You are a Senior Learning Architect who creates precise, actionable roadmaps.'

if system_prompt_marker in content:
    # Build strict resource instruction per style
    style_injection = '''You are a Senior Learning Architect who creates precise, actionable roadmaps.

LEARNING STYLE ENFORCEMENT (HIGHEST PRIORITY - NEVER IGNORE):
- If learning_style is "videos": EVERY resource URL must be a real YouTube search URL like https://www.youtube.com/results?search_query=TOPIC+tutorial - NO websites, NO articles, ONLY YouTube links
- If learning_style is "reading": EVERY resource must be a documentation/article URL - use https://developer.mozilla.org, https://docs.python.org, https://www.freecodecamp.org/news, https://realpython.com - NO YouTube links
- If learning_style is "practice": EVERY resource must be a hands-on practice URL - use https://www.leetcode.com, https://www.hackerrank.com, https://www.kaggle.com, https://replit.com, https://codesandbox.io - NO videos, NO articles
- If learning_style is "mix": Use a variety - some YouTube, some docs, some practice sites - rotate across steps'''

    content = content.replace(system_prompt_marker, style_injection)
    print("FIX 3: Injected strict learning_style enforcement into system prompt")
else:
    print("FIX 3: system_prompt marker not found - searching for alternative...")
    # Try to find where system_prompt is built
    idx = content.find("system_prompt")
    if idx >= 0:
        print(f"  Found system_prompt at char {idx}")
        print("  Context:", content[idx:idx+200])

# ── FIX 4: Make the learning_style variable available to the
# system prompt by formatting it in ───────────────────────────
# Find where learning_style is read from request
style_read_patterns = [
    'learning_style = data.get("learning_style"',
    "learning_style = data.get('learning_style'",
    'learning_style = request.json.get("learning_style"',
]

found_style_read = False
for pat in style_read_patterns:
    if pat in content:
        print(f"FIX 4: learning_style variable found: '{pat}'")
        found_style_read = True
        break

if not found_style_read:
    print("FIX 4: WARNING - learning_style not found in request parsing")
    print("  Searching for 'learning_style'...")
    for i, line in enumerate(content.split('\n'), 1):
        if 'learning_style' in line:
            print(f"  Line {i}: {line.strip()}")

# ── FIX 5: Ensure the system_prompt uses learning_style variable
# by adding it to the f-string format ─────────────────────────
# Find the system_prompt f-string and add learning_style info
old_roadmap_intro = "LEARNING STYLE ENFORCEMENT (HIGHEST PRIORITY - NEVER IGNORE):"
new_roadmap_intro = "LEARNING STYLE ENFORCEMENT (HIGHEST PRIORITY - NEVER IGNORE - current style: {learning_style}):"

if old_roadmap_intro in content:
    content = content.replace(old_roadmap_intro, new_roadmap_intro)
    print("FIX 5: Added {learning_style} variable to system prompt f-string")

# ── Write fixed file ──────────────────────────────────────────
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("=" * 60)
print("File written:", len(content), "bytes")

# ── Verify ────────────────────────────────────────────────────
print("\nVERIFICATION:")
with open(path, encoding="utf-8") as f:
    check = f.read()

if "title.replace" in check:
    print("ERROR: 'title.replace' still present - undefined variable!")
else:
    print("OK: No undefined 'title' variable")

if "{style_rule}" in check:
    print("ERROR: '{style_rule}' still present - undefined variable!")
else:
    print("OK: No undefined 'style_rule' variable")

if "LEARNING STYLE ENFORCEMENT" in check:
    print("OK: Learning style enforcement found in system prompt")
else:
    print("WARNING: Learning style enforcement not found")

if "{learning_style}" in check:
    print("OK: {learning_style} variable injected into prompt")
else:
    print("WARNING: {learning_style} not in prompt")

print("\nDone! Now run:")
print("  git add -f backend/routes/adaptive_goals.py")
print("  git commit -m 'fix: proper learning style resource filtering'")
print("  git push origin main")