import uvicorn
import sys
import os

if __name__ == "__main__":
    print("Starting Uvicorn programmatically...")
    sys.stdout.flush()
    try:
        # Set env variable to force logs flush
        os.environ["PYTHONUNBUFFERED"] = "1"
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="debug")
    except Exception as e:
        print(f"Uvicorn crash: {e}")
        sys.stdout.flush()
