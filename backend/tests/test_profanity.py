import sys, os
sys.path.insert(0, os.path.abspath('..'))
from routes.safety import check_safety

cases = [
    # (text, expected_safe)
    ("what the fuck",           False),
    ("this is bullshit",        False),
    ("you're an asshole",       False),
    ("sh*t I forgot my goal",   False),
    ("I need help with my goal",True),
    ("let's get started today", True),
    ("I'm feeling great",       True),
]

passed = 0
for text, exp_safe in cases:
    safe, reason = check_safety(text)
    ok = (safe == exp_safe)
    print(f"{'✅' if ok else '❌'} safe={safe}, reason={reason:10} | '{text}'")
    if ok: passed += 1

print(f"\nResult: {passed}/{len(cases)} passed ({passed/len(cases)*100:.0f}%)")