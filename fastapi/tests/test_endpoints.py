import json
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


class EndpointTests(unittest.TestCase):
    def test_http_responses(self):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        root = Path(__file__).resolve().parents[1]
        server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            base = f"http://127.0.0.1:{port}"
            for _ in range(100):
                if server.poll() is not None:
                    self.fail("Uvicorn exited before accepting requests")
                try:
                    with urlopen(base + "/health", timeout=1):
                        break
                except (URLError, TimeoutError):
                    time.sleep(0.1)
            else:
                self.fail("Uvicorn did not start within 10 seconds")

            for path, content_type, body in (
                ("/health", "text/plain; charset=utf-8", b"OK"),
                ("/plaintext", "text/plain; charset=utf-8", b"Hello, World!"),
                ("/json", "application/json", b'{"message":"Hello, World!"}'),
            ):
                with self.subTest(path=path), urlopen(base + path, timeout=5) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.headers["Content-Type"], content_type)
                    self.assertEqual(response.read(), body)
            with urlopen(base + "/json-large", timeout=5) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Content-Type"], "application/json")
                expected = [
                    {"id": i, "name": f"item-{i}", "value": i * 10} for i in range(1, 101)
                ]
                self.assertEqual(response.read(), json.dumps(expected, separators=(",", ":")).encode())
            request = Request(base + "/aggregate", data=json.dumps({"numbers": list(range(1, 1001))}).encode(),
                              headers={"Content-Type": "application/json"}, method="POST")
            with urlopen(request, timeout=5) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Content-Type"], "application/json")
                self.assertEqual(response.read(), b'{"count":1000,"sum":500500,"min":1,"max":1000}')
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


if __name__ == "__main__":
    unittest.main()
