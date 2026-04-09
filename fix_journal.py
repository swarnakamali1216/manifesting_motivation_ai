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

old = 'var ts = new Date(e.created_at.replace(" ","T") + (e.created_at.includes("T") ? "" : "Z")).getTime();'
new = 'var raw = (e.created_at + "").replace(" ","T"); if (!raw.endsWith("Z") && !raw.includes("+")) raw += "Z"; var ts = new Date(raw).getTime();'
content = content.replace(old, new)

with open('frontend/src/pages/Journal.jsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('Done!')