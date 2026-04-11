"""
final_fix_goals.py - Run from project root
Removes the remaining broken style_urls block with undefined 'title' variable
"""
import re
import os

path = os.path.join("backend", "routes", "adaptive_goals.py")

with open(path, encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find and show all lines with 'title.replace' or 'style_urls' or 'style_rule'
print("\nProblematic lines:")
for i, line in enumerate(lines, 1):
    if any(x in line for x in ["title.replace", "style_urls", "style_rule"]):
        print(f"  {i}: {line.rstrip()}")

# Remove the entire broken style_urls block
# It looks like:
#         style_urls = {
#             'videos':   '... title.replace ...',
#             ...
#         }
#         style_rule = style_urls.get(learning_style, style_urls['mix'])

new_lines = []
skip = False
i = 0
removed_count = 0

while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    # Detect start of broken block
    if "style_urls = {" in line:
        skip = True
        removed_count += 1
        print(f"  Removing block starting at line {i+1}: {line.rstrip()}")
        i += 1
        continue

    # Detect end of broken block (the .get line after the closing })
    if skip:
        removed_count += 1
        # End when we hit the style_rule = line
        if "style_rule = style_urls.get" in line:
            skip = False
            print(f"  Block ended at line {i+1}: {line.rstrip()}")
        i += 1
        continue

    # Also remove any standalone style_rule references
    if "style_rule" in line and "style_urls" not in line and "STYLE RULE" not in line:
        print(f"  Removing standalone style_rule at line {i+1}: {line.rstrip()}")
        removed_count += 1
        i += 1
        continue

    new_lines.append(line)
    i += 1

print(f"\nRemoved {removed_count} lines")
print(f"New total: {len(new_lines)} lines")

# Write fixed file
with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

# Verify
with open(path, encoding="utf-8") as f:
    result = f.read()

print("\nVERIFICATION:")
if "title.replace" in result:
    print("ERROR: title.replace still present!")
    # Show where
    for i, line in enumerate(result.split("\n"), 1):
        if "title.replace" in line:
            print(f"  Line {i}: {line.strip()}")
else:
    print("OK: No undefined 'title' variable")

if "style_rule" in result:
    print("WARNING: style_rule still present - checking context...")
    for i, line in enumerate(result.split("\n"), 1):
        if "style_rule" in line:
            print(f"  Line {i}: {line.strip()}")
else:
    print("OK: No undefined 'style_rule' variable")

if "LEARNING STYLE ENFORCEMENT" in result:
    print("OK: Strict learning style rules in system prompt")

if "{learning_style}" in result:
    print("OK: {learning_style} variable in prompt")

# Show the system prompt section to confirm it looks right
print("\nSystem prompt (first 30 lines):")
in_prompt = False
count = 0
for i, line in enumerate(result.split("\n"), 1):
    if "system_prompt" in line and "=" in line:
        in_prompt = True
    if in_prompt:
        print(f"  {i}: {line}")
        count += 1
        if count > 30:
            break

print("\nDone! Run:")
print("  git add -f backend/routes/adaptive_goals.py")
print("  git commit -m 'fix: remove undefined title/style_rule variables'")
print("  git push origin main")