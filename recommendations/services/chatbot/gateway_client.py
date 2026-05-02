from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 60.0
MAX_RETRIES = 2


class GatewayError(Exception):
    def __init__(self, message: str, status_code: int | None = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


def _redact(s: str, max_len: int = 500) -> str:
    if not s or len(s) <= max_len:
        return s
    return s[:max_len] + "…"


class GatewayClient:
    """Async HTTP client for Hygieia api-gateway (port 4000 by default)."""

    def __init__(self) -> None:
        base = os.getenv("API_GATEWAY_URL", "http://localhost:4000").rstrip("/")
        self._base = base
        self._default_headers: dict[str, str] = {}
        auth = os.getenv("CHATBOT_GATEWAY_SERVICE_TOKEN", "").strip()
        if auth:
            self._default_headers["Authorization"] = auth

    def set_auth_forward(self, authorization: str | None) -> None:
        """Set Authorization for this process (e.g. Bearer from incoming /chat). Clears if None."""
        if not authorization or not str(authorization).strip():
            self._default_headers.pop("Authorization", None)
            return
        self._default_headers["Authorization"] = str(authorization).strip()

    def _client(self) -> httpx.AsyncClient:
        h = {**self._default_headers, "Content-Type": "application/json", "Accept": "application/json"}
        return httpx.AsyncClient(
            base_url=self._base,
            timeout=httpx.Timeout(DEFAULT_TIMEOUT),
            follow_redirects=True,
            headers=h,
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: Any = None,
    ) -> Any:
        last_err: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                async with self._client() as client:
                    r = await client.request(method, path, params=params, json=json_body)
                    if r.status_code == 204:
                        return None
                    try:
                        data = r.json()
                    except json.JSONDecodeError:
                        data = r.text
                    if not r.is_success:
                        msg = f"{method} {path} failed: {r.status_code} {_redact(str(data))}"
                        raise GatewayError(msg, status_code=r.status_code, body=data)
                    return data
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                last_err = e
                logger.warning("Gateway request retry %s %s: %s", method, path, e)
                await asyncio.sleep(0.4 * (attempt + 1))
        if last_err:
            raise last_err
        raise RuntimeError("unreachable")

    # --- read endpoints ---

    async def get_doctors(self) -> Any:
        return await self._request("GET", "/doctors")

    async def get_nutritionists(self) -> Any:
        return await self._request("GET", "/nutritionists")

    async def get_lab_technicians(self) -> Any:
        return await self._request("GET", "/lab-technicians")

    async def get_lab_tests(self) -> Any:
        return await self._request("GET", "/lab-tests")

    async def get_available_slots(self, provider_id: str, role: str, date: str) -> Any:
        return await self._request(
            "GET",
            "/appointments/available-slots",
            params={"providerId": provider_id, "role": role, "date": date},
        )

    async def get_appointments_for_patient(self, patient_id: str) -> Any:
        return await self._request("GET", "/appointments/patient", params={"patientId": patient_id})

    async def get_appointment(self, appointment_id: str) -> Any:
        return await self._request("GET", f"/appointments/{appointment_id}")

    async def get_active_prescriptions(self, patient_id: str) -> Any:
        return await self._request("GET", f"/appointments/prescriptions/patient/{patient_id}")

    async def get_medication_logs(
        self, patient_id: str, date_from: str | None = None, date_to: str | None = None
    ) -> Any:
        params: dict[str, str] = {"patientId": patient_id}
        if date_from:
            params["from"] = date_from
        if date_to:
            params["to"] = date_to
        return await self._request("GET", "/appointments/prescriptions/medications/logs", params=params)

    async def get_medical_records_patient(self, patient_id: str) -> Any:
        return await self._request("GET", f"/medical-records/patient/{patient_id}")

    async def get_fitness(self, user_id: str) -> Any:
        return await self._request("GET", "/fitness", params={"userId": user_id})

    async def get_booked_lab_tests_patient(self, patient_id: str) -> Any:
        return await self._request("GET", f"/booked-lab-tests/patient/{patient_id}")

    async def get_patient_journal(self, patient_id: str, page: int = 1, limit: int = 20) -> Any:
        return await self._request("GET", f"/patient-journal/entries/{patient_id}", params={"page": page, "limit": limit})

    # --- write endpoints ---

    async def post_appointment(self, body: dict[str, Any]) -> Any:
        return await self._request("POST", "/appointments", json_body=body)

    async def patch_cancel_appointment(
        self, appointment_id: str, body: dict[str, Any], nutritionist_id: str
    ) -> Any:
        # API expects nutritionistId + dto fields in body; gateway forwards to microservice
        payload = {
            "nutritionistId": nutritionist_id,
            "reason": body.get("reason"),
            "notes": body.get("notes"),
            "cancelledBy": body.get("cancelledBy"),
        }
        return await self._request("PATCH", f"/appointments/{appointment_id}/cancel", json_body=payload)

    async def post_book_lab(self, body: dict[str, Any]) -> Any:
        return await self._request("POST", "/booked-lab-tests", json_body=body)

    async def patch_cancel_booking(self, booking_id: str) -> Any:
        return await self._request("PATCH", f"/booked-lab-tests/{booking_id}/cancel")

    async def post_medication_taken(self, body: dict[str, Any]) -> Any:
        return await self._request("POST", "/appointments/prescriptions/medications/taken", json_body=body)
