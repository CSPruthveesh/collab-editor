import pytest
import asyncio
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")

from server.config import settings

# Use test database
settings.DB_PATH = "test_collab_editor.db"
if os.path.exists("test_collab_editor.db"):
    os.remove("test_collab_editor.db")

from server.main import app
import ot_engine

def test_rest_endpoints():
    client = TestClient(app)
    
    # Create doc
    response = client.post("/api/documents", json={"title": "Test Doc", "content": "Hello World"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == "Test Doc"
    
    doc_id = data["id"]
    
    # List docs
    response = client.get("/api/documents")
    assert response.status_code == 200
    docs = response.json()
    assert any(d["id"] == doc_id for d in docs)

def test_websocket_collaboration():
    client = TestClient(app)
    doc_id = "test-collab-1"

    # Connect Client 1
    with client.websocket_connect(f"/ws/{doc_id}?user_name=Alice") as ws1:
        # Receive doc_sync
        sync1 = ws1.receive_json()
        assert sync1["type"] == "doc_sync"
        assert sync1["revision"] == 0

        # Connect Client 2
        with client.websocket_connect(f"/ws/{doc_id}?user_name=Bob") as ws2:
            sync2 = ws2.receive_json()
            assert sync2["type"] == "doc_sync"

            # Client 1 receives user_join for Client 2
            user_join = ws1.receive_json()
            assert user_join["type"] == "user_join"
            assert user_join["presence"]["user_name"] == "Bob"

            # Client 1 sends an edit: insert "Beautiful " at pos 6
            op1 = ot_engine.Operation()
            op1.retain(0)  # base_len 0 for empty doc, or match base doc
            op1_json = ot_engine.to_json(ot_engine.Operation().insert("Hello World"))

            ws1.send_json({
                "type": "edit",
                "client_revision": 0,
                "op_json": op1_json
            })

            # Client 1 gets ack
            ack1 = ws1.receive_json()
            assert ack1["type"] == "ack"
            assert ack1["revision"] == 1

            # Client 2 gets remote_edit
            remote1 = ws2.receive_json()
            assert remote1["type"] == "remote_edit"
            assert remote1["revision"] == 1

            print("=== Multi-client WebSocket sync test passed! ===")

if __name__ == "__main__":
    test_rest_endpoints()
    test_websocket_collaboration()
    print("=== All Server Tests Passed Successfully! ===")
