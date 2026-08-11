import os

LOG_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\tasks\task-2437.log"

def search():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    print(f"Total lines: {len(lines)}")
    # Find all lines containing "/maintenance/" and trace back
    target_idx = -1
    for idx, line in enumerate(lines):
        if "GET /maintenance/" in line and "500" in line:
            target_idx = idx
            break
            
    if target_idx != -1:
        print(f"\n--- Traceback surrounding line {target_idx+1} ---")
        # Print 20 lines after the error to see the traceback
        for i in range(target_idx, min(len(lines), target_idx + 40)):
            print(f"Line {i+1}: {lines[i].strip()}")
    else:
        print("No maintenance 500 errors found in the current active log.")

if __name__ == "__main__":
    search()
