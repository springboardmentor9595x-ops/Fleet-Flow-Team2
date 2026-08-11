import os

LOG_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\tasks\task-2280.log"

def search():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    print(f"Total lines: {len(lines)}")
    # Find all lines containing "GET /maintenance/" and print the lines after it
    for idx, line in enumerate(lines):
        if "GET /maintenance/" in line and "500" in line:
            print(f"\n--- Traceback for maintenance 500 at line {idx+1} ---")
            for i in range(idx - 5, min(len(lines), idx + 150)):
                print(f"Line {i+1}: {lines[i].strip()}")
            break

if __name__ == "__main__":
    search()
