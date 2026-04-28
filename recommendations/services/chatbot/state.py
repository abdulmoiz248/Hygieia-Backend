from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional, TypedDict


@dataclass
class PendingActionRecord:
    action_token: str
    tool_name: str
    args: dict[str, Any]
    conversation_id: str
    patient_id: str


# LangGraph / pipeline state (used between nodes)
@dataclass
class PipelineState:
    patient_id: str
    conversation_id: str
    messages: list[Any]  # list of BaseMessage
    ui_components: list[dict[str, Any]] = field(default_factory=list)
    quick_replies: list[dict[str, str]] = field(default_factory=list)
    pending_action: Optional[dict[str, Any]] = None
    guardrail_halt: bool = False
    out_of_scope_message: Optional[str] = None
    # Aggregated from read tool executions
    read_tool_payloads: list[dict[str, Any]] = field(default_factory=list)
    final_assistant_text: str = ""
    # Last AI + tool call tracking for a single turn
    iteration: int = 0


# Typed response chunk for the HTTP envelope (for docs and typing hints)
class ChatState(TypedDict, total=False):
    conversation_id: str
    patient_id: str
    ui_components: list[dict[str, Any]]
    quick_replies: list[dict[str, str]]
    pending_action: Optional[dict[str, Any]]
    meta: dict[str, Any]


@dataclass
class ChatMessageDoc:
    role: str
    content: str
    ui_components: list[dict[str, Any]] | None = None
    created_at: Optional[datetime] = None
    id: str | None = None


@dataclass
class ChatSessionDoc:
    conversation_id: str
    patient_id: str
    title: str = "Chat"
    created_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    archived: bool = False
