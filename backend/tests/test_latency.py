import time, requests

# Make sure your Flask app is running first!
BASE_URL = "http://localhost:5000"

prompts = [
    "I feel unmotivated today",
    "help me stay focused",
    "I'm stressed about my goals"
] * 10  # 30 total requests

latencies = []
for prompt in prompts:
    start = time.time()
    requests.post(f"{BASE_URL}/api/chat", json={"message": prompt})
    latencies.append(time.time() - start)

print(f"Average: {sum(latencies)/len(latencies):.2f}s")
print(f"Min: {min(latencies):.2f}s")
print(f"Max: {max(latencies):.2f}s")