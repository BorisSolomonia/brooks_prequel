import socket
import json
import urllib.request
import sys

def main():
    expression = sys.argv[1] if len(sys.argv) > 1 else "window.location.href"
    print(f"Evaluating: {expression}")

    try:
        # Get WebSocket URL
        res = urllib.request.urlopen("http://localhost:9222/json").read()
        targets = json.loads(res.decode('utf-8'))
        if not targets:
            print("No targets found")
            return
        ws_url = targets[0]['webSocketDebuggerUrl']
        path = ws_url.split('ws://localhost:9222')[1]
    except Exception as e:
        print(f"Failed to get targets: {e}")
        return

    try:
        # Connect
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect(('localhost', 9222))

        # Handshake
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            "Host: localhost:9222\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        s.send(handshake.encode('utf-8'))
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += s.recv(1024)

        # Create message
        msg = {
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": expression
            }
        }
        msg_bytes = json.dumps(msg).encode('utf-8')
        length = len(msg_bytes)

        # Frame header
        if length < 126:
            header = bytes([0x81, 0x80 | length])
        else:
            header = bytes([0x81, 0x80 | 126, (length >> 8) & 0xff, length & 0xff])
        
        mask_key = bytes([0, 0, 0, 0])
        s.send(header + mask_key + msg_bytes)

        # Read response
        resp = s.recv(65536)
        if len(resp) > 2:
            # Skip header
            offset = 2
            pay_len = resp[1] & 0x7f
            if pay_len == 126:
                pay_len = (resp[2] << 8) | resp[3]
                offset = 4
            elif pay_len == 127:
                # 8 bytes length (not expected here)
                offset = 10
            
            payload = resp[offset:]
            # Only decode up to payload length
            print("Result:", payload[:pay_len].decode('utf-8', errors='ignore'))
    except Exception as e:
        print(f"Failed during socket communication: {e}")

if __name__ == "__main__":
    main()
