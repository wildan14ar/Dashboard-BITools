import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from src.conn import create as conn_create


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
    engine = conn_create("api", "test_api", json.dumps({"base_url": api_url}))
    rows = engine.fetch_all("/users", {})
    assert len(rows) == 10
    assert "id" in rows[0]
    assert "name" in rows[0]
    assert rows[0]["id"] == 0
    assert rows[0]["name"] == "n0"


def test_run_api_param_substitution(api_url):
    engine = conn_create("api", "test_api_param", json.dumps({"base_url": api_url}))
    rows = engine.fetch_all("/users/{id}", {"id": "abc"})
    assert len(rows) == 1
    assert rows[0]["id"] == 1
    assert rows[0]["name"] == "x"


def test_run_api_limit_offset(api_url):
    engine = conn_create("api", "test_api_limit", json.dumps({"base_url": api_url}))
    # fetch_all returns all rows from API; limit/offset is client-side
    rows = engine.fetch_all("/users", {})
    assert len(rows) == 10
    # verify it's a list of dicts with correct keys
    assert all("id" in r and "name" in r for r in rows)


def test_run_mongo_requires_collection():
    engine = conn_create("mongodb", "test_mongo", json.dumps({}))
    with pytest.raises(ValueError, match="requires 'collection'"):
        engine.fetch_all('{"collection": ""}', {})
