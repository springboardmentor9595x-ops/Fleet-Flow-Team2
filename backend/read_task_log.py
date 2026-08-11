import os

LOG_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\tasks\task-2280.log"

def read_log():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    print(f"Total lines in log: {len(lines)}")
    print("\n--- Last 50 lines of task log ---")
    for line in lines[-50:]:
        print(line.strip())

if __name__ == "__main__":
    read_log()
