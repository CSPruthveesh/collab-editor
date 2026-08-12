import sqlite3
import json
import time
from typing import Optional, Tuple, List

from server.config import settings

class PersistenceManager:
    def __init__(self, db_path: str = settings.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at REAL
            )
            """)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT,
                revision INTEGER,
                op_json TEXT,
                user_id TEXT,
                timestamp REAL
            )
            """)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                doc_id TEXT PRIMARY KEY,
                revision INTEGER,
                content TEXT,
                timestamp REAL
            )
            """)
            conn.commit()

    def save_document_meta(self, doc_id: str, title: str = "Untitled Document"):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO documents (id, title, created_at) VALUES (?, ?, ?)",
                (doc_id, title, time.time())
            )
            conn.commit()

    def save_operation(self, doc_id: str, revision: int, op_json: str, user_id: str):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO operations (doc_id, revision, op_json, user_id, timestamp) VALUES (?, ?, ?, ?, ?)",
                (doc_id, revision, op_json, user_id, time.time())
            )
            conn.commit()

    def save_snapshot(self, doc_id: str, revision: int, content: str):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO snapshots (doc_id, revision, content, timestamp) VALUES (?, ?, ?, ?)",
                (doc_id, revision, content, time.time())
            )
            conn.commit()

    def load_document_state(self, doc_id: str) -> Tuple[str, int, List[Tuple[int, str]]]:
        """
        Returns (content, revision, ops_after_snapshot).
        ops_after_snapshot is a list of (revision, op_json).
        """
        with self._get_conn() as conn:
            snapshot_row = conn.execute(
                "SELECT revision, content FROM snapshots WHERE doc_id = ?", (doc_id,)
            ).fetchone()

            if snapshot_row:
                snapshot_rev = snapshot_row["revision"]
                content = snapshot_row["content"]
            else:
                snapshot_rev = 0
                content = ""

            op_rows = conn.execute(
                "SELECT revision, op_json FROM operations WHERE doc_id = ? AND revision > ? ORDER BY revision ASC",
                (doc_id, snapshot_rev)
            ).fetchall()

            ops = [(row["revision"], row["op_json"]) for row in op_rows]
            return content, snapshot_rev, ops