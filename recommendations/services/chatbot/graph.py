from __future__ import annotations
"""
LLM guardrails, system prompt, and Groq model factory.

The read/write + tool-calling control loop lives in `ChatbotService._run_agent`
(semantically equivalent to a small LangGraph: agent -> route writes vs execute reads -> loop).
"""

import json
import logging
import re
import os
from typing import Any

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

logger = logging.getLogger(__name__)


SINGLE_CLASSIFIER_PROMPT = (
    "You are a triage for a health platform assistant (Hygieia) that can only help with: "
    "browsing providers (doctors, nutritionists, lab techs), lab tests and bookings, appointments, "
    "fitness, prescriptions, medical records, and in-app care recommendations. "
    "The user is NOT a diagnosis bot — refuse to diagnose or give treatment plans, but you may "
    "direct them to book a professional. "
    "If the last user message is ONLY asking for diagnosis / prescription changes / emergency triage, "
    'reply with out_of_scope: true. Otherwise out_of_scope: false. '
    "Return ONLY JSON: {\"out_of_scope\": bool, \"hint\": \"one sentence\"}"
)


async def run_guardrails(
    llm: ChatGroq,
    user_text: str,
) -> tuple[bool, str | None]:
    """Return (is_out_of_scope, optional hint)."""
    try:
        def _invoke() -> str:
            r = llm.invoke(
                [
                    SystemMessage(content=SINGLE_CLASSIFIER_PROMPT),
                    HumanMessage(content=f"User message: {user_text}"),
                ]
            )
            c = r.content
            if isinstance(c, list):
                c = " ".join(str(p) for p in c)
            return str(c).strip()

        import asyncio

        raw = await asyncio.to_thread(_invoke)
        m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not m:
            return False, None
        data = json.loads(m.group(0))
        oos = bool(data.get("out_of_scope"))
        return oos, str(data.get("hint") or "") or None
    except Exception as e:  # noqa: BLE001
        logger.warning("Guardrails failed (continuing as in-scope): %s", e)
        return False, None


def build_system_prompt() -> str:
    return (
        "You are Hygieia’s patient coach. You can help the user navigate their care: find doctors, "
        "nutritionists, lab staff, list lab tests, see available slots, book and cancel (after user "
        "confirms in the app), read prescriptions, medication logs, medical records, fitness, lab "
        "bookings, and the latest in-app care recommendations. "
        "You MUST use tools to fetch up-to-date data. Never fabricate names, times, or IDs. "
           "\n*** MANDATORY APPOINTMENT BOOKING FLOW ***\n"
           "RULE 1 - PROVIDER ID EXTRACTION (CRITICAL):\n"
           "  If user mentions a provider by name (e.g., 'Abdul Moiz Iqbal'), you MUST:\n"
           "  a) Use read_list_doctors or read_list_nutritionists to get the full list\n"
           "  b) Find the matching provider in that list\n"
           "  c) Extract ONLY the 'id' field (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)\n"
           "  d) NEVER use the name, email, or any other field as the provider ID\n"
           "  If you pass anything other than a valid UUID as doctor_id, the system will reject it.\n"
           "\nRULE 2 - DATE/TIME COLLECTION (MANDATORY BEFORE BOOKING):\n"
           "  Before calling write_book_appointment, ALWAYS ask the user:\n"
           "  'What date and time would you prefer for your appointment?'\n"
           "  Do NOT propose any date yourself. Wait for the user to respond.\n"
           "\nRULE 3 - SHOW AVAILABLE SLOTS (BEFORE PROPOSING):\n"
           "  Once user provides date, call read_available_slots with:\n"
           "  - provider_id (the UUID from the list)\n"
           "  - role ('doctor' or 'nutritionist')\n"
           "  - date (YYYY-MM-DD format)\n"
           "  Show the user the available time slots and ask them to pick one.\n"
           "\nRULE 4 - CONFIRM DATE/TIME BEFORE BOOKING:\n"
           "  Only after user explicitly confirms the date AND time, call write_book_appointment.\n"
           "\nFOR ALL WRITE ACTIONS (booking, cancel, medication):\n"
           "The user must confirm in the app — never claim an action is complete until confirmed.\n"
           "Default appointment type: 'consultation'. Default mode: 'physical'.\n"
        "The patient is already known from the session: never ask for the patient’s UUID. "
        "If data is empty, say so. Keep answers concise. "
        "Do not provide medical diagnosis or change prescriptions yourself."
    )


def get_llm() -> ChatGroq:
    model = os.getenv("CHATBOT_GROQ_MODEL") or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError("GROQ_API_KEY is required for chatbot")
    return ChatGroq(api_key=key, model=model, temperature=0.1)


# --- minimal helpers for final reply when we skip second LLM ---

def make_confirm_copy(tool_name: str, summary: str) -> str:
    return (
        f"I've prepared the following. Please **confirm** or **cancel** in the app before it goes through: "
        f"\n{summary}\n"
        f'Tip: tap "Confirm" on the card, or type "cancel".'
    )
