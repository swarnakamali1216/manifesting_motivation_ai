
target = (
    '        <div style={{fontSize:"11px",color:"var(--muted)",'
    'marginBottom:"8px",lineHeight:"1.5"}}>\n'
    "          Your app sends the email from the Manifesting Motivation account, but says it's from you.\n"
    '        </div>'
)

with open('frontend/src/pages/Badges.jsx', encoding='utf-8') as f:
    c = f.read()

if target in c:
    c = c.replace(target, '')
    with open('frontend/src/pages/Badges.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('Removed successfully')
else:
    print('Not found — may already be removed')