import json
import os

TRANSCRIPT_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\.system_generated\logs\transcript_full.jsonl"
OUTPUT_PATH = r"C:\Users\91770\.gemini\antigravity\brain\65a4cd3f-a076-4e16-ab84-23a02a97d081\scratch\shipment_panel_history.txt"

def search():
    if not os.path.exists(TRANSCRIPT_PATH):
        print("Transcript not found.")
        return
    
    with open(TRANSCRIPT_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    writes = []
    for line_num, line in enumerate(lines, 1):
        try:
            step = json.loads(line)
            tool_calls = step.get("tool_calls", [])
            for call in tool_calls:
                name = call.get("name")
                args = call.get("args", {})
                if name in ("write_to_file", "replace_file_content", "multi_replace_file_content"):
                    target_file = args.get("TargetFile", "")
                    if "ShipmentPanel.jsx" in target_file:
                        writes.append((line_num, name, args))
        except Exception:
            pass
            
    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        out.write(f"Found {len(writes)} edits to ShipmentPanel.jsx\n\n")
        for idx, (line_num, name, args) in enumerate(writes):
            out.write(f"=== EDIT {idx+1} (Line {line_num}, Tool: {name}) ===\n")
            out.write(f"TargetFile: {args.get('TargetFile')}\n")
            if name == "write_to_file":
                out.write("Content written (truncated):\n")
                out.write(args.get("CodeContent", "")[:1000] + "...\n")
            elif name == "replace_file_content":
                out.write(f"TargetContent:\n{args.get('TargetContent')}\n")
                out.write(f"ReplacementContent:\n{args.get('ReplacementContent')}\n")
            elif name == "multi_replace_file_content":
                out.write("Chunks:\n")
                for chunk in args.get("ReplacementChunks", []):
                    out.write(f"  Target: {chunk.get('TargetContent')}\n")
                    out.write(f"  Replacement: {chunk.get('ReplacementContent')}\n")
            out.write("\n" + "="*40 + "\n\n")
            
    print(f"History search complete. Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    search()
