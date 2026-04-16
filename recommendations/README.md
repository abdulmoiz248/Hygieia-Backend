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
- `MONGODB_URI` (optional profile enrichment)
- `MONGODB_DATABASE` (default: `hygieia`)

## Endpoints

- `GET /health`
- `GET /recommendations/{patient_id}`
- `GET /recommendations/{patient_id}/history?limit=10`
- `GET /model/status`
- `POST /predict-acne`
- `POST /recommendations/{patient_id}/refresh`
- `POST /recommendations/refresh-all`

## Run locally

```bash
pip install -r requirements.txt
python main.py
```
