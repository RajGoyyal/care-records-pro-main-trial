# Python 3.13.7 Upgrade Notes

This project can run under both the existing Python version and Python 3.13.7 using the new `start_production_menu.bat` launcher.

## Steps Performed
1. Added `start_production_menu.bat` with dual-choice startup (default venv or Python 3.13 specific venv `venv313`).
2. Added `python-dotenv` to `requirements.txt` (future environment management).
3. Provided placeholders for `pywebview` if desktop packaging is pursued.

## How the Launcher Works
- Option 1 creates/uses `venv` with the system default `py -3` interpreter.
- Option 2 detects an installed Python 3.13 (via `py -0p`) and creates/uses `venv313`.
- Dependencies are (re)installed from `python_hmis/requirements.txt`.
- Waitress serves the app on port 8000.

## Before Using Option 2
Ensure Python 3.13.7 is installed. If not:
1. Download from https://www.python.org/downloads/windows/
2. During install, check: "Add Python to PATH".
3. Re-run the menu script.

## Verifying Active Version
Inside the running shell after choosing Option 2, the script prints the Python version (should show 3.13.x).

## Potential Follow-Ups
- Add a health check to automatically open the browser after server starts.
- Extend script to build a PyInstaller binary targeting Python 3.13 runtime.
- Add a watchdog auto-restart for unexpected server exits.

## Troubleshooting
| Issue | Cause | Resolution |
|-------|-------|------------|
| Python 3.13 not detected | Not installed or not registered with `py` launcher | Reinstall Python 3.13, ensure "py launcher" option selected |
| Module import errors | New venv missing deps | Allow script to re-run; it reinstalls deps each launch |
| Port already in use | Another instance running | Stop previous process or change port in script |

