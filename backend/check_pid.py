import subprocess
import csv
import io

def check_pid():
    try:
        output = subprocess.check_output("tasklist /FO CSV /V", shell=True, text=True, encoding="utf-8", errors="ignore")
        reader = csv.reader(io.StringIO(output))
        header = next(reader)
        print(f"Header: {header}")
        found = False
        for row in reader:
            if len(row) > 1 and ("21936" in row[1] or "21936" in row):
                print(f"FOUND PID 21936: {row}")
                found = True
        if not found:
            print("PID 21936 not found in tasklist /FO CSV /V")
    except Exception as e:
        print(f"Error parsing tasklist: {e}")

if __name__ == "__main__":
    check_pid()
