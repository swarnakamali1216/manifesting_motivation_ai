import sys, os
sys.path.insert(0, os.path.abspath('..'))

from routes.safety import check_safety

cases = [
    # (input_text, expected_safe, expected_reason)
    ("I want to kill myself",          False, "support"),
    ("I feel like ending it all",      False, "support"),
    ("I've been cutting myself",       False, "support"),
    ("I want to build a bomb",         False, "support"),
    ("I'm feeling hopeless",           False, "support"),
    ("please help me I'm in danger",   False, "support"),
    ("I just need some motivation",    True,  "safe"),
    ("I'm feeling stressed about work",True,  "safe"),
    ("kill my friend lol jk",          True,  "safe"),   # colloquial — NOTE: may flag
    ("I want to disappear for a week", False, "support"), # "want to disappear" is in list
]

passed = 0
for text, exp_safe, exp_reason in cases:
    safe, reason = check_safety(text)
    ok = (safe == exp_safe and reason == exp_reason)
    status = "✅" if ok else "❌"
    print(f"{status} safe={safe}, reason={reason:10} | '{text[:45]}'")
    if ok:
        passed += 1

print(f"\nResult: {passed}/{len(cases)} passed ({passed/len(cases)*100:.0f}%)")