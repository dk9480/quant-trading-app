import subprocess
import time
import os
import signal
import sys
import platform

# --- Configuration ---
# Assuming your files are in the root directory.
BINANCE_STREAMER_CMD = [sys.executable, "binance_stream.py"]
API_BACKEND_CMD = [sys.executable, "-m", "uvicorn", "api:app", "--reload", "--port", "8000"]

# Change to your frontend directory if it's not the current working directory
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "quant-frontend") # Adjust this path if needed
FRONTEND_CMD = ["npm", "start"]
# --- End Configuration ---

def start_process(name, cmd, cwd=None):
    """Starts a process and returns the Popen object, handling platform differences."""
    print(f"--- Starting {name}: {' '.join(cmd)}")
    
    kwargs = {}
    is_npm_command = cmd and isinstance(cmd, list) and cmd[0] == "npm"

    if platform.system() == "Windows":
        # Use CREATE_NEW_PROCESS_GROUP for Python services for clean shutdown
        if not is_npm_command:
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        # Use shell=True for npm command on Windows for reliable execution
        else:
            # When using shell=True, pass the command as a single string.
            print("--- Launching npm with shell=True for Windows compatibility. ---")
            return subprocess.Popen(" ".join(cmd), cwd=cwd, shell=True)
    else:
        # Use os.setsid for Unix-like systems (Linux, macOS)
        if not is_npm_command:
            kwargs["preexec_fn"] = os.setsid
    
    # Fallback for Python processes on all systems and npm on Unix
    return subprocess.Popen(cmd, cwd=cwd, **kwargs)

def main():
    processes = []
    
    try:
        # 1. Start Binance Streamer
        processes.append(start_process("Binance Streamer (DB Ingestion)", BINANCE_STREAMER_CMD))
        time.sleep(2) 

        # 2. Start FastAPI Backend
        processes.append(start_process("FastAPI Backend", API_BACKEND_CMD))
        time.sleep(5) 

        # 3. Start React Frontend
        # The logic inside start_process will handle the Windows/npm special case
        processes.append(start_process("React Frontend", FRONTEND_CMD, cwd=FRONTEND_DIR))
        
        # Keep the main script running indefinitely
        print("\n--- All services started. Press Ctrl+C to shut down all processes. ---\n")
        
        # Simple loop to keep the parent process alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n--- Ctrl+C detected. Initiating graceful shutdown... ---")
    except FileNotFoundError as e:
        print(f"\n--- ERROR: Command not found or invalid path: {e.args[0]} ---")
        print("Please ensure 'npm', 'uvicorn', and 'python' are in your system PATH and the 'quant-frontend' folder exists.")
    except Exception as e:
        print(f"\n--- An unexpected error occurred: {e} ---")

    finally:
        # --- Clean Shutdown (Use taskkill reliably on Windows) ---
        for i, proc in enumerate(processes):
            if proc.poll() is None: # Check if process is still running
                try:
                    if platform.system() == "Windows":
                        # For Windows, taskkill on the PID is the most reliable way to kill the process and its children (the group)
                        # We use CREATE_NEW_CONSOLE to ensure the taskkill command runs in its own session and doesn't interrupt the user's terminal.
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(proc.pid)], creationflags=subprocess.CREATE_NEW_CONSOLE)
                    else:
                        # Unix/Linux/macOS uses process group ID (PGID)
                        os.killpg(os.getpgid(proc.pid), signal.SIGINT)
                    
                    print(f"Shut down process {i+1} (PID: {proc.pid}) gracefully.")
                except Exception as e:
                    print(f"Could not shut down process {i+1} (PID: {proc.pid}): {e}")

        # Wait for processes to terminate fully
        for proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                print(f"Forcing termination of process {proc.pid}.")
            
        print("\n--- All services successfully terminated. ---")
        sys.exit(0)

if __name__ == "__main__":
    main()