import os

LOG_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\tasks\task-2437.log"

def search():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    print(f"Total lines: {len(lines)}")
    matches = []
    for line_num, line in enumerate(lines, 1):
        if "GET /trips" in line or "GET /vehicles" in line or "GET /drivers" in line or "GET /shipments" in line:
            matches.append((line_num, line.strip()))
            
    print(f"Found {len(matches)} GET requests:")
    for num, text in matches[-30:]:
        print(f"Line {num}: {text}")

if __name__ == "__main__":
    search()
