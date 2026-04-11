with open('frontend/src/pages/Journal.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

replacements = {
    'Γ£ì∩╕Å': '✍️',
    '≡ƒöÆ': '🔒',
    'ΓÇö': '—',
    '≡ƒîƒ': '🌟',
    '≡ƒÿè': '😊',
    '≡ƒÿÉ': '😐',
    '≡ƒÿö': '😔',
    '≡ƒÿ░': '😰',
    '≡ƒÖÅ': '🙏',
    '≡ƒÿñ': '😤',
    'ΓÜí': '⚡',
    'Γùï': '○',
    '≡ƒùæ': '🗑',
    'Γåô': '↓',
    'Γåæ': '↑',
    '≡ƒÆí': '💡',
    '≡ƒöì': '🔍',
    '≡ƒöÑ': '🔥',
    '≡ƒÆ¬': '💪',
    '≡ƒôû': '📖',
    '┬╖': '·',
    '├ù': '×',
    'Γ£Å∩╕Å': '✅',
    'Γ£ô': '✓',
}

for bad, good in replacements.items():
    content = content.replace(bad, good)

# Fix toIST and formatTime functions
old_toIST = '''function toIST(iso) {

  if (!iso) return new Date();

  // Backend stores UTC. Add IST offset for display.

  return new Date(new Date(iso).getTime() + 330 * 60000);

}'''

new_toIST = '''function toIST(iso) {
  if (!iso) return new Date();
  var s = (iso + "").replace(" ", "T");
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  var d = new Date(s);
  return isNaN(d) ? new Date() : new Date(d.getTime() + 330 * 60000);
}'''

content = content.replace(old_toIST, new_toIST)

# Fix MoodStreak forEach
old2 = '    var raw1 = e.created_at ? (e.created_at+"").replace(" ","T") : null; if(raw1 && !raw1.endsWith("Z") && !raw1.includes("+")) raw1+="Z"; var dt = raw1 ? new Date(raw1) : new Date(); var d = isNaN(dt) ? "" : new Date(dt.getTime() + IST_MS).toISOString().slice(0,10);'
new2 = '    var raw = (e.created_at + "").replace(" ", "T"); if (!raw.endsWith("Z") && !raw.includes("+")) raw += "Z"; var dt = new Date(raw); if (isNaN(dt)) return; var d = new Date(dt.getTime() + IST_MS).toISOString().slice(0, 10);'
content = content.replace(old2, new2)

with open('frontend/src/pages/Journal.jsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('Done!')