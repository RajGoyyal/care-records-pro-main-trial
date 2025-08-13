#!/usr/bin/env python3
"""
Run HMIS backend with a production WSGI server (Waitress) instead of Flask dev server.
Usage:
  python run_production_server.py  # defaults to 127.0.0.1:5000
Env vars:
  HMIS_HOST, HMIS_PORT, HMIS_DATA_DIR
"""
import os
import sys
from pathlib import Path

# Ensure python_hmis is on path
ROOT = Path(__file__).parent
APP_DIR = ROOT / "python_hmis"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

os.environ.setdefault("HMIS_DATA_DIR", str(APP_DIR))

from python_hmis.hmis_launcher import main as launcher_main  # type: ignore

if __name__ == "__main__":
    raise SystemExit(launcher_main())
