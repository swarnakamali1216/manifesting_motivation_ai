import sys
sys.path.insert(0, '..')
from sentiment import detect_emotion

test_cases = [
    ("I'm so pumped let's go!",        "excited"),
    ("feeling okay I guess",           "neutral"),
    ("bit stressed about exams",       "stressed"),
    ("I feel hopeful today",           "hopeful"),
    ("totally focused on work",        "focused"),
    ("feeling really sad today",       "sad"),
    ("I completed my first ML model!", "excited"),
    ("I give up, nothing works",       "sad"),
    ("so annoyed, fed up with this",   "stressed"),
    ("give me a roadmap to learn AI",  "focused"),
]

correct = 0
for text, expected in test_cases:
    result = detect_emotion(text)
    predicted = result["emotion"]
    match = "✅" if predicted == expected else "❌"
    print(f"{match} Expected: {expected:10} | Got: {predicted:10} | '{text}'")
    if predicted == expected:
        correct += 1

print(f"\nAccuracy: {correct}/{len(test_cases)} = {correct/len(test_cases)*100:.1f}%")