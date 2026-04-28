from __future__ import annotations

import logging
import uuid
import re
from datetime import datetime, timezone
from typing import Any, List, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING
from pymongo import ReturnDocument

logger = logging.getLogger(__name__)

COLLECTION_SESSIONS = "chat_sessions"
COLLECTION_MESSAGES = "chat_messages"
COLLECTION_PENDING = "chat_pending_actions"


class ChatRepository:
    def __init__(self, uri: str, database: str) -> None:
        if not uri:
            raise RuntimeError("MONGODB_URI is required for chatbot persistence")
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._uri = uri
        self._database_name = database

    async def connect(self) -> None:
        if self._client is not None:
            return
        self._client = AsyncIOMotorClient(self._uri, serverSelectionTimeoutMS=10000)
        # ping
        await self._client.admin.command("ping")
        self._db = self._client[self._database_name]
        await self._ensure_indexes()
        logger.info("ChatRepository connected to database '%s'", self._database_name)

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            raise RuntimeError("ChatRepository not connected")
        return self._db

    def _sessions(self) -> AsyncIOMotorCollection:
        return self.db[COLLECTION_SESSIONS]

    def _messages(self) -> AsyncIOMotorCollection:
        return self.db[COLLECTION_MESSAGES]

    def _pending(self) -> AsyncIOMotorCollection:
        return self.db[COLLECTION_PENDING]

    async def _ensure_indexes(self) -> None:
        await self._sessions().create_index([("conversation_id", ASCENDING)], unique=True)
        await self._sessions().create_index([("patient_id", ASCENDING), ("last_activity", -1)])
        await self._sessions().create_index([("patient_id", ASCENDING), ("archived", ASCENDING), ("last_activity", DESCENDING)])
        await self._messages().create_index([("conversation_id", ASCENDING), ("created_at", ASCENDING)])
        await self._messages().create_index("conversation_id")
        await self._pending().create_index("action_token", unique=True)
        await self._pending().create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

    @staticmethod
    def _normalize_preview(text: str, max_len: int = 120) -> str:
        clean = re.sub(r"\s+", " ", (text or "")).strip()
        if len(clean) <= max_len:
            return clean
        return clean[: max_len - 1].rstrip() + "…"

    @staticmethod
    def _cursor_key(dt: datetime, item_id: str) -> str:
        return f"{dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')}|{item_id}"

    @staticmethod
    def _parse_cursor(cursor: str | None) -> datetime | None:
        if not cursor:
            return None
        try:
            raw = cursor.split("|", 1)[0]
            raw = raw.replace("Z", "+00:00") if raw.endswith("Z") else raw
            return datetime.fromisoformat(raw)
        except Exception:
            return None

    @staticmethod
    def _dt_to_iso(value: Any) -> str:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        if value:
            return str(value)
        return ""

    @staticmethod
    def _message_doc(doc: dict[str, Any]) -> dict[str, Any]:
        message_id = str(doc.get("message_id") or doc.get("id") or doc.get("_id") or "")
        return {
            "message_id": message_id,
            "conversation_id": str(doc.get("conversation_id") or ""),
            "role": str(doc.get("role") or "user"),
            "content": str(doc.get("content") or ""),
            "created_at": ChatRepository._dt_to_iso(doc.get("created_at")),
            "ui_components": doc.get("ui_components") or [],
            "quick_replies": doc.get("quick_replies") or [],
            "pending_action": doc.get("pending_action"),
        }

    @staticmethod
    def _session_doc(doc: dict[str, Any]) -> dict[str, Any]:
        return {
            "conversation_id": str(doc.get("conversation_id") or ""),
            "title": str(doc.get("title") or "Chat"),
            "preview": str(doc.get("last_message_preview") or doc.get("preview") or ""),
            "created_at": ChatRepository._dt_to_iso(doc.get("created_at")),
            "updated_at": ChatRepository._dt_to_iso(doc.get("last_activity") or doc.get("updated_at") or doc.get("created_at")),
            "archived_at": ChatRepository._dt_to_iso(doc.get("archived_at")) or None,
            "message_count": int(doc.get("message_count") or 0),
            "last_message_role": str(doc.get("last_message_role") or "user"),
        }

    async def ensure_session(
        self,
        patient_id: str,
        conversation_id: str | None,
        title: str = "Chat",
    ) -> str:
        await self.connect()
        if conversation_id:
            doc = await self._sessions().find_one({"conversation_id": conversation_id, "patient_id": patient_id})
            if not doc:
                # New id for this patient — create fresh
                return await self._new_session(patient_id, title)
            await self._sessions().update_one(
                {"conversation_id": conversation_id},
                {"$set": {"last_activity": datetime.now(timezone.utc)}},
            )
            return conversation_id
        return await self._new_session(patient_id, title)

    async def _new_session(self, patient_id: str, title: str) -> str:
        cid = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        await self._sessions().insert_one(
            {
                "conversation_id": cid,
                "patient_id": patient_id,
                "title": title,
                "last_message_preview": "",
                "last_message_role": "user",
                "message_count": 0,
                "created_at": now,
                "last_activity": now,
                "archived": False,
                "archived_at": None,
            }
        )
        return cid

    async def append_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        patient_id: str,
        ui_components: list[dict[str, Any]] | None = None,
        tool_calls: list[dict[str, Any]] | None = None,
        quick_replies: list[dict[str, str]] | None = None,
        pending_action: dict[str, Any] | None = None,
    ) -> str:
        await self.connect()
        now = datetime.now(timezone.utc)
        mid = str(uuid.uuid4())
        await self._messages().insert_one(
            {
                "message_id": mid,
                "id": mid,
                "conversation_id": conversation_id,
                "patient_id": patient_id,
                "role": role,
                "content": content,
                "ui_components": ui_components,
                "quick_replies": quick_replies,
                "pending_action": pending_action,
                "tool_calls": tool_calls,
                "created_at": now,
            }
        )
        preview = self._normalize_preview(content)
        await self._sessions().update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_activity": now,
                    "last_message_preview": preview,
                    "last_message_role": role,
                    "archived": False,
                    "archived_at": None,
                },
                "$inc": {"message_count": 1},
            },
        )
        return mid

    async def get_recent_messages(
        self, conversation_id: str, limit: int = 24
    ) -> list[dict[str, Any]]:
        await self.connect()
        cur = self._messages().find({"conversation_id": conversation_id}).sort("created_at", -1).limit(limit)
        items = [x async for x in cur]
        items.reverse()
        return items

    async def get_history_paged(
        self, patient_id: str, conversation_id: str | None, limit: int, before: datetime | None
    ) -> list[dict[str, Any]]:
        await self.connect()
        q: dict[str, Any] = {"patient_id": patient_id}
        if conversation_id:
            q["conversation_id"] = conversation_id
        if before:
            q["created_at"] = {"$lt": before}
        cur = self._messages().find(q).sort("created_at", -1).limit(limit)
        return [x async for x in cur]

    async def list_sessions(
        self,
        patient_id: str,
        limit: int,
        before: str | None = None,
        include_archived: bool = False,
        search: str | None = None,
    ) -> dict[str, Any]:
        await self.connect()
        base_q: dict[str, Any] = {"patient_id": patient_id}
        if not include_archived:
            base_q["archived"] = {"$ne": True}
        q = dict(base_q)
        if search:
            regex = {"$regex": re.escape(search), "$options": "i"}
            q["$or"] = [{"title": regex}, {"last_message_preview": regex}]
        before_dt = self._parse_cursor(before)
        if before_dt:
            q["last_activity"] = {"$lt": before_dt}
        cur = self._sessions().find(q).sort([("last_activity", -1), ("conversation_id", -1)]).limit(limit + 1)
        raw = [x async for x in cur]
        has_more = len(raw) > limit
        raw = raw[:limit]
        items = [self._session_doc(x) for x in raw]
        next_before = None
        if has_more and raw:
            last = raw[-1]
            dt = last.get("last_activity") or last.get("created_at") or datetime.now(timezone.utc)
            if not isinstance(dt, datetime):
                dt = datetime.now(timezone.utc)
            next_before = self._cursor_key(dt, str(last.get("conversation_id") or ""))
        count_q = dict(base_q)
        if search:
            regex = {"$regex": re.escape(search), "$options": "i"}
            count_q["$or"] = [{"title": regex}, {"last_message_preview": regex}]
        total = await self._sessions().count_documents(count_q)
        return {"items": items, "has_more": has_more, "next_before": next_before, "total_conversations": total}

    async def rename_session(self, patient_id: str, conversation_id: str, title: str) -> dict[str, Any] | None:
        await self.connect()
        updated = await self._sessions().find_one_and_update(
            {"conversation_id": conversation_id, "patient_id": patient_id},
            {"$set": {"title": self._normalize_preview(title, 80), "last_activity": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        return self._session_doc(updated) if updated else None

    async def unarchive_session(self, patient_id: str, conversation_id: str) -> dict[str, Any] | None:
        await self.connect()
        updated = await self._sessions().find_one_and_update(
            {"conversation_id": conversation_id, "patient_id": patient_id},
            {"$set": {"archived": False, "archived_at": None, "last_activity": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        return self._session_doc(updated) if updated else None

    async def soft_delete_session(self, patient_id: str, conversation_id: str) -> int:
        await self.connect()
        now = datetime.now(timezone.utc)
        r = await self._sessions().update_one(
            {
                "conversation_id": conversation_id,
                "patient_id": patient_id,
            },
            {"$set": {"archived": True, "archived_at": now, "last_activity": now}},
        )
        if r.matched_count:
            return 1
        return 0

    async def get_session(self, patient_id: str, conversation_id: str) -> dict[str, Any] | None:
        await self.connect()
        return await self._sessions().find_one({"conversation_id": conversation_id, "patient_id": patient_id})

    async def get_latest_message(self, conversation_id: str) -> dict[str, Any] | None:
        await self.connect()
        return await self._messages().find_one({"conversation_id": conversation_id}, sort=[("created_at", -1)])

    # --- pending actions (writes) ---

    async def create_pending_action(
        self,
        patient_id: str,
        conversation_id: str,
        tool_name: str,
        args: dict[str, Any],
        ttl_seconds: int,
    ) -> str:
        await self.connect()
        token = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        from datetime import timedelta

        exp = now + timedelta(seconds=ttl_seconds)
        await self._pending().insert_one(
            {
                "action_token": token,
                "patient_id": patient_id,
                "conversation_id": conversation_id,
                "tool_name": tool_name,
                "args": args,
                "status": "pending",
                "created_at": now,
                "expires_at": exp,
            }
        )
        return token

    async def get_pending(self, action_token: str) -> dict[str, Any] | None:
        await self.connect()
        return await self._pending().find_one(
            {
                "action_token": action_token,
                "status": "pending",
            }
        )

    async def mark_pending_status(
        self, action_token: str, status: str, extra: dict[str, Any] | None = None
    ) -> None:
        await self.connect()
        u: dict[str, Any] = {"status": status, "updated_at": datetime.now(timezone.utc)}
        if extra:
            u["result"] = extra
        await self._pending().update_one({"action_token": action_token}, {"$set": u})

    async def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None
            self._db = None
