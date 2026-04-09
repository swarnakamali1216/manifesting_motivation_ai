with open('frontend/src/pages/Journal.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix the broken formatDate with stray });
old = '''function formatDate(iso) {
  if (!iso) return "Unknown Date";
  var d = safeDate(iso);
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
});

}'''

new = '''function formatDate(iso) {
  if (!iso) return "Unknown Date";
  var d = safeDate(iso);
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}'''

if old in content:
    content = content.replace(old, new)
    print("Fixed: removed stray });")
else:
    print("Pattern not found - trying regex")
    import re
    content = re.sub(
        r'(function formatDate\(iso\) \{.*?toLocaleDateString[^\n]+\n)\}\);\s*\n\s*\}',
        r'\1}',
        content,
        flags=re.DOTALL
    )
    print("Regex fix applied")

with open('frontend/src/pages/Journal.jsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Done!")