import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from src.engine.nosql import run_api, run_mongo


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps([{"id": i, "name": f"n{i}"} for i in range(10)]).encode()
        if self.path == "/users/abc":
            body = json.dumps({"id": 1, "name": "x"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):  # ponytail: keep test output clean
        pass


@pytest.fixture(scope="module")
def api_url():
    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


def test_run_api_list(api_url):
    columns, rows, total = run_api(
        json.dumps({"base_url": api_url}),
        "/users",
        {},
        max_rows=100,
        timeout_sec=5,
        limit=None,
        offset=0,
    )
    assert columns == ["id", "name"]
    assert total == 10
    assert rows[0] == ["0", "n0"]


def test_run_api_param_substitution(api_url):
    columns, rows, _ = run_api(
        json.dumps({"base_url": api_url}),
        "/users/{id}",
        {"id": "abc"},
        max_rows=100,
        timeout_sec=5,
        limit=None,
        offset=0,
    )
    assert columns == ["id", "name"]
    assert rows == [["1", "x"]]


def test_run_api_limit_offset(api_url):
    _, rows, _ = run_api(
        json.dumps({"base_url": api_url}),
        "/users",
        {},
        max_rows=1000,
        timeout_sec=5,
        limit=3,
        offset=2,
    )
    assert len(rows) == 3
    assert rows[0] == ["2", "n2"]


def test_run_mongo_requires_collection():
    with pytest.raises(ValueError):
        run_mongo("x", "{}", "{}", 100, None, 0)
