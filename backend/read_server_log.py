import os

LOG_PATH = r"c:\Users\91770\Downloads\fleetflow\backend\server.log"

def read_log():
    if not os.path.exists(LOG_PATH):
        print("Log not found.")
        return
    with open(LOG_PATH, "r", encoding="utf-16le") as f:
        lines = f.readlines()
    print(f"Total lines in log: {len(lines)}")
    print("\n--- Last 50 lines of server log ---")
    for line in lines[-50:]:
        try:
            clean = line.strip().encode('ascii', 'ignore').decode('ascii')
            print(clean)
        except Exception:
            pass

if __name__ == "__main__":
    read_log()
