from __future__ import annotations

import json
import re
from collections.abc import Awaitable, Callable
from typing import Any, Optional

from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
import datetime

APPT_TYPES = ("consultation", "follow-up", "emergency")
APPT_MODES = ("physical", "online")
CANCEL_REASONS = ("emergency", "scheduling", "patient-request", "unavailable", "other")
CANCEL_BY = ("doctor", "patient")

_WRITE_PREFIX = "write_"


def _s(v: str, max_l: int = 800) -> str:
    if v is None:
        return ""
    t = v if len(v) <= max_l else v[:max_l] + "…(truncated)"
    return t


def _filter_providers(providers: Any, specialization: str | None, name: str | None) -> Any:
    if not isinstance(providers, list):
        return providers
    res = providers
    if specialization:
        sp_lower = specialization.lower()
        res = [p for p in res if isinstance(p, dict) and sp_lower in str(p.get("specialization") or "").lower()]
    if name:
        name_lower = name.lower()
        res = [p for p in res if isinstance(p, dict) and name_lower in str(p.get("name") or "").lower()]
    return res

def _filter_lab_tests(tests: Any, name: str | None) -> Any:
    if not isinstance(tests, list):
        return tests
    if name:
        name_lower = name.lower()
        return [t for t in tests if isinstance(t, dict) and name_lower in str(t.get("name") or "").lower()]
    return tests

# --- read tool implementations (called from dispatcher) ---

async def dispatch_read_tool(
    name: str,
    args: dict[str, Any],
    patient_id: str,
    gateway: Any,
    get_recommendations: Optional[Callable[[str], Awaitable[dict[str, Any] | None]]] = None,
) -> str:
    """Run a read tool and return JSON string for the ToolMessage."""
    try:
        if name == "read_list_doctors":
            d = await gateway.get_doctors()
            d = _filter_providers(d, args.get("specialization"), args.get("name"))
        elif name == "read_list_nutritionists":
            d = await gateway.get_nutritionists()
            d = _filter_providers(d, args.get("specialization"), args.get("name"))
        elif name == "read_list_lab_technicians":
            d = await gateway.get_lab_technicians()
            d = _filter_providers(d, None, args.get("name"))
        elif name == "read_list_lab_tests":
            d = await gateway.get_lab_tests()
            d = _filter_lab_tests(d, args.get("name"))
        elif name == "read_available_slots":
            d = await gateway.get_available_slots(
                str(args.get("provider_id", "")).strip(),
                str(args.get("role", "doctor")).strip().lower(),
                str(args.get("date", "")).strip(),
            )
        elif name == "read_my_appointments":
            d = await gateway.get_appointments_for_patient(patient_id)
        elif name == "read_active_prescriptions":
            all_prescriptions = await gateway.get_active_prescriptions(patient_id)
            d = []
            today = datetime.date.today().isoformat()
            include_expired = args.get("include_expired", False)
            if isinstance(all_prescriptions, list):
                for p in all_prescriptions:
                    end_date = p.get("endDate")
                    if include_expired or not end_date or end_date >= today:
                        d.append(p)
        elif name == "read_medication_logs":
            d = await gateway.get_medication_logs(
                patient_id,
                (args.get("from") or args.get("from_date") or None),
                (args.get("to") or args.get("to_date") or None),
            )
        elif name == "read_medical_records":
            d = await gateway.get_medical_records_patient(patient_id)
        elif name == "read_fitness_summary":
            d = await gateway.get_fitness(patient_id)
        elif name == "read_my_lab_bookings":
            d = await gateway.get_booked_lab_tests_patient(patient_id)
        elif name == "read_latest_recommendations":
            if not get_recommendations:
                d = {"error": "recommendations not available"}
            else:
                rec = await get_recommendations(patient_id)
                d = rec or {"message": "No stored recommendations for this patient yet."}
        elif name == "read_patient_journal":
            d = await gateway.get_patient_journal(patient_id, page=args.get("page", 1), limit=args.get("limit", 20))
        elif name == "analyze_medical_record_content":
            file_url = args.get("file_url")
            question = args.get("question")
            if not file_url:
                d = {"error": "file_url is required"}
            else:
                # Convert PDF to JPG for Cloudinary to allow Gemini to read it as an image
                image_url = file_url.replace(".pdf", ".jpg").replace(".PDF", ".jpg")
                from services.chatbot.graph import get_llm
                llm = get_llm()
                msg = HumanMessage(content=[
                    {"type": "text", "text": question},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ])
                try:
                    res = await llm.ainvoke([msg])
                    d = {"answer": res.content}
                except Exception as e:
                    d = {"error": f"Failed to analyze image: {e}"}
        else:
            d = {"error": f"unknown read tool: {name}"}
        return _s(json.dumps(d, default=str), 24000)
    except Exception as e:  # noqa: BLE001
        return _s(
            json.dumps(
                {
                    "error": str(e),
                }
            ),
        )


# --- Pydantic-free tool schemas for bind_tools: use @tool ---


@tool
def read_list_doctors(specialization: str | None = None, name: str | None = None, hide_from_ui: bool = False) -> str:
    """List registered doctors. Returns profiles including name, specialization, fee, rating, and working hours. Use this to find the "best" or highest rated doctor. Use specialization or name to filter and save tokens. Set hide_from_ui to true if you are just gathering info and don't want to display the full list to the user."""
    return "dispatch"


@tool
def read_list_nutritionists(specialization: str | None = None, name: str | None = None, hide_from_ui: bool = False) -> str:
    """List registered nutritionists. Returns profiles including name, specialization, fee, rating, and working hours. Use this to find the "best" or highest rated nutritionist. Use specialization or name to filter and save tokens. Set hide_from_ui to true if you are just gathering info and don't want to display the full list to the user."""
    return "dispatch"


@tool
def read_list_lab_technicians(name: str | None = None, hide_from_ui: bool = False) -> str:
    """List lab technicians (pathologists) available in the system. Use name to filter. Set hide_from_ui to true if you are just gathering info."""
    return "dispatch"


@tool
def read_list_lab_tests(name: str | None = None, hide_from_ui: bool = False) -> str:
    """List all lab tests / panels available to book in the system. Use name to filter. Set hide_from_ui to true if you are just gathering info."""
    return "dispatch"


@tool
def read_available_slots(
    provider_id: str,
    role: str,
    date: str,
) -> str:
    """
    Get available 1-hour appointment time slots for a provider on a date.
    provider_id: doctor or nutritionist user UUID.
    role: "doctor" or "nutritionist".
    date: YYYY-MM-DD.
    """
    return "dispatch"


@tool
def read_my_appointments(hide_from_ui: bool = False) -> str:
    """Load this patient's own appointments. Patient is inferred from the session — do not ask for the ID. Set hide_from_ui to true to read silently."""
    return "dispatch"


@tool
def read_active_prescriptions(include_expired: bool = False) -> str:
    """List this patient's prescriptions and medications. Set include_expired to true if the patient asks about past/expired prescriptions."""
    return "dispatch"


@tool
def read_medication_logs(from_date: str | None = None, to_date: str | None = None) -> str:
    """Medication adherence logs. Optional from_date, to_date as YYYY-MM-DD (maps to from/to)."""
    return "dispatch"


@tool
def read_medical_records() -> str:
    """List this patient's medical records. Patient is inferred from the session."""
    return "dispatch"


@tool
def read_fitness_summary() -> str:
    """Get latest fitness and nutrition roll-up (steps, sleep, water, calories, macros) for the patient."""
    return "dispatch"


@tool
def read_my_lab_bookings() -> str:
    """List the patient's booked lab test appointments."""
    return "dispatch"


@tool
def read_latest_recommendations() -> str:
    """Get the most recently generated care recommendations for this patient from the recommendation engine."""
    return "dispatch"


@tool
def read_patient_journal(page: int = 1, limit: int = 20) -> str:
    """List the patient's personal health journal entries (symptoms, mood, feelings). Patient is inferred from the session."""
    return "dispatch"

@tool
def analyze_medical_record_content(file_url: str, question: str) -> str:
    """Use AI to read and answer a question about the contents of a medical record (report, scan, image, pdf). Pass the 'file_url' of the record (from read_medical_records)."""
    return "dispatch"


@tool
def write_book_appointment(
    doctor_id: str,
    date: str,
    time: str,
    appt_type: str,
    mode: str,
    data_shared: bool = True,
    notes: str | None = None,
) -> str:
    """
    Propose booking a doctor or nutritionist appointment. Does NOT run until the user confirms in the UI.
    appt_type: "consultation", "follow-up", or "emergency".
    mode: "physical" or "online".
    date: YYYY-MM-DD. time: "HH:MM" or "HH:MM:SS".
    doctor_id: provider UUID. For nutritionist appointments, pass the nutritionist's user id and use read_available_slots first to pick a time.
    """
    return "dispatch"


@tool
def write_cancel_appointment(appointment_id: str, reason: str, notes: str | None = None) -> str:
    """
    Propose cancelling an existing appointment. Requires reason from: emergency, scheduling, patient-request, unavailable, other.
    cancelledBy is set to patient in the system.
    """
    return "dispatch"


@tool
def write_book_lab_test(
    test_id: str,
    scheduled_date: str,
    scheduled_time: str,
    location: str | None = None,
    instructions: str | None = None,
) -> str:
    """Propose booking a lab test. scheduled_date YYYY-MM-DD, time as HH:MM. 
    IMPORTANT: You MUST ask the user if they want the test "in-house" or "in lab" before calling this tool. 
    If "in lab", location should be one of "Hygieia Lab A", "Hygieia Lab B", or "Hygieia Lab C".
    If "in-house", ask the user for their address and pass it as the location. 
    Does not execute until confirmed."""
    return "dispatch"


@tool
def write_cancel_lab_booking(booking_id: str) -> str:
    """Propose cancelling a lab booking. Does not execute until confirmed."""
    return "dispatch"


@tool
def write_log_medication_taken(
    prescription_id: str,
    medication_id: str,
    scheduled_time: str | None = None,
) -> str:
    """Propose logging that the patient has taken a medication. taken=true is applied on server confirm."""
    return "dispatch"


ALL_READ_TOOLS: list = [
    read_list_doctors,
    read_list_nutritionists,
    read_list_lab_technicians,
    read_list_lab_tests,
    read_available_slots,
    read_my_appointments,
    read_active_prescriptions,
    read_medication_logs,
    read_medical_records,
    read_fitness_summary,
    read_my_lab_bookings,
    read_latest_recommendations,
    read_patient_journal,
    analyze_medical_record_content,
]
ALL_WRITE_TOOLS: list = [
    write_book_appointment,
    write_cancel_appointment,
    write_book_lab_test,
    write_cancel_lab_booking,
    write_log_medication_taken,
]
CHATBOT_TOOLS: list = ALL_READ_TOOLS + ALL_WRITE_TOOLS

WRITE_TOOL_NAMES = {t.name for t in ALL_WRITE_TOOLS}
READ_TOOL_NAMES = {t.name for t in ALL_READ_TOOLS}


def split_tool_calls(
    tool_calls: list[dict[str, Any]] | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not tool_calls:
        return [], []
    reads, writes = [], []
    for tc in tool_calls:
        n = tc.get("name") or ""
        if n.startswith("write_"):
            writes.append(tc)
        else:
            reads.append(tc)
    return reads, writes


def is_write_name(name: str) -> bool:
    return str(name or "").startswith(_WRITE_PREFIX)


def _is_valid_uuid(val: str) -> bool:
    """Check if value looks like a UUID (loose check)."""
    if not val or not isinstance(val, str):
        return False
    # Standard UUID format: 8-4-4-4-12 hex digits
    return bool(re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", val.lower()))


# --- Normalization of args from model (id vs args field) ---

def normalize_time(t: str) -> str:
    t = t.strip() if t else "09:00:00"
    if re.match(r"^\d{1,2}:\d{2}$", t):
        parts = t.split(":")
        h = int(parts[0])
        m = int(parts[1])
        return f"{h:02d}:{m:02d}:00"
    if re.match(r"^\d{2}:\d{2}:\d{2}$", t):
        return t
    return t


def coalesce_write_args(
    name: str,
    raw: dict[str, Any],
) -> dict[str, Any] | str:
    """Return cleaned args for persistence or a single-line error string."""
    if name == "write_book_appointment":
        d_id = (raw.get("doctor_id") or raw.get("doctorId") or "").strip()
        d = (raw.get("date") or "").strip()
        tm = normalize_time((raw.get("time") or "").strip())
        typ = (raw.get("appt_type") or raw.get("type") or "consultation").lower().replace("_", "-")
        if "follow" in typ:
            typ = "follow-up"
        m = (raw.get("mode") or "physical").lower()
        if typ not in APPT_TYPES:
            return f"Invalid appt_type {typ!r}, expected one of: {list(APPT_TYPES)}"
        if m not in APPT_MODES:
            return f"Invalid mode: use physical or online"
        if not all([d_id, d, tm]):
            return "doctor_id, date, and time are required to book an appointment"
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
            return "date must be YYYY-MM-DD"
                # Check if date is in the past (likely auto-generated)
        try:
                    from datetime import datetime as dt
                    booking_date = dt.strptime(d, "%Y-%m-%d").date()
                    today = dt.now().date()
                    if booking_date < today:
                        return f"The date {d} is in the past. Please ask the user for a future appointment date."
        except Exception:
                    pass  # If date parsing fails, let the appointment service handle it
        if not _is_valid_uuid(d_id):
            return f"doctor_id '{d_id}' is not valid. Please provide the UUID from the doctor list, not the name. Try asking for the list again and extracting the 'id' field."
        return {
            "doctor_id": d_id,
            "date": d,
            "time": tm,
            "type": typ,
            "mode": m,
            "data_shared": bool(raw.get("data_shared", True)),
            "notes": raw.get("notes") or None,
        }
    if name == "write_cancel_appointment":
        aid = (raw.get("appointment_id") or raw.get("appointmentId") or "").strip()
        reason = (raw.get("reason") or "patient-request").lower()
        if reason not in CANCEL_REASONS:
            return f"Invalid reason; use {list(CANCEL_REASONS)}"
        if not aid:
            return "appointment_id is required"
        return {
            "appointment_id": aid,
            "reason": reason,
            "notes": raw.get("notes") or None,
            "cancelledBy": "patient",
        }
    if name == "write_book_lab_test":
        tid = (raw.get("test_id") or raw.get("testId") or "").strip()
        sd = (raw.get("scheduled_date") or raw.get("scheduledDate") or "").strip()
        st = (raw.get("scheduled_time") or raw.get("scheduledTime") or "").strip()
        if not all([tid, sd, st]):
            return "test_id, scheduled_date, scheduled_time are required"
        inst = raw.get("instructions")
        if isinstance(inst, str):
            inst = [inst] if inst else None
        return {
            "testId": tid,
            "patientId": "",  # filled in executor
            "scheduledDate": sd,
            "scheduledTime": st,
            "location": raw.get("location") or None,
            "instructions": inst,
        }
    if name == "write_cancel_lab_booking":
        bid = (raw.get("booking_id") or raw.get("bookingId") or "").strip()
        if not bid:
            return "booking_id is required"
        return {"booking_id": bid}
    if name == "write_log_medication_taken":
        pid = (raw.get("prescription_id") or raw.get("prescriptionId") or "").strip()
        mid = (raw.get("medication_id") or raw.get("medicationId") or "").strip()
        if not pid or not mid:
            return "prescription_id and medication_id are required"
        return {
            "prescriptionId": pid,
            "medicationId": mid,
            "scheduledTime": raw.get("scheduled_time") or raw.get("scheduledTime") or None,
        }
    return "unknown write tool"


def human_summary_for_write(name: str, args: dict[str, Any]) -> str:
    if name == "write_book_appointment":
        return f"Book {args.get('type')} on {args.get('date')} at {args.get('time')} — mode: {args.get('mode')}"
    if name == "write_cancel_appointment":
        return f"Cancel appointment {args.get('appointment_id')}"
    if name == "write_book_lab_test":
        return f"Book lab test {args.get('testId')} for {args.get('scheduledDate')} {args.get('scheduledTime')}"
    if name == "write_cancel_lab_booking":
        return f"Cancel lab booking {args.get('booking_id')}"
    if name == "write_log_medication_taken":
        return f"Log medication {args.get('medicationId')} (prescription {args.get('prescriptionId')})"
    return str(args)


# Quick reply suggestions from read tool payloads
def build_quick_replies(
    name: str,
    payload_json: str,
    count: int = 4,
) -> list[dict[str, str]]:
    try:
        p = json.loads(payload_json) if payload_json else {}
    except json.JSONDecodeError:
        return []
    out: list[dict[str, str]] = []
    if name == "read_list_doctors" and isinstance(p, list):
        for d in p[:count]:
            if not isinstance(d, dict):
                continue
            n = d.get("name", "doctor")
            oid = d.get("id", "")
            if oid:
                out.append({"label": f"View {n}", "send": f"Show me available slots for doctor {oid} on 2026-01-20"})
    return out  # can be empty; real templates need user date
