import sys
import json
import websocket
import time

def main():
    if len(sys.argv) < 2:
        print("Usage: python listen_logs.py <ws_url>")
        sys.exit(1)
        
    ws_url = sys.argv[1]
    print(f"Starting log listener on {ws_url}...", flush=True)
    
    while True:
        try:
            print(f"Connecting...", flush=True)
            ws = websocket.create_connection(ws_url, suppress_origin=True)
            print("Connected! Enabling Console, Log, and Runtime...", flush=True)
            ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            ws.send(json.dumps({"id": 2, "method": "Log.enable"}))
            
            while True:
                try:
                    message = ws.recv()
                    data = json.loads(message)
                    if data.get("method") == "Runtime.consoleAPICalled":
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
                        text = " ".join(parts)
                        print(f"[Console {params.get('type')}] {text}", flush=True)
                    elif data.get("method") == "Log.entryAdded":
                        params = data.get("params", {})
                        entry = params.get("entry", {})
                        print(f"[Log {entry.get('level')}] {entry.get('text')}", flush=True)
                    elif data.get("method") == "Runtime.exceptionThrown":
                        params = data.get("params", {})
                        details = params.get("exceptionDetails", {})
                        desc = details.get("exception", {}).get("description", "")
                        print(f"[Exception] {details.get('text')} {desc}", flush=True)
                except websocket.WebSocketConnectionClosedException:
                    print("Connection closed by host. Reconnecting...", flush=True)
                    break
                except Exception as e:
                    print(f"Error receiving/parsing message: {e}", flush=True)
        except Exception as e:
            print(f"Failed to connect: {e}. Retrying in 1s...", flush=True)
            time.sleep(1)

if __name__ == "__main__":
    main()
