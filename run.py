import sys
import os
from pathlib import Path
import uvicorn

# Ensure backend directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "backend"))

if __name__ == "__main__":
    print("=" * 70)
    print("   SeamIT: The Manual Seam Filler Between SMB ITSM and ITAM")
    print("=" * 70)
    print(" Starting unified application server...")
    print(" Web Dashboard:  http://127.0.0.1:8000")
    print(" REST API Docs:  http://127.0.0.1:8000/docs")
    print(" Discrepancy Radar & Webhook Testbench ready out-of-the-box!")
    print("=" * 70)
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        app_dir=str(BASE_DIR / "backend")
    )
