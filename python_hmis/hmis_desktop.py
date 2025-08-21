import os
import threading
import time
import webview

def start_backend():
    # Start the backend server (Flask/Waitress)
    os.system('python hmis_launcher.py')

def main():
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()
    # Wait for backend to start
    time.sleep(2)
    # Open frontend in a native window
    webview.create_window('NHCE HMIS', 'http://127.0.0.1:5000')
    webview.start()

if __name__ == '__main__':
    main()
