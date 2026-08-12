from pydantic import BaseModel, Field
from typing import List, Optional

class ClientEditMsg(BaseModel):
    type: str = "edit"
    doc_id: str
    client_revision: int
    op_json: str

class ServerAckMsg(BaseModel):
    type: str = "ack"
    revision: int

class ServerOpMsg(BaseModel):
    type: str = "remote_edit"
    revision: int
    op_json: str
    user_id: str

class UserPresence(BaseModel):
    user_id: str
    user_name: str
    color: str
    cursor_pos: int = 0
    selection_start: int = 0
    selection_end: int = 0

class PresenceMsg(BaseModel):
    type: str = "presence"
    presence: UserPresence

class DocSyncMsg(BaseModel):
    type: str = "doc_sync"
    doc_id: str
    content: str
    revision: int
    users: List[UserPresence] = []