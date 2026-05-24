import sys
import json
import websocket

def main():
    if len(sys.argv) < 3:
        print("Usage: python evaluate_js.py <ws_url> <expression>")
        sys.exit(1)
        
    ws_url = sys.argv[1]
    expression = sys.argv[2]
    
    ws = websocket.create_connection(ws_url, suppress_origin=True)
    payload = {
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": True
        }
    }
    ws.send(json.dumps(payload))
    result = ws.recv()
    print(result)
    ws.close()

if __name__ == "__main__":
    main()
