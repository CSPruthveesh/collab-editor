import json
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from server.models import ClientEditMsg, ServerAckMsg, ServerOpMsg, DocSyncMsg
from server.document_manager import DocumentManager
from server.presence_manager import ConnectionManager
from server.persistence import PersistenceManager
import ot_engine

doc_manager = DocumentManager()
conn_manager = ConnectionManager()
persistence = PersistenceManager()

async def handle_websocket(websocket: WebSocket, doc_id: str, user_name: str = "Anonymous"):
    user_id = str(uuid.uuid4())[:8]

    
    persistence.save_document_meta(doc_id)
    doc_state = doc_manager.get_or_create(doc_id)

    
    if doc_state.revision == 0 and not doc_state.history:
        content, snapshot_rev, ops = persistence.load_document_state(doc_id)
        if content or ops:
            doc_state.doc = ot_engine.Document(content)
            doc_state.revision = snapshot_rev
            for rev, op_json in ops:
                op = ot_engine.from_json(op_json)
                doc_state.history.append(op)
                doc_state.revision = rev

    
    presence = await conn_manager.connect(doc_id, user_id, user_name, websocket)

    
    sync_msg = DocSyncMsg(
        doc_id=doc_id,
        content=doc_state.doc.str(),
        revision=doc_state.revision,
        users=conn_manager.get_presences(doc_id)
    ).model_dump()
    await websocket.send_json(sync_msg)

    
    await conn_manager.broadcast(doc_id, {
        "type": "user_join",
        "presence": presence.model_dump()
    }, sender_user_id=user_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "edit":
                client_rev = data.get("client_revision")
                op_json = data.get("op_json")

                
                client_op = ot_engine.from_json(op_json)

                
                new_rev, transformed_op = doc_state.apply_client_op(client_rev, client_op)
                transformed_op_json = ot_engine.to_json(transformed_op)

                
                persistence.save_operation(doc_id, new_rev, transformed_op_json, user_id)

                
                if new_rev % 50 == 0:
                    persistence.save_snapshot(doc_id, new_rev, doc_state.doc.str())

                
                ack_msg = ServerAckMsg(revision=new_rev).model_dump()
                await websocket.send_json(ack_msg)

                
                op_msg = ServerOpMsg(
                    revision=new_rev,
                    op_json=transformed_op_json,
                    user_id=user_id
                ).model_dump()
                await conn_manager.broadcast(doc_id, op_msg, sender_user_id=user_id)

            elif msg_type == "presence":
                presence_data = data.get("presence", {})
                presence.cursor_pos = presence_data.get("cursor_pos", presence.cursor_pos)
                presence.selection_start = presence_data.get("selection_start", presence.selection_start)
                presence.selection_end = presence_data.get("selection_end", presence.selection_end)

                await conn_manager.broadcast(doc_id, {
                    "type": "presence",
                    "presence": presence.model_dump()
                }, sender_user_id=user_id)

    except WebSocketDisconnect:
        conn_manager.disconnect(doc_id, user_id)
        await conn_manager.broadcast(doc_id, {
            "type": "user_leave",
            "user_id": user_id
        })