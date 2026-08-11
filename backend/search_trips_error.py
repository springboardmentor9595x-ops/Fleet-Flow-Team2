import os

LOG_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\tasks\task-2437.log"

def search():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    print(f"Total lines: {len(lines)}")
    # Find all lines containing "trips" or "maintenance" or "500"
    matches = []
    for line_num, line in enumerate(lines, 1):
        if "/trips" in line or "/maintenance" in line or "500" in line or "Exception" in line or "Traceback" in line:
            matches.append((line_num, line.strip()))
            
    print(f"Found {len(matches)} interesting lines:")
    for num, text in matches[-40:]:
        print(f"Line {num}: {text}")

if __name__ == "__main__":
    search()
