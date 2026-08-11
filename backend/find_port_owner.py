import subprocess
import re

def find_owner():
    try:
        output = subprocess.check_output("netstat -abno", shell=True, text=True, encoding="utf-8", errors="ignore")
        lines = output.splitlines()
        for i, line in enumerate(lines):
            if ":8000" in line:
                print(f"Match: {line}")
                # Print neighboring lines to find executable name
                start = max(0, i - 1)
                end = min(len(lines), i + 3)
                for j in range(start, end):
                    print(f"  [{j}] {lines[j]}")
    except Exception as e:
        print(f"Error running netstat: {e}")

if __name__ == "__main__":
    find_owner()
