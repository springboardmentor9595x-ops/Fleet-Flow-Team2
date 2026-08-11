import json
import os

TRANSCRIPT_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\logs\transcript.jsonl"
OUTPUT_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\scratch\search_logs_output.txt"

def search():
    if not os.path.exists(TRANSCRIPT_PATH):
        print("Transcript not found.")
        return
    
    with open(TRANSCRIPT_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    user_requests = []
    for line in lines:
        try:
            step = json.loads(line)
            if step.get("type") == "USER_INPUT":
                user_requests.append(step.get("content", ""))
        except Exception as e:
            pass
            
    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        out.write("--- Recent User Requests ---\n")
        for req in user_requests:
            out.write(f"- {req}\n\n")
            
    print(f"Write successful! Recent requests saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    search()
