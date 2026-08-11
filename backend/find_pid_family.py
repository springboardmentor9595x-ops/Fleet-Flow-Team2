import subprocess

def find_pid_family():
    try:
        output = subprocess.check_output("wmic process get processid, parentprocessid, name", shell=True, text=True, encoding="utf-8", errors="ignore")
        lines = output.strip().splitlines()
        header = lines[0].split()
        print(f"Header: {lines[0]}")
        for line in lines[1:]:
            parts = line.split()
            if not parts:
                continue
            name = parts[0]
            pid = parts[-2]
            parent = parts[-1]
            if pid == "21936" or parent == "21936":
                print(f"MATCH: {line}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_pid_family()
