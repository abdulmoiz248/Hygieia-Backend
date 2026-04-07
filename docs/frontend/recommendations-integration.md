# Recommendations API Integration (Frontend)

This document explains how frontend apps should consume patient recommendations through API Gateway.

## Base URL

- Local: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`

## Endpoints

### 1) Get latest recommendations for patient

- **GET** `/recommendations/:patientId`
- Response shape:

```json
{
  "statusCode": 200,
  "message": "Latest recommendations fetched successfully",
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "recommendations": [
      {
        "type": "fitness",
        "title": "...",
        "description": "...",
        "priority": "high",
        "timeframe": "immediately",
        "doctorId": null,
        "specialization": null,
        "conditions": null
      }
    ],
    "generated_at": "2026-04-07T17:39:58.605866+00:00",
    "source": "langgraph-groq"
  },
  "success": true
}
```

### 2) Get recommendation history

- **GET** `/recommendations/:patientId/history?limit=10`
- `limit` range: `1..50`

### 3) Refresh recommendations for one patient

- **POST** `/recommendations/:patientId/refresh`
- Triggers immediate generation and persistence for that patient.

### 4) Refresh recommendations for all patients

- **POST** `/recommendations/refresh-all`
- Triggers batch generation for all patients.

## Frontend assumptions

- Exactly **3 recommendations** are returned per generation.
- Recommendation `type` is one of:
  - `fitness`, `sleep`, `nutrition`, `medication`, `doctor`, `disease_risk`, `lab_test`
- If `type !== "doctor"`, `doctorId` and `specialization` are `null`.
- If `type !== "disease_risk"`, `conditions` is `null`.

## Error handling

- `404`: No recommendations found yet for this patient.
- `503`: Recommendations service unavailable.
- `500`: Upstream/internal failure.

## Suggested UI flow

1. On dashboard load, call `GET /recommendations/:patientId`.
2. If 404, show empty state with button **Generate Recommendations**.
3. On button click, call `POST /recommendations/:patientId/refresh` then refetch latest.
4. Optional: show history via `GET /recommendations/:patientId/history`.
