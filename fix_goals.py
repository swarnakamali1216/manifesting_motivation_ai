with open('backend/routes/adaptive_goals.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Add strict resource style instruction before system_prompt
old = "        resp = get_groq().chat.completions.create(\n            model    = \"llama-3.3-70b-versatile\","
new = """        style_urls = {
            'videos':   'EVERY step resource MUST be YouTube: https://www.youtube.com/results?search_query=' + title.replace(' ','+') + '+tutorial',
            'reading':  'EVERY step resource MUST be docs/articles: https://www.freecodecamp.org or https://developer.mozilla.org',
            'practice': 'EVERY step resource MUST be practice: https://www.leetcode.com or https://www.hackerrank.com',
            'mix':      'Mix YouTube, docs, and practice sites across different steps',
        }
        style_rule = style_urls.get(learning_style, style_urls['mix'])

        resp = get_groq().chat.completions.create(
            model    = "llama-3.3-70b-versatile","""

content = content.replace(old, new)

# Fix system prompt to include style rule
old2 = 'CRITICAL RESOURCE RULES:'
new2 = 'CRITICAL RESOURCE RULES:\n- STYLE RULE (HIGHEST PRIORITY): {style_rule}\n- Override all other resource suggestions if they conflict with the style rule.'
content = content.replace(old2, new2)

with open('backend/routes/adaptive_goals.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')