import sys
import json
import websocket
import time

def main():
    if len(sys.argv) < 2:
        print("Usage: python reload_and_listen.py <ws_url>")
        sys.exit(1)
        
    ws_url = sys.argv[1]
    print(f"Connecting to {ws_url}...", flush=True)
    ws = websocket.create_connection(ws_url, suppress_origin=True)
    print("Connected! Enabling Page, Runtime, Log...", flush=True)
    ws.send(json.dumps({"id": 1, "method": "Page.enable"}))
    ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))
    ws.send(json.dumps({"id": 3, "method": "Log.enable"}))
    
    print("Reloading page...", flush=True)
    ws.send(json.dumps({"id": 4, "method": "Page.reload"}))
    
    # Wait and print logs for 8 seconds
    start_time = time.time()
    while time.time() - start_time < 8:
        try:
            ws.settimeout(0.5)
            message = ws.recv()
            data = json.loads(message)
            method = data.get("method")
            if method == "Runtime.consoleAPICalled":
                params = data.get("params", {})
                args = params.get("args", [])
                parts = []
                for arg in args:
                    if isinstance(arg, dict):
                        if "value" in arg:
                            parts.append(str(arg["value"]))
                        elif "description" in arg:
                            parts.append(str(arg["description"]))
                        else:
                            parts.append(json.dumps(arg))
                    else:
                        parts.append(str(arg))
                print(f"[Console {params.get('type')}] {' '.join(parts)}", flush=True)
            elif method == "Log.entryAdded":
                params = data.get("params", {})
                entry = params.get("entry", {})
                print(f"[Log {entry.get('level')}] {entry.get('text')}", flush=True)
            elif method == "Runtime.exceptionThrown":
                params = data.get("params", {})
                details = params.get("exceptionDetails", {})
                desc = details.get("exception", {}).get("description", "")
                print(f"[Exception] {details.get('text')} {desc}", flush=True)
            elif method == "Page.frameNavigated":
                print("Page Navigated! Re-enabling Runtime and Log...", flush=True)
                ws.send(json.dumps({"id": 5, "method": "Runtime.enable"}))
                ws.send(json.dumps({"id": 6, "method": "Log.enable"}))
        except websocket.WebSocketTimeoutException:
            pass
        except Exception as e:
            print(f"Error: {e}", flush=True)
            break
            
    ws.close()
    print("Finished listening.", flush=True)

if __name__ == "__main__":
    main()
