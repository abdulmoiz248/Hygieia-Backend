# Patient Recommendation Service

FastAPI microservice that generates personalized patient recommendations using **LangGraph + Groq** and stores them in Supabase.

## Features

- LangGraph workflow for context build + recommendation generation
- Groq LLM inference (`llama-3.3-70b-versatile` by default)
- Generates exactly `3` recommendations per patient
- Runs recommendation generation:
  - daily at `12:00` (configurable)
  - manually through refresh endpoints
- Stores each generation in `patient_recommendations` table
- Retrieval endpoints for latest and history
- Downloads the trained model from Google Drive on startup if it is missing locally
- Loads the model artifact into memory during startup
- Predicts acne from an uploaded image
- Downloads dental model artifacts from Google Drive (zip supported) when missing
- Predicts dental conditions from an uploaded image
- **Patient chatbot** (LangGraph + Groq): doctors, lab tests, appointments, prescriptions, records, fitness, recommendations; see [CHATBOT_FRONTEND.md](CHATBOT_FRONTEND.md)

## Environment Variables

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

Optional:

- `PORT` (default: `4012`)
- `GROQ_MODEL` (default: `llama-3.3-70b-versatile`)
- `RECOMMENDATIONS_TABLE` (default: `patient_recommendations`)
- `RECOMMENDATION_CRON_HOUR` (default: `12`)
- `RECOMMENDATION_CRON_MINUTE` (default: `0`)
- `RECOMMENDATION_BATCH_DELAY_SECONDS` (default: `30`)
- `SCHEDULER_TIMEZONE` (default: `UTC`)
- `RECOMMENDATIONS_MODEL_DRIVE_URL` (default: Google Drive shared file URL)
- `RECOMMENDATIONS_MODEL_PATH` (default: `models/recommendation_model.pth`)
- `DENTAL_MODEL_DRIVE_URL` (default: Google Drive shared file URL)
- `DENTAL_MODEL_PATH` (default: `models/dental_model/best_model.pth`)
- `DENTAL_MODEL_METADATA_PATH` (default: `models/dental_model/model_metadata.json`)
- `MONGODB_URI` (required for the **chatbot**; optional for legacy profile enrichment in recommendations)
- `MONGODB_DATABASE` (default: `hygieia`)
- `API_GATEWAY_URL` (default `http://localhost:4000` — where chat **tools** call; must match the running **api-gateway**)
- `CHATBOT_GROQ_MODEL` (overrides `GROQ_MODEL` for chat; default: `llama-3.3-70b-versatile`)
- `CHATBOT_MAX_TURNS` (history window, default: `12`)
- `CHATBOT_PENDING_ACTION_TTL_SECONDS` (default: `600`)

`RECOMMENDATIONS_SERVICE_URL` on the **api-gateway** must point to this service (e.g. `http://localhost:4012`).

## Patient chatbot (LangGraph + Groq)

- Persists **sessions and messages in MongoDB**; tools call the **Hygieia API gateway** (HTTP) for live data.
- **Write** actions (book/cancel, log medication) require a **second step**: `POST /chat/confirm` with the `action_token` from the response, or the same field on `POST /chat`.
- Public HTTP surface on this service: `POST /chat`, `POST /chat/confirm`, `GET /chat/history/{patient_id}`, `DELETE /chat/{conversation_id}`.
- **Web/mobile clients** should call the **api-gateway** (`/recommendations/chat`, etc.); see [CHATBOT_FRONTEND.md](CHATBOT_FRONTEND.md).

## Endpoints

- `GET /health`
- `GET /recommendations/{patient_id}`
- `GET /recommendations/{patient_id}/history?limit=10`
- `GET /model/status`
- `POST /predict-acne`
- `POST /predict-dental`
- `POST /recommendations/{patient_id}/refresh`
- `POST /recommendations/refresh-all`
- `POST /chat`, `POST /chat/confirm`, `GET /chat/history/{patient_id}`, `DELETE /chat/{conversation_id}` (chatbot)
- Via **api-gateway**: `POST /recommendations/chat`, `POST /recommendations/chat/confirm`, `GET /recommendations/chat/history/:patientId`, `DELETE /recommendations/chat/:conversationId`

## Run locally

```bash
pip install -r requirements.txt
python main.py
```
