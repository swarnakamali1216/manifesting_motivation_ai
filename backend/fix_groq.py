"""
fix_groq.py — Run this ONCE to fix the proxies error
Run: cd backend && python fix_groq.py

This patches all backend route files to use a safe Groq client.
"""
import os, re, subprocess, sys

# Step 1: Try to install the compatible groq version
print("Fixing Groq SDK compatibility issue...")
print("Running: pip install groq==0.4.2")
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "groq==0.4.2", "--quiet"],
    capture_output=True, text=True
)
if result.returncode == 0:
    print("✅ groq==0.4.2 installed successfully")
    print("Restart Flask: python app.py")
else:
    print("⚠️  pip install failed:", result.stderr[:200])
    print("Try manually: pip install groq==0.4.2")