import os

# ── Config ────────────────────────────────────────────────────
path = os.path.join("backend", "routes", "goals.py")

# ── Read current file ─────────────────────────────────────────
if not os.path.exists(path):
    print(f"❌ File not found: {path}")
    print("   Make sure you run this script from your project ROOT folder")
    print("   (the folder that contains the 'backend' folder)")
    exit(1)

with open(path, encoding="utf-8") as f:
    content = f.read()

print(f"📄 Read {len(content.splitlines())} lines from {path}")

# ── Try several possible marker formats ───────────────────────
markers = [
    "\n\n# ── GET /predict/<user_id> ────────────────────────────────────",
    "\n# ── GET /predict/<user_id> ────────────────────────────────────",
    "# ── GET /predict/<user_id>",
    "@goals_bp.route(\"/predict/<int:user_id>\"",
    "@goals_bp.route('/predict/<int:user_id>'",
]

found_marker = None
for m in markers:
    if m in content:
        found_marker = m
        break

if found_marker:
    cut_index = content.index(found_marker)
    new_content = content[:cut_index].rstrip() + "\n"

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ Duplicate predict route removed!")
    print(f"   File is now {len(new_content.splitlines())} lines (was {len(content.splitlines())})")
    print(f"\n📋 Last 5 lines of cleaned file:")
    for line in new_content.strip().split("\n")[-5:]:
        print("   " + line)

    print("\n🚀 Now run:")
    print('   git add backend/routes/goals.py')
    print('   git commit -m "fix: remove duplicate predict route from goals.py"')
    print('   git push origin main')

else:
    print("❌ Could not find the duplicate predict route automatically.")
    print("\n🔍 Searching for any /predict route in goals.py...")

    for i, line in enumerate(content.splitlines(), 1):
        if "predict" in line.lower():
            print(f"   Line {i}: {line}")

    print("\n👉 Manual fix:")
    print("   Open backend/routes/goals.py")
    print("   Scroll to the bottom")
    print("   Delete the entire function that starts with:")
    print('   @goals_bp.route("/predict/<int:user_id>", methods=["GET"])')
    print("   Delete from that line all the way to the end of the file")