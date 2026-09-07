import os

log_path = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\logs\transcript.jsonl"
if os.path.exists(log_path):
    print("Log file exists. Searching...")
    with open(log_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if "optim" in line or "route opt" in line:
                print(f"Line {i+1}: {line[:300]}...")
else:
    print("Log file not found at", log_path)
