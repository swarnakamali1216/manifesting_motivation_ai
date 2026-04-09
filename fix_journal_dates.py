import re

with open('frontend/src/pages/Journal.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix 1: Line 121 - safe date parsing
old1 = 'var dt = new Date(e.created_at); var d = isNaN(dt) ? "" : new Date(dt.getTime() + IST_MS).toISOString().slice(0,10);'
new1 = 'var raw1 = e.created_at ? (e.created_at+"").replace(" ","T") : null; if(raw1 && !raw1.endsWith("Z") && !raw1.includes("+")) raw1+="Z"; var dt = raw1 ? new Date(raw1) : new Date(); var d = isNaN(dt) ? "" : new Date(dt.getTime() + IST_MS).toISOString().slice(0,10);'
content = content.replace(old1, new1)

# Fix 2: Line 795 - crashes when created_at is null
old2 = 'var ts = new Date(e.created_at.replace(" ", "T") + (e.created_at.includes("T") ? "" : "Z")).getTime();'
new2 = 'var raw2 = e.created_at ? (e.created_at+"").replace(" ","T") : new Date().toISOString(); if(!raw2.endsWith("Z") && !raw2.includes("+")) raw2+="Z"; var ts = new Date(raw2).getTime(); if(isNaN(ts)) ts = Date.now();'
content = content.replace(old2, new2)

# Fix 3: Line 813 - crashes when created_at is null
old3 = '? new Date(e.created_at.replace(" ","T") + (e.created_at.includes("T") ? "" : "Z")).getTime() + IST_GRP'
new3 = '? (()=>{ var raw3 = e.created_at ? (e.created_at+"").replace(" ","T") : new Date().toISOString(); if(!raw3.endsWith("Z") && !raw3.includes("+")) raw3+="Z"; var t=new Date(raw3).getTime(); return (isNaN(t)?Date.now():t)+IST_GRP; })()'
content = content.replace(old3, new3)

# Fix 4: Line 757 - safe sort
old4 = 'var da = new Date(a.created_at), db = new Date(b.created_at);'
new4 = 'var da = a.created_at ? new Date((a.created_at+"").replace(" ","T")) : new Date(0); var db = b.created_at ? new Date((b.created_at+"").replace(" ","T")) : new Date(0);'
content = content.replace(old4, new4)

# Fix 5: formatDate function - safe handling
old5 = 'function formatDate(iso) {'
new5 = '''function safeDate(iso) {
  if (!iso) return new Date();
  var s = (iso+"").replace(" ","T");
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  var d = new Date(s);
  return isNaN(d) ? new Date() : d;
}
function formatDate(iso) {'''
content = content.replace(old5, new5)

# Fix 6: Replace formatDate internals to use safeDate
content = content.replace(
    'return d.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });',
    'var d2 = safeDate(iso); return d2.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });'
)

with open('frontend/src/pages/Journal.jsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('All date fixes applied!')