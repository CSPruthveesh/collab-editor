import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")

import ot_engine
from typing import List, Tuple

class OTServerEngine:
    @staticmethod
    def transform_and_apply(
        server_doc: ot_engine.Document,
        client_revision: int,
        client_op: ot_engine.Operation,
        history: List[ot_engine.Operation]
    ) -> Tuple[int, ot_engine.Operation]:
        """
        Transforms client_op against all operations committed since client_revision,
        applies the transformed operation to server_doc, appends it to history,
        and returns (new_revision, transformed_op).
        """
        if client_revision < 0 or client_revision > len(history):
            raise ValueError(f"Invalid client revision {client_revision} for history of length {len(history)}")

        # Transform against concurrent server operations
        concurrent_ops = history[client_revision:]
        for server_op in concurrent_ops:
            client_op, _ = ot_engine.transform(client_op, server_op)

        # Apply to server document
        server_doc.apply(client_op)

        # Append to history
        history.append(client_op)
        new_revision = len(history)

        return new_revision, client_op
