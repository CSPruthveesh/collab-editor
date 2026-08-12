import random
from typing import Dict, List, Set
from fastapi import WebSocket
from server.models import UserPresence
COLOR_PALETTE = [
    "#FF5733", "#33FF57", "#3357FF", "#F012BE",
    "#FFDC00", "#7FDBFF", "#2ECC40", "#FF851B",
    "#B10DC9", "#01FF70", "#AAAAAA", "#E056FD"
]
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, tuple[WebSocket, UserPresence]]] = {}
    async def connect(self, doc_id: str, user_id: str, user_name: str, websocket: WebSocket) -> UserPresence:
        await websocket.accept()
        if doc_id not in self.active_connections:
            self.active_connections[doc_id] = {}
        color = COLOR_PALETTE[len(self.active_connections[doc_id]) % len(COLOR_PALETTE)]
        presence = UserPresence(
            user_id=user_id,
            user_name=user_name,
            color=color,
            cursor_pos=0,
            selection_start=0,
            selection_end=0
        )
        self.active_connections[doc_id][user_id] = (websocket, presence)
        return presence
    def disconnect(self, doc_id: str, user_id: str):
        if doc_id in self.active_connections and user_id in self.active_connections[doc_id]:
            del self.active_connections[doc_id][user_id]
            if not self.active_connections[doc_id]:
                del self.active_connections[doc_id]
    def get_presences(self, doc_id: str) -> List[UserPresence]:
        if doc_id not in self.active_connections:
            return []
        return [presence for _, presence in self.active_connections[doc_id].values()]
    async def broadcast(self, doc_id: str, message: dict, sender_user_id: str = None):
        if doc_id not in self.active_connections:
            return
        for user_id, (ws, _) in self.active_connections[doc_id].items():
            if sender_user_id is None or user_id != sender_user_id:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass
    async def send_personal(self, doc_id: str, user_id: str, message: dict):
        if doc_id in self.active_connections and user_id in self.active_connections[doc_id]:
            ws, _ = self.active_connections[doc_id][user_id]
            try:
                await ws.send_json(message)
            except Exception:
                pass
