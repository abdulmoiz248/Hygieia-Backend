from __future__ import annotations

import json
import logging
import time
import os
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

import asyncio
import jwt

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from supabase import Client, create_client

from services.recommendation_service import RecommendationService
from services.chatbot import cards
from services.chatbot.gateway_client import GatewayClient, GatewayError
from services.chatbot.graph import build_system_prompt, get_llm, make_confirm_copy, run_guardrails
from services.chatbot.repository import ChatRepository
from services.chatbot.tools import (
    CHATBOT_TOOLS,
    coalesce_write_args,
    dispatch_read_tool,
    human_summary_for_write,
    split_tool_calls,
)

logger = logging.getLogger(__name__)

MAX_LOOP = 8
DEFAULT_TTL = 600


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _make_default_title(text: str) -> str:
    clean = " ".join((text or "").split()).strip()
    if not clean:
        return "Chat"
    words = clean.split()
    title = " ".join(words[:6])
    if len(title) > 60:
        title = title[:57].rstrip() + "…"
    return title


def _doc_to_base_messages(doc: dict[str, Any]) -> list[BaseMessage]:
    r = (doc.get("role") or "user").lower()
    c = str(doc.get("content") or "")
    if r == "assistant":
        return [AIMessage(content=c)]
    if r in ("user", "human"):
        return [HumanMessage(content=c)]
    if r == "system":
        return [SystemMessage(content=c)]
    return [HumanMessage(content=c)]


def _normalize_text(content: Any) -> str:
    if isinstance(content, list):
        return " ".join(
            p.get("text", str(p)) if isinstance(p, dict) else str(p) for p in content
        )
    if content is None:
        return ""
    return str(content).strip()


class ChatbotService:
    def __init__(self, recommendation_service: Optional[RecommendationService] = None) -> None:
        self._recommendation = recommendation_service
        self._gateway = GatewayClient()
        mongo_uri = os.getenv("MONGODB_URI", "").strip()
        mongo_db = os.getenv("MONGODB_DATABASE", "hygieia")
        self._repo: Optional[ChatRepository] = (
            ChatRepository(mongo_uri, mongo_db) if mongo_uri else None
        )
        s_url = os.getenv("SUPABASE_URL", "")
        s_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self._supabase: Optional[Client] = create_client(s_url, s_key) if s_url and s_key else None
        self._llm: Optional[Any] = None
        self._llm_with_tools: Optional[Any] = None

    def _extract_token_subject(self, auth_header: str | None) -> str | None:
        if not auth_header:
            return None
        token = auth_header.strip()
        if token.lower().startswith("bearer "):
            token = token.split(" ", 1)[1].strip()
        if not token:
            return None
        secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")
        try:
            if secret:
                payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
            else:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            subject = payload.get("sub") or payload.get("user_id") or payload.get("uid")
            return str(subject) if subject else None
        except Exception:
            return None

    def _require_owner(self, patient_id: str, auth_header: str | None) -> None:
        subject = self._extract_token_subject(auth_header)
        if subject and subject != patient_id:
            raise PermissionError("Token subject does not match patientId")

    def _bind_llm(self) -> Any:
        if self._llm_with_tools is not None:
            return self._llm_with_tools
        self._llm = get_llm()
        self._llm_with_tools = self._llm.bind_tools(CHATBOT_TOOLS, tool_choice="auto")
        return self._llm_with_tools

    async def get_recs(self, patient_id: str) -> dict[str, Any] | None:
        if not self._recommendation:
            return None
        return await self._recommendation.get_latest_recommendations(patient_id)

    def _envelope(
        self,
        conversation_id: str,
        text: str,
        ui: list[dict[str, Any]],
        pending: dict[str, Any] | None,
        quick: list[dict[str, str]] | None,
        t0: float,
        err: str | None = None,
    ) -> dict[str, Any]:
        model = os.getenv("CHATBOT_GROQ_MODEL") or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        m: dict[str, Any] = {
            "model": model,
            "latency_ms": int((time.time() - t0) * 1000),
        }
        if err:
            m["error"] = err
        return {
            "conversation_id": conversation_id,
            "message": {
                "role": "assistant",
                "content": text,
                "created_at": datetime.now(timezone.utc)
                .isoformat()
                .replace("+00:00", "Z"),
            },
            "ui_components": ui,
            "quick_replies": quick or [],
            "pending_action": pending,
            "meta": m,
        }

    async def _ensure_title(self, patient_id: str, conversation_id: str, text: str) -> None:
        if not self._repo:
            return
        session = await self._repo.get_session(patient_id, conversation_id)
        if not session:
            return
        current_title = str(session.get("title") or "Chat")
        if current_title and current_title != "Chat":
            return
        await self._repo.rename_session(patient_id, conversation_id, _make_default_title(text))

    async def handle_message(
        self,
        patient_id: str,
        messages: List[dict[str, Any]],
        conversation_id: str | None = None,
        confirm_action_token: str | None = None,
        auth_header: str | None = None,
    ) -> dict[str, Any]:
        t0 = time.time()
        self._gateway.set_auth_forward(auth_header)
        try:
            self._require_owner(patient_id, auth_header)
        except PermissionError as exc:
            return self._envelope(
                str(uuid.uuid4()),
                str(exc),
                [cards.make_error_card("Unauthorized", str(exc))],
                None,
                None,
                t0,
                "forbidden",
            )
        if confirm_action_token and self._repo and conversation_id:
            return await self.confirm_action(
                patient_id, conversation_id, confirm_action_token, auth_header, t0
            )
        if not self._repo:
            return self._envelope(
                str(uuid.uuid4()),
                "Chat is unavailable (MONGODB_URI is not set).",
                [cards.make_error_card("Config", "Set MONGODB_URI to enable the chatbot.")],
                None,
                None,
                t0,
                "config",
            )
        if not messages:
            return self._envelope(
                str(uuid.uuid4()),
                "No messages in request.",
                [cards.make_error_card("Request", "Send a messages array.")],
                None,
                None,
                t0,
                "validation",
            )
        last_user = str((messages[-1] or {}).get("content") or "").strip()
        if not last_user:
            return self._envelope(
                str(uuid.uuid4()),
                "Message content is empty.",
                [cards.make_error_card("Request", "Last message must have content.")],
                None,
                None,
                t0,
                "validation",
            )
        await self._repo.connect()
        conv = await self._repo.ensure_session(patient_id, conversation_id, title=_make_default_title(last_user))
        await self._repo.append_message(conv, "user", last_user, patient_id)
        await self._ensure_title(patient_id, conv, last_user)
        prof = await self._build_profile(patient_id)
        n_turns = int(os.getenv("CHATBOT_MAX_TURNS", "12")) * 2 + 8
        hist = await self._repo.get_recent_messages(conv, n_turns)
        lm: list[BaseMessage] = [SystemMessage(content=build_system_prompt())]
        if prof:
            lm.append(SystemMessage(content=f"Patient context: {prof}"))
        for d in hist:
            if (d.get("content") or "").strip():
                lm.extend(_doc_to_base_messages(d))
        g = get_llm()
        oos, _h = await run_guardrails(g, last_user)
        if oos:
            t = (
                "I can help you use Hygieia: find doctors, lab tests, appointments, prescriptions, "
                "records, and fitness. I can’t diagnose or prescribe — please see a clinician in the app when needed."
            )
            await self._repo.append_message(
                conv, "assistant", t, patient_id, ui_components=None, tool_calls=None
            )
            return self._envelope(
                conv,
                t,
                [cards.make_text_card(t)],
                None,
                None,
                t0,
            )
        return await self._run_agent(
            patient_id, conv, lm, t0, auth_header
        )

    async def _build_profile(self, patient_id: str) -> str:
        if not self._supabase:
            return ""

        def _q() -> str:
            try:
                r = self._supabase.table("users").select("id, email, role").eq("id", patient_id).execute()  # type: ignore[union-attr]
                if not (r and r.data):
                    return f"user_id={patient_id}"
                return f"user_id={patient_id}; account exists"
            except Exception:
                return f"user_id={patient_id}"

        return await asyncio.to_thread(_q)

    @staticmethod
    def _get_tool_call_parts(tc: Any) -> tuple[str, dict[str, Any], str]:
        if isinstance(tc, dict):
            name = str(tc.get("name", "") or "")
            tid = str(tc.get("id", "") or uuid.uuid4().hex)
            a = tc.get("args", {})
            if not isinstance(a, dict):
                a = {}
            if not name and isinstance(tc.get("function"), dict):
                fn = tc.get("function") or {}
                name = str(fn.get("name", ""))
                raw = fn.get("arguments", "{}")
                try:
                    a = json.loads(raw) if isinstance(raw, str) else a
                except Exception:
                    a = {}
            return name, a, tid
        name = str(getattr(tc, "name", "") or "")
        a = dict(getattr(tc, "args", None) or {})
        tid = str(getattr(tc, "id", None) or uuid.uuid4().hex)
        return name, a, tid

    def _tcalls_to_list(self, tool_calls: Any) -> list[dict[str, Any]]:
        if not tool_calls:
            return []
        out: list[dict[str, Any]] = []
        for t in tool_calls:
            n, a, i = self._get_tool_call_parts(t)
            out.append({"name": n, "args": a, "id": i})
        return out

    async def _run_agent(
        self,
        patient_id: str,
        conv: str,
        base_msgs: list[BaseMessage],
        t0: float,
        _auth: str | None,
    ) -> dict[str, Any]:
        if not self._repo:
            return self._envelope(
                conv, "No repository", [], None, None, t0, "config"
            )
        self._bind_llm()
        assert self._llm_with_tools is not None
        messages: list[BaseMessage] = list(base_msgs)
        ui_acc: list[dict[str, Any]] = []

        async def _recc_impl(pid: str) -> dict[str, Any] | None:
            return await self.get_recs(pid)

        for _ in range(MAX_LOOP):
            ai: AIMessage = await self._llm_with_tools.ainvoke(messages)
            tcl = self._tcalls_to_list(getattr(ai, "tool_calls", None) or None)
            if not tcl:
                final = _normalize_text(getattr(ai, "content", None) or ai.content)  # type: ignore[union-attr]
                if not final and ui_acc:
                    final = "Here is what I found — see the details below."
                if not final and not ui_acc:
                    final = "I couldn’t complete that. Try your appointments, labs, or records."
                await self._repo.append_message(
                    conv,
                    "assistant",
                    final,
                    patient_id,
                    ui_components=ui_acc or None,
                    tool_calls=None,
                    quick_replies=None,
                    pending_action=None,
                )
                return self._envelope(conv, final, ui_acc, None, None, t0)
            tdicts = tcl
            read_c, write_c = split_tool_calls(
                [
                    {
                        "name": x.get("name"),
                        "args": x.get("args", {}),
                        "id": x.get("id"),
                    }
                    for x in tdicts
                ]
            )
            if write_c:
                w = write_c[0]
                n = str(w.get("name", ""))
                targs: dict[str, Any] = dict(
                    (w.get("args") or {}) if isinstance(w.get("args"), dict) else {}
                )
                wid = str(w.get("id", "") or "tool")
                coalesced: dict[str, Any] | str = coalesce_write_args(n, targs)
                if isinstance(coalesced, str):
                    messages.append(ai)
                    messages.append(
                        ToolMessage(
                            content=coalesced,
                            tool_call_id=wid,
                            name=n,
                        )
                    )
                    continue
                cleaned = dict(coalesced) if isinstance(coalesced, dict) else coalesced
                ttl = int(
                    os.getenv("CHATBOT_PENDING_ACTION_TTL_SECONDS", str(DEFAULT_TTL))
                )
                token = await self._repo.create_pending_action(
                    patient_id, conv, n, cleaned, ttl
                )
                summ = human_summary_for_write(n, cleaned)
                pend: dict[str, Any] = {
                    "action": n.replace("write_", "", 1),
                    "action_token": token,
                    "summary": summ,
                    "args": cleaned,
                }
                final_text = make_confirm_copy(n, summ)
                ui_block = list(ui_acc) + [
                    cards.make_booking_confirmation(token, n, summ, cleaned)
                ]
                await self._repo.append_message(
                    conv,
                    "assistant",
                    final_text,
                    patient_id,
                    ui_components=ui_block,
                    tool_calls=None,
                    quick_replies=None,
                    pending_action=pend,
                )
                return self._envelope(
                    conv,
                    final_text,
                    ui_block,
                    pend,
                    None,
                    t0,
                )
            messages.append(ai)
            for tc in read_c:
                name = str(tc.get("name", ""))
                raw: dict[str, Any] = dict(
                    (tc.get("args") or {}) if isinstance(tc.get("args"), dict) else {}
                )
                if name == "read_medication_logs":
                    if "from" not in raw and raw.get("from_date"):
                        raw["from"] = raw.get("from_date")
                    if "to" not in raw and raw.get("to_date"):
                        raw["to"] = raw.get("to_date")
                t_str = await dispatch_read_tool(
                    name,
                    raw,
                    patient_id,
                    self._gateway,
                    get_recommendations=_recc_impl,
                )
                try:
                    data: Any = json.loads(t_str)
                except Exception:
                    data = {"raw": t_str}
                c = cards.card_for_read_tool(name, data)
                if c and isinstance(c, dict):
                    ui_acc.append(c)
                w_id = str(tc.get("id", "x"))
                messages.append(
                    ToolMessage(
                        content=t_str,
                        tool_call_id=w_id,
                        name=name,
                    )
                )
        return self._envelope(
            conv,
            "I stopped after the maximum number of tool steps. Try a simpler request.",
            ui_acc,
            None,
            None,
            t0,
        )

    async def confirm_action(
        self,
        patient_id: str,
        conversation_id: str,
        action_token: str,
        auth_header: str | None,
        t0: float,
    ) -> dict[str, Any]:
        return await self._run_confirm(
            patient_id, conversation_id, action_token, auth_header, t0
        )

    async def _run_confirm(
        self,
        patient_id: str,
        conversation_id: str,
        action_token: str,
        auth_header: str | None,
        t0: float,
    ) -> dict[str, Any]:
        self._gateway.set_auth_forward(auth_header)
        try:
            self._require_owner(patient_id, auth_header)
        except PermissionError as exc:
            return self._envelope(
                conversation_id,
                str(exc),
                [cards.make_error_card("Unauthorized", str(exc))],
                None,
                None,
                t0,
                "forbidden",
            )
        if not self._repo:
            return self._envelope(
                conversation_id,
                "Service unavailable",
                [cards.make_error_card("Error", "Persistence not configured.")],
                None,
                None,
                t0,
                "config",
            )
        await self._repo.connect()
        pdoc = await self._repo.get_pending(action_token)
        if (
            not pdoc
            or pdoc.get("patient_id") != patient_id
            or pdoc.get("conversation_id") != conversation_id
        ):
            return self._envelope(
                conversation_id,
                "This action is no longer valid.",
                [cards.make_error_card("Expired", "Confirmation expired. Start the action again in chat.")],
                None,
                None,
                t0,
                "forbidden",
            )
        name = str(pdoc.get("tool_name", ""))
        args: dict[str, Any] = dict(pdoc.get("args") or {})
        u: list[dict[str, Any]] = []
        out: str
        try:
            if name == "write_book_appointment":
                body: dict[str, Any] = {
                    "patientId": patient_id,
                    "doctorId": args["doctor_id"],
                    "date": args["date"],
                    "time": args["time"],
                    "status": "upcoming",
                    "type": args["type"],
                    "mode": args["mode"],
                    "dataShared": args.get("data_shared", True),
                }
                if args.get("notes"):
                    body["notes"] = args["notes"]
                d = await self._gateway.post_appointment(body)
                u = [cards.map_appointment_one(d) if isinstance(d, dict) else cards.make_text_card("Booked")]
                out = "Your appointment is booked in the app."
            elif name == "write_cancel_appointment":
                ap = await self._gateway.get_appointment(str(args.get("appointment_id", "")))
                if not isinstance(ap, dict):
                    raise ValueError("Could not load appointment")
                ap_pid = str(ap.get("patientId", ap.get("patient_id", "")) or "")
                if ap_pid and ap_pid != patient_id:
                    raise ValueError("This appointment is not for your account")
                prov = str(
                    (ap or {}).get("doctorId", "")
                    or (ap or {}).get("doctor_id", "")
                )
                if not prov:
                    raise ValueError("Provider id missing for cancellation")
                cbody = {
                    "reason": args.get("reason", "patient-request"),
                    "notes": args.get("notes") or None,
                    "cancelledBy": "patient",
                }
                d = await self._gateway.patch_cancel_appointment(
                    str(args.get("appointment_id", "")), cbody, prov
                )
                u = [
                    cards.make_action_result(
                        True, "Cancelled", "The appointment was cancelled.",
                        data=d
                    )
                ]
                out = "The appointment was cancelled."
            elif name == "write_book_lab_test":
                b: dict[str, Any] = {
                    "testId": str(args.get("testId", "")),
                    "patientId": patient_id,
                    "scheduledDate": str(args.get("scheduledDate", "")),
                    "scheduledTime": str(args.get("scheduledTime", "")),
                }
                if args.get("location"):
                    b["location"] = args["location"]
                if args.get("instructions"):
                    b["instructions"] = args["instructions"]
                d = await self._gateway.post_book_lab(b)
                u = [
                    cards.make_action_result(
                        True, "Booked", "Your lab test was booked in the app.", data=d
                    )
                ]
                out = "Your lab test booking is confirmed."
            elif name == "write_cancel_lab_booking":
                d = await self._gateway.patch_cancel_booking(
                    str(args.get("booking_id", ""))
                )
                u = [cards.make_action_result(True, "Cancelled", "Lab booking cancelled.", data=d)]
                out = "Lab booking cancelled."
            elif name == "write_log_medication_taken":
                b2: dict[str, Any] = {
                    "patientId": patient_id,
                    "prescriptionId": str(args.get("prescriptionId", "")),
                    "medicationId": str(args.get("medicationId", "")),
                    "taken": True,
                    "takenAt": datetime.now(timezone.utc)
                    .isoformat()
                    .replace("+00:00", "Z"),
                }
                if args.get("scheduledTime") or args.get("scheduled_time"):
                    b2["scheduledTime"] = str(
                        args.get("scheduledTime") or args.get("scheduled_time")
                    )
                b2["source"] = "patient-chatbot"
                d = await self._gateway.post_medication_taken(b2)
                u = [
                    cards.make_action_result(
                        True, "Saved", "Medication taken was logged.",
                        data=d
                    )
                ]
                out = "Logged that you took your medication."
            else:
                raise ValueError(f"Unknown action: {name}")
        except (GatewayError, ValueError) as e:
            await self._repo.mark_pending_status(
                action_token, "failed", extra={"err": str(e)}
            )
            return self._envelope(
                conversation_id,
                str(e),
                [cards.make_error_card("Action failed", str(e))],
                None,
                None,
                t0,
                "action_error",
            )
        await self._repo.mark_pending_status(
            action_token, "confirmed", extra={"ok": True}
        )
        await self._repo.append_message(
            conversation_id,
            "assistant",
            out,
            patient_id,
            tool_calls=None,
            ui_components=u,
            quick_replies=None,
            pending_action=None,
        )
        return {
            "conversation_id": conversation_id,
            "message": {
                "role": "assistant",
                "content": out,
                "created_at": (
                    datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                ),
            },
            "ui_components": u,
            "quick_replies": [],
            "pending_action": None,
            "meta": {
                "model": os.getenv("CHATBOT_GROQ_MODEL", "llama-3.3-70b-versatile"),
                "latency_ms": int((time.time() - t0) * 1000),
            },
        }

    async def get_conversations(
        self,
        patient_id: str,
        limit: int,
        before: str | None,
        include_archived: bool,
        search: str | None,
        auth_header: str | None,
    ) -> dict[str, Any]:
        if not self._repo:
            return {"items": [], "has_more": False, "next_before": None, "total_conversations": 0}
        self._gateway.set_auth_forward(auth_header)
        self._require_owner(patient_id, auth_header)
        return await self._repo.list_sessions(patient_id, min(limit, 200), before, include_archived, search)

    async def rename_conversation(
        self,
        patient_id: str,
        conversation_id: str,
        title: str,
        auth_header: str | None,
    ) -> dict[str, Any]:
        if not self._repo:
            raise RuntimeError("Repository unavailable")
        self._gateway.set_auth_forward(auth_header)
        self._require_owner(patient_id, auth_header)
        updated = await self._repo.rename_session(patient_id, conversation_id, title)
        if not updated:
            raise FileNotFoundError("Conversation not found")
        return updated

    async def unarchive_conversation(
        self,
        patient_id: str,
        conversation_id: str,
        auth_header: str | None,
    ) -> dict[str, Any]:
        if not self._repo:
            raise RuntimeError("Repository unavailable")
        self._gateway.set_auth_forward(auth_header)
        self._require_owner(patient_id, auth_header)
        updated = await self._repo.unarchive_session(patient_id, conversation_id)
        if not updated:
            raise FileNotFoundError("Conversation not found")
        return updated

    async def get_history(
        self,
        patient_id: str,
        conversation_id: str | None,
        limit: int,
        before: str | None,
        auth_header: str | None,
    ) -> dict[str, Any]:
        if not self._repo:
            return {"items": [], "has_more": False, "next_before": None}
        self._gateway.set_auth_forward(auth_header)
        self._require_owner(patient_id, auth_header)
        await self._repo.connect()
        before_dt = None
        if before:
            try:
                s = before.replace("Z", "+00:00") if before.endswith("Z") else before
                before_dt = datetime.fromisoformat(s)
            except Exception:
                before_dt = None
        raw = await self._repo.get_history_paged(
            patient_id, conversation_id, min(limit, 200) + 1, before_dt
        )
        has_more = len(raw) > limit
        raw = raw[:limit]
        items = [self._repo._message_doc(row) for row in raw]
        items.reverse()
        next_before = None
        if has_more and raw:
            last = raw[-1]
            dt = last.get("created_at") or datetime.now(timezone.utc)
            if not isinstance(dt, datetime):
                dt = datetime.now(timezone.utc)
            next_before = self._repo._cursor_key(dt, str(last.get("message_id") or last.get("id") or ""))
        return {"items": items, "has_more": has_more, "next_before": next_before}

    async def delete_conversation(
        self, patient_id: str, conversation_id: str
    ) -> int:
        if not self._repo:
            return 0
        await self._repo.connect()
        return await self._repo.soft_delete_session(patient_id, conversation_id)
