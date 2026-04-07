import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.recommendation_service import RecommendationService

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("apscheduler").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

service: RecommendationService | None = None
scheduler: AsyncIOScheduler | None = None


class RefreshAllResponse(BaseModel):
    status: str
    total: int | None = None
    success: int | None = None
    failed: int | None = None


async def run_generation_job(trigger: str) -> None:
    if not service:
        logger.warning("Recommendation service not initialized; skipping %s run", trigger)
        return

    logger.info("Starting recommendation generation (%s)", trigger)
    result = await service.run_daily_generation()
    logger.info(
        "Recommendation generation finished (%s): total=%s success=%s failed=%s",
        trigger,
        result.get("total"),
        result.get("success"),
        result.get("failed"),
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    global service, scheduler

    service = RecommendationService()

    scheduler = AsyncIOScheduler(timezone=os.getenv("SCHEDULER_TIMEZONE", "UTC"))
    run_hour = int(os.getenv("RECOMMENDATION_CRON_HOUR", "12"))
    run_minute = int(os.getenv("RECOMMENDATION_CRON_MINUTE", "0"))
    scheduler.add_job(run_generation_job, "cron", args=["daily"], hour=run_hour, minute=run_minute)
    scheduler.start()

    yield

    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="Patient Recommendation Service",
    version="1.0.0",
    description="LangGraph + Groq patient recommendation service with scheduled generation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "patient-recommendations",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "scheduler": "running" if scheduler and scheduler.running else "stopped",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/recommendations/{patient_id}")
async def get_latest_recommendation(patient_id: str):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    latest = await service.get_latest_recommendations(patient_id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recommendations found for patient",
        )
    return latest


@app.get("/recommendations/{patient_id}/history")
async def get_recommendation_history(patient_id: str, limit: int = Query(default=10, ge=1, le=50)):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    return await service.get_recommendation_history(patient_id=patient_id, limit=limit)


@app.post("/recommendations/{patient_id}/refresh")
async def refresh_patient_recommendation(patient_id: str):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    try:
        return await service.generate_and_store_for_patient(patient_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {exc}",
        ) from exc


@app.post("/recommendations/refresh-all", response_model=RefreshAllResponse)
async def refresh_all_recommendations():
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    result = await service.run_daily_generation()
    return result


if __name__ == "__main__":
    port = int(os.getenv("PORT", 4012))
    logger.info("Starting Recommendation Service on port %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)
