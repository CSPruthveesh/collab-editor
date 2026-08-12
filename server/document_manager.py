import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")
import ot_engine
from typing import Dict, List, Tuple
from server.ot_server import OTServerEngine
class ManagedDocument:
    def __init__(self, doc_id: str, initial_content: str = ""):
        self.doc_id = doc_id
        self.doc = ot_engine.Document(initial_content)
        self.revision = 0
        self.history: List[ot_engine.Operation] = []
    def apply_client_op(self, client_revision: int, client_op: ot_engine.Operation) -> Tuple[int, ot_engine.Operation]:
        self.revision, transformed_op = OTServerEngine.transform_and_apply(
            self.doc, client_revision, client_op, self.history
        )
        return self.revision, transformed_op
class DocumentManager:
    def __init__(self):
        self.documents: Dict[str, ManagedDocument] = {}
    def get_or_create(self, doc_id: str, initial_content: str = "") -> ManagedDocument:
        if doc_id not in self.documents:
            self.documents[doc_id] = ManagedDocument(doc_id, initial_content)
        return self.documents[doc_id]
    def get(self, doc_id: str) -> ManagedDocument:
        if doc_id not in self.documents:
            raise KeyError(f"Document {doc_id} not found")
        return self.documents[doc_id]
