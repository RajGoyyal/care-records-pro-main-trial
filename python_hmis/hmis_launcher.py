"""
Windows launcher for packaging the HMIS Flask backend into a single EXE.

This script sets a writable data directory for the SQLite DB when frozen
and starts the Flask app without debug mode.
"""
import os
import sys
from pathlib import Path


def get_default_data_dir() -> str:
    # Prefer LOCALAPPDATA on Windows; fallback to user home
    base = os.getenv("LOCALAPPDATA") or str(Path.home())
    return str(Path(base) / "NHCE_HMIS_Data")


def main() -> int:
    # Ensure a writable data directory for the DB
    data_dir = os.environ.get("HMIS_DATA_DIR") or get_default_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    os.environ["HMIS_DATA_DIR"] = data_dir

    # Import the Flask app after setting HMIS_DATA_DIR
    try:
        from app import app as flask_app, init_db  # type: ignore
    except Exception as e:
        print(f"Failed to import Flask app: {e}")
        return 1

    # Initialize DB (idempotent)
    try:
        init_db()
    except Exception as e:
        print(f"DB initialization error: {e}")

    # Start server
    port = int(os.environ.get("HMIS_PORT", "5000"))
    host = os.environ.get("HMIS_HOST", "127.0.0.1")
    print("\U0001F3E5 Starting HMIS Backend (EXE)")
    print(f"\U0001F4C1 Data dir: {data_dir}")
    print(f"\U0001F310 URL: http://{host}:{port}")
    try:
        # Prefer Waitress in production EXE if installed
        try:
            from waitress import serve  # type: ignore
            print("Using Waitress WSGI server")
            serve(flask_app, host=host, port=port)
        except Exception:
            print("Waitress not available; falling back to Flask built-in server")
            flask_app.run(host=host, port=port, debug=False, threaded=True)
        return 0
    except KeyboardInterrupt:
        print("\nStopped")
        return 0
    except Exception as e:
        print(f"Server error: {e}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
