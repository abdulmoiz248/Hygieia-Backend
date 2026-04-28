from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Final

# --- UI component builders (stable `type` discriminators) ---

TEXT: Final = "text"
DOCTOR_LIST: Final = "doctor_list"
NUTRITIONIST_LIST: Final = "nutritionist_list"
LAB_TECH_LIST: Final = "lab_technician_list"
LAB_TEST_LIST: Final = "lab_test_list"
AVAILABLE_SLOTS: Final = "available_slots"
APPOINTMENT_LIST: Final = "appointment_list"
APPOINTMENT_CARD: Final = "appointment_card"
PRESCRIPTION_LIST: Final = "prescription_list"
MEDICATION_LOG_LIST: Final = "medication_log_list"
MEDICAL_RECORD_LIST: Final = "medical_record_list"
FITNESS_SUMMARY: Final = "fitness_summary"
LAB_BOOKING_LIST: Final = "lab_booking_list"
RECOMMENDATION_LIST: Final = "recommendation_list"
BOOKING_CONFIRMATION: Final = "booking_confirmation"
ACTION_RESULT: Final = "action_result"
QUICK_REPLIES: Final = "quick_replies"
ERROR_CARD: Final = "error_card"


def _strip_none(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


def make_text_card(body: str) -> dict[str, Any]:
    return {"type": TEXT, "body": body}


def make_error_card(title: str, body: str) -> dict[str, Any]:
    return {"type": ERROR_CARD, "title": title, "body": body}


def make_quick_replies(items: list[dict[str, str]]) -> dict[str, Any]:
    return {"type": QUICK_REPLIES, "items": items}


def _provider_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return _strip_none(
        {
            "id": row.get("id"),
            "name": row.get("name") or row.get("email", "").split("@")[0] or "Provider",
            "email": row.get("email"),
            "phone": row.get("phone"),
            "img": row.get("img"),
            "gender": row.get("gender"),
            "specialization": row.get("specialization"),
        }
    )


def map_doctors_list(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": DOCTOR_LIST, "items": []}
    return {"type": DOCTOR_LIST, "items": [_provider_from_row(x) for x in raw if isinstance(x, dict)]}


def map_nutritionists_list(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": NUTRITIONIST_LIST, "items": []}
    return {"type": NUTRITIONIST_LIST, "items": [_provider_from_row(x) for x in raw if isinstance(x, dict)]}


def map_lab_techs_list(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": LAB_TECH_LIST, "items": []}
    return {"type": LAB_TECH_LIST, "items": [_provider_from_row(x) for x in raw if isinstance(x, dict)]}


def map_lab_tests(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": LAB_TEST_LIST, "items": []}
    items: list[dict[str, Any]] = []
    for t in raw:
        if not isinstance(t, dict):
            continue
        items.append(
            _strip_none(
                {
                    "id": t.get("id"),
                    "name": t.get("name"),
                    "code": t.get("code") or t.get("test_code"),
                    "description": t.get("description") or t.get("details"),
                    "price": t.get("price"),
                }
            )
        )
    return {"type": LAB_TEST_LIST, "items": items}


def map_available_slots(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {
            "type": AVAILABLE_SLOTS,
            "provider_id": "",
            "role": "doctor",
            "date": "",
            "slots": [],
            "message": None,
        }
    raw_slots = raw.get("availableSlots") or raw.get("slots") or []
    out_slots: list[dict[str, Any]] = []
    for s in raw_slots:
        if isinstance(s, dict) and s.get("time") is not None:
            out_slots.append({"time": s.get("time"), "location": s.get("location")})
    extra_msg: str | None
    m = raw.get("message")
    if isinstance(m, str):
        extra_msg = m
    else:
        extra_msg = None
    return {
        "type": AVAILABLE_SLOTS,
        "provider_id": str(raw.get("providerId", raw.get("provider_id", ""))),
        "role": str(raw.get("role", "doctor")),
        "date": str(raw.get("date", "")),
        "slots": out_slots,
        "message": extra_msg,
    }


def _appt_from_row(x: dict[str, Any]) -> dict[str, Any]:
    return _strip_none(
        {
            "id": x.get("id"),
            "patientId": x.get("patientId") or x.get("patient_id"),
            "doctorId": x.get("doctorId") or x.get("doctor_id"),
            "date": x.get("date"),
            "time": x.get("time"),
            "status": x.get("status"),
            "type": x.get("type"),
            "mode": x.get("mode"),
            "notes": x.get("notes"),
            "link": x.get("link"),
        }
    )


def map_appointments(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": APPOINTMENT_LIST, "items": []}
    return {
        "type": APPOINTMENT_LIST,
        "items": [_appt_from_row(x) for x in raw if isinstance(x, dict)],
    }


def map_appointment_one(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"type": APPOINTMENT_CARD, **_appt_from_row({})}
    return {"type": APPOINTMENT_CARD, **_appt_from_row(raw)}


def map_prescriptions(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": PRESCRIPTION_LIST, "items": []}
    return {"type": PRESCRIPTION_LIST, "items": raw}


def map_medication_logs(raw: Any) -> dict[str, Any]:
    return {"type": MEDICATION_LOG_LIST, "items": raw if isinstance(raw, list) else [raw] if raw else []}


def map_medical_records(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": MEDICAL_RECORD_LIST, "items": []}
    items: list[dict[str, Any]] = []
    for r in raw:
        if not isinstance(r, dict):
            continue
        items.append(
            {
                "id": r.get("id"),
                "title": r.get("title"),
                "record_type": r.get("record_type"),
                "date": r.get("date"),
                "file_url": r.get("file_url") or r.get("fileUrl"),
                "doctor_name": r.get("doctor_name") or r.get("doctorName"),
            }
        )
    return {"type": MEDICAL_RECORD_LIST, "items": items}


def map_fitness(raw: Any) -> dict[str, Any]:
    r = raw if isinstance(raw, dict) else {}
    return {
        "type": FITNESS_SUMMARY,
        "steps": r.get("steps", 0),
        "water": r.get("water", 0),
        "sleep": r.get("sleep", 0),
        "calories_burned": r.get("calories_burned", 0),
        "calories_intake": r.get("calories_intake", 0),
        "protein": r.get("protein", 0),
        "fat": r.get("fat", 0),
        "carbs": r.get("carbs", 0),
    }


def map_lab_bookings(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, list):
        return {"type": LAB_BOOKING_LIST, "items": []}
    return {"type": LAB_BOOKING_LIST, "items": raw}


def map_recommendations(latest: dict[str, Any] | None) -> dict[str, Any] | None:
    if not latest or not isinstance(latest, dict):
        return None
    recs = latest.get("recommendations", [])
    return {
        "type": RECOMMENDATION_LIST,
        "record_id": latest.get("id"),
        "patient_id": latest.get("patient_id"),
        "generated_at": latest.get("generated_at"),
        "recommendations": recs,
    }


def make_booking_confirmation(
    action_token: str,
    action: str,
    summary: str,
    tool_args: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": BOOKING_CONFIRMATION,
        "action_token": action_token,
        "action": action,
        "summary": summary,
        "tool_args": tool_args,
        "confirm_label": "Confirm",
        "cancel_label": "Cancel",
    }


def make_action_result(
    success: bool, title: str, body: str, deeplink: str | None = None, data: Any = None
) -> dict[str, Any]:
    c: dict[str, Any] = {
        "type": ACTION_RESULT,
        "status": "success" if success else "error",
        "title": title,
        "body": body,
    }
    if deeplink:
        c["deeplink"] = deeplink
    if data is not None:
        c["data"] = data
    return c


# Map a tool name + result payload to a UI list element
def card_for_read_tool(name: str, result: Any) -> dict[str, Any] | None:
    m = {
        "read_list_doctors": map_doctors_list,
        "read_list_nutritionists": map_nutritionists_list,
        "read_list_lab_technicians": map_lab_techs_list,
        "read_list_lab_tests": map_lab_tests,
        "read_available_slots": map_available_slots,
        "read_my_appointments": map_appointments,
        "read_active_prescriptions": map_prescriptions,
        "read_medication_logs": map_medication_logs,
        "read_medical_records": map_medical_records,
        "read_fitness_summary": map_fitness,
        "read_my_lab_bookings": map_lab_bookings,
    }
    fn = m.get(name)
    if fn is None:
        if name == "read_latest_recommendations":
            if isinstance(result, dict) and result.get("recommendations") is not None:
                return map_recommendations(result)  # type: ignore[arg-type]
            if isinstance(result, dict) and result.get("message"):
                return make_text_card(str(result.get("message", ""))[:2000])
            return make_text_card(json.dumps(result, default=str)[:2000])
        return make_text_card(json.dumps(result, default=str)[:4000])
    return fn(result)
