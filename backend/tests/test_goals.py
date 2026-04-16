import sys
import os
sys.path.insert(0, os.path.abspath('..'))
import unittest.mock as mock
sys.modules['models'] = mock.MagicMock()

from routes.adaptive_goals import calculate_num_steps

# Use EXACT key names with spaces (matching TIMELINE_DAYS and DAILY_MINS)
test_cases = [
    ("3 days",   "15 mins",  "light"),
    ("1 week",   "30 mins",  "moderate"),
    ("1 month",  "1 hour",   "moderate"),
    ("6 months", "1 hour",   "moderate"),
    ("1 year",   "2+ hours", "deep"),
]

print("Goal Step Calculations:")
for timeline, daily_time, depth in test_cases:
    steps = calculate_num_steps(timeline, daily_time, depth)
    print(f"  {timeline:10} + {daily_time:8} + {depth:10} → {steps} steps")