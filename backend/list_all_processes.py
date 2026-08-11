import subprocess

def list_processes():
    try:
        output = subprocess.check_output("wmic process get processid, parentprocessid, name", shell=True, text=True, encoding="utf-8", errors="ignore")
        print(output)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_processes()
