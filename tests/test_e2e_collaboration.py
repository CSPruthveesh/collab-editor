import pytest
import os
import sys
import random
from fastapi.testclient import TestClient
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")
from server.config import settings
settings.DB_PATH = "e2e_test_collab.db"
if os.path.exists("e2e_test_collab.db"):
    os.remove("e2e_test_collab.db")
from server.main import app
import ot_engine
def test_e2e_multi_client_convergence():
    print("\n=== Running E2E Multi-Client Convergence Test ===")
    client = TestClient(app)
    doc_id = "e2e-fuzz-doc"
    with client.websocket_connect(f"/ws/{doc_id}?user_name=Alice") as ws1, \
         client.websocket_connect(f"/ws/{doc_id}?user_name=Bob") as ws2, \
         client.websocket_connect(f"/ws/{doc_id}?user_name=Charlie") as ws3:
        sync1 = ws1.receive_json()
        sync2 = ws2.receive_json()
        sync3 = ws3.receive_json()
        ws1.receive_json()
        ws1.receive_json()
        ws2.receive_json()
        local_docs = {
            "ws1": "",
            "ws2": "",
            "ws3": ""
        }
        revisions = {
            "ws1": 0,
            "ws2": 0,
            "ws3": 0
        }
        op1 = ot_engine.to_json(ot_engine.Operation().insert("Hello "))
        ws1.send_json({"type": "edit", "client_revision": 0, "op_json": op1})
        ack1 = ws1.receive_json()
        assert ack1["type"] == "ack"
        revisions["ws1"] = ack1["revision"]
        local_docs["ws1"] = ot_engine.Document.apply_static(local_docs["ws1"], ot_engine.from_json(op1))
        rem2 = ws2.receive_json()
        rem3 = ws3.receive_json()
        assert rem2["type"] == "remote_edit"
        assert rem3["type"] == "remote_edit"
        local_docs["ws2"] = ot_engine.Document.apply_static(local_docs["ws2"], ot_engine.from_json(rem2["op_json"]))
        local_docs["ws3"] = ot_engine.Document.apply_static(local_docs["ws3"], ot_engine.from_json(rem3["op_json"]))
        revisions["ws2"] = rem2["revision"]
        revisions["ws3"] = rem3["revision"]
        assert local_docs["ws1"] == local_docs["ws2"] == local_docs["ws3"] == "Hello "
        op2 = ot_engine.to_json(ot_engine.Operation().retain(6).insert("World"))
        ws2.send_json({"type": "edit", "client_revision": 1, "op_json": op2})
        op3 = ot_engine.to_json(ot_engine.Operation().retain(6).insert("Brave "))
        ws3.send_json({"type": "edit", "client_revision": 1, "op_json": op3})
        ack2 = ws2.receive_json()
        assert ack2["type"] == "ack"
        assert ack2["revision"] == 2
        rem1_from_2 = ws1.receive_json()
        rem3_from_2 = ws3.receive_json()
        ack3 = ws3.receive_json()
        assert ack3["type"] == "ack"
        assert ack3["revision"] == 3
        rem1_from_3 = ws1.receive_json()
        rem2_from_3 = ws2.receive_json()
        doc_c1 = ot_engine.Document.apply_static(local_docs["ws1"], ot_engine.from_json(rem1_from_2["op_json"]))
        doc_c1 = ot_engine.Document.apply_static(doc_c1, ot_engine.from_json(rem1_from_3["op_json"]))
        doc_c2 = ot_engine.Document.apply_static(local_docs["ws2"], ot_engine.from_json(op2))
        doc_c2 = ot_engine.Document.apply_static(doc_c2, ot_engine.from_json(rem2_from_3["op_json"]))
        doc_c3 = ot_engine.Document.apply_static(local_docs["ws3"], ot_engine.from_json(rem3_from_2["op_json"]))
        op3_prime = ot_engine.to_json(ot_engine.transform(ot_engine.from_json(op3), ot_engine.from_json(rem3_from_2["op_json"]))[0])
        doc_c3 = ot_engine.Document.apply_static(doc_c3, ot_engine.from_json(op3_prime))
        assert doc_c1 == doc_c2 == doc_c3
        print(f"Final Converged Document Content: '{doc_c1}'")
        print("=== E2E Multi-Client Convergence Test Passed Successfully! ===")
if __name__ == "__main__":
    test_e2e_multi_client_convergence()
