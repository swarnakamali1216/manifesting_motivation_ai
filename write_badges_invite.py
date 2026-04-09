import re

with open('frontend/src/pages/Badges.jsx', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Step 1: Add emailjs import if not already there
if '@emailjs/browser' not in content:
    content = content.replace(
        'import axios from "axios";',
        'import axios from "axios";\nimport emailjs from "@emailjs/browser";',
        1
    )
    print("Added emailjs import")
else:
    print("emailjs import already exists")

# Step 2: Replace the entire sendInviteEmail async function with EmailJS version
# Find the function start
old_comment = '// ── REAL email sending via backend ────────────────────────────────────────'

new_send_func = '''// ── Email sending via EmailJS (no backend needed) ──────────────────────────
  function sendInviteEmail(e) {
    if (e && e.preventDefault) e.preventDefault();
    var trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setResult({ success:false, message:"Please enter a valid email address." });
      return;
    }
    setSending(true);
    setResult(null);

    var serviceId  = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    var templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    var publicKey  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    emailjs.send(
      serviceId,
      templateId,
      {
        sender_name: user && user.name ? user.name : "A friend",
        invite_url:  inviteLink,
        to_email:    trimmed,
      },
      publicKey
    )
    .then(function() {
      setResult({
        success: true,
        message: "Invite sent to " + trimmed + "! You will earn +50 XP when they join.",
        email_sent: true,
      });
      setEmail("");
      // Refresh invite stats
      axios.get(API+"/invite/stats/"+user.id).then(function(r){ setIStats(r.data||{}); }).catch(function(){});
    })
    .catch(function(err) {
      console.error("[EmailJS] Error:", err);
      setResult({
        success: false,
        message: "Failed to send: " + (err && err.text ? err.text : "Check EmailJS dashboard"),
      });
    })
    .finally(function(){ setSending(false); });
  }'''

# Find and replace the old async sendInviteEmail function
# Match from the comment to the closing of the function
pattern = r'// ── REAL email sending via backend ─+\s*async function sendInviteEmail\(e\) \{.*?\n  \}'
match = re.search(pattern, content, re.DOTALL)

if match:
    content = content[:match.start()] + new_send_func + content[match.end():]
    print("Replaced sendInviteEmail function successfully")
else:
    # Try simpler match
    pattern2 = r'// ── REAL email sending via backend[^\n]*\n  async function sendInviteEmail'
    match2 = re.search(pattern2, content)
    if match2:
        # Find the function end by counting braces
        start = match2.start()
        # Find 'async function sendInviteEmail'
        func_start = content.find('async function sendInviteEmail', start)
        # Count braces to find end
        brace_count = 0
        i = func_start
        func_body_started = False
        while i < len(content):
            if content[i] == '{':
                brace_count += 1
                func_body_started = True
            elif content[i] == '}':
                brace_count -= 1
                if func_body_started and brace_count == 0:
                    end = i + 1
                    break
            i += 1
        content = content[:start] + new_send_func + content[end:]
        print("Replaced sendInviteEmail function (method 2)")
    else:
        print("WARNING: Could not find sendInviteEmail function - check manually")
        print("Searching for 'async function sendInviteEmail'...")
        idx = content.find('async function sendInviteEmail')
        if idx >= 0:
            print("Found at char:", idx)
            print("Context:", content[idx-100:idx+200])

# Step 3: Write the fixed file
with open('frontend/src/pages/Badges.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! Verifying fix...")
with open('frontend/src/pages/Badges.jsx', encoding='utf-8') as f:
    result = f.read()

if 'emailjs.send' in result:
    print("SUCCESS: EmailJS send found in Badges.jsx")
else:
    print("ERROR: emailjs.send NOT found - fix may have failed")

if 'axios.post' in result and 'invite/send' in result:
    print("WARNING: Old axios.post to invite/send still present!")
else:
    print("SUCCESS: Old backend invite/send call removed")