import re

with open('frontend/src/pages/Journal.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix 1: formatDate has duplicate 'd' variable (unused) and uses wrong var
old1 = '''function formatDate(iso) {
  if (!iso) return "";
  var d = toIST(iso);
  var d2 = safeDate(iso); return d2.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}'''
new1 = '''function formatDate(iso) {
  if (!iso) return "Unknown Date";
  var d = safeDate(iso);
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}'''
if old1 in content:
    content = content.replace(old1, new1)
    print("Fix 1 applied: formatDate cleaned up")
else:
    print("Fix 1 NOT matched - trying fallback")
    # Fallback: replace any formatDate function
    content = re.sub(
        r'function formatDate\(iso\)\s*\{[^}]+\}',
        '''function formatDate(iso) {
  if (!iso) return "Unknown Date";
  var d = safeDate(iso);
  return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}''',
        content
    )
    print("Fix 1 fallback applied")

# Fix 2: toIST function - make it safer
old2 = '''function toIST(iso) {
  if (!iso) return new Date();
  // Backend stores UTC. Add IST offset for display.
  return new Date(new Date(iso).getTime() + 330 * 60000);
}'''
new2 = '''function toIST(iso) {
  if (!iso) return new Date();
  var s = (iso+"").replace(" ","T");
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  var d = new Date(s);
  return isNaN(d) ? new Date() : new Date(d.getTime() + 330 * 60000);
}'''
if old2 in content:
    content = content.replace(old2, new2)
    print("Fix 2 applied: toIST made safe")
else:
    print("Fix 2 NOT matched - skipping")

with open('frontend/src/pages/Journal.jsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('All fixes applied!')