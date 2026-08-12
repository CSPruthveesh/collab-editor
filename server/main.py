import os
import sys
import uuid
from typing import Optional
from fastapi import FastAPI, WebSocket, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
if hasattr(os, "add_dll_directory") and os.path.exists(r"C:\msys64\ucrt64\bin"):
    os.add_dll_directory(r"C:\msys64\ucrt64\bin")

from server.websocket_handler import handle_websocket, persistence, doc_manager, conn_manager

app = FastAPI(title="Collaborative Code Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateDocRequest(BaseModel):
    title: str = "Untitled Document"
    content: str = ""
    owner: str = "Global"

class RenameDocRequest(BaseModel):
    title: str

@app.get("/api/documents")
def list_documents(owner: Optional[str] = Query(None)):
    return persistence.list_documents(owner=owner)

@app.post("/api/documents")
def create_document(req: CreateDocRequest):
    doc_id = str(uuid.uuid4())[:8]
    persistence.save_document_meta(doc_id, req.title, owner=req.owner)
    if req.content:
        doc_state = doc_manager.get_or_create(doc_id, req.content)
        persistence.save_snapshot(doc_id, 0, req.content)
    return {"id": doc_id, "title": req.title, "owner": req.owner}

@app.post("/api/documents/{doc_id}/rename")
def rename_document(doc_id: str, req: RenameDocRequest):
    persistence.rename_document(doc_id, req.title)
    return {"status": "ok", "id": doc_id, "title": req.title}

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    persistence.delete_document(doc_id)
    await conn_manager.broadcast(doc_id, {"type": "doc_deleted", "doc_id": doc_id})
    return {"status": "ok", "id": doc_id}

@app.get("/api/documents/{doc_id}/history")
def get_document_history(doc_id: str):
    conn = persistence._get_conn()
    rows = conn.execute(
        "SELECT revision, op_json, user_id, timestamp FROM operations WHERE doc_id = ? ORDER BY revision ASC",
        (doc_id,)
    ).fetchall()
    return [dict(r) for r in rows]

@app.websocket("/ws/{doc_id}")
async def websocket_endpoint(websocket: WebSocket, doc_id: str, user_name: str = Query("Anonymous")):
    await handle_websocket(websocket, doc_id, user_name)

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
frontend_dir = os.path.join(project_root, "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
