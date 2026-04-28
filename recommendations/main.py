import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

from services.recommendation_service import RecommendationService
from services.chatbot.service import ChatbotService

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
chatbot: ChatbotService | None = None
scheduler: AsyncIOScheduler | None = None


class RefreshAllResponse(BaseModel):
    status: str
    total: int | None = None
    success: int | None = None
    failed: int | None = None
    failures: list[dict[str, str]] | None = None
    finished_at: str | None = None


class RecommendationItemResponse(BaseModel):
    type: str
    title: str
    description: str
    priority: str
    timeframe: str
    doctorId: str | None = None
    specialization: str | None = None
    conditions: list[str] | None = None


class RecommendationRecordResponse(BaseModel):
    id: str
    patient_id: str
    recommendations: list[RecommendationItemResponse]
    generated_at: str
    source: str | None = None


class RecommendationGenerationResponse(BaseModel):
    patient_id: str
    generated_count: int
    record_id: str | None = None
    generated_at: str | None = None


class ModelStatusResponse(BaseModel):
    status: str
    loaded: bool
    path: str
    source_url: str | None = None
    downloaded: bool | None = None
    loaded_via: str | None = None
    artifact_type: str | None = None
    loaded_at: str | None = None
    size_bytes: int | None = None
    error: str | None = None


class AcnePredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]
    model_status: ModelStatusResponse


class DentalPredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]
    model_status: dict[str, object]


class HealthResponse(BaseModel):
    status: str
    scheduler: str
    model: ModelStatusResponse
    timestamp: str


class RootResponse(BaseModel):
    service: str
    status: str
    timestamp: str


class ChatMessageIn(BaseModel):
    role: str = "user"
    content: str


class ChatRequestBody(BaseModel):
    patient_id: str = Field(..., description="Patient (user) UUID")
    messages: List[ChatMessageIn] = Field(..., min_length=1)
    conversation_id: str | None = None
    confirm_action_token: str | None = None


class ChatConfirmBody(BaseModel):
    patient_id: str
    conversation_id: str
    action_token: str


class ChatConversationRenameBody(BaseModel):
    patient_id: str
    title: str = Field(..., min_length=1, max_length=80)


class ChatConversationUnarchiveBody(BaseModel):
    patient_id: str


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
    global service, chatbot, scheduler

    service = RecommendationService()
    chatbot = ChatbotService(recommendation_service=service)
    await service.ensure_model_ready()
    await service.ensure_dental_model_ready()

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


@app.post("/chat", tags=["Chat"], summary="Patient chatbot (LangGraph + Groq)")
async def post_chat(
    body: ChatRequestBody,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    return await chatbot.handle_message(
        body.patient_id,
        [m.model_dump() for m in body.messages],
        body.conversation_id,
        body.confirm_action_token,
        auth_header=authorization,
    )


@app.post("/chat/confirm", tags=["Chat"], summary="Confirm a pending write action")
async def post_chat_confirm(
    body: ChatConfirmBody,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    return await chatbot.confirm_action(
        body.patient_id,
        body.conversation_id,
        body.action_token,
        authorization,
        time.time(),
    )


@app.get("/chat/conversations/{patient_id}", tags=["Chat"], summary="List patient conversations")
async def get_chat_conversations(
    patient_id: str,
    limit: int = Query(20, ge=1, le=200),
    before: str | None = None,
    include_archived: bool = Query(False),
    search: str | None = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    try:
        return await chatbot.get_conversations(patient_id, limit, before, include_archived, search, authorization)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@app.get("/chat/history/{patient_id}", tags=["Chat"], summary="Chat message history")
async def get_chat_history(
    patient_id: str,
    conversation_id: str | None = Query(default=None, alias="conversation_id"),
    limit: int = Query(50, ge=1, le=200),
    before: str | None = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    try:
        return await chatbot.get_history(patient_id, conversation_id, limit, before, authorization)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@app.patch("/chat/{conversation_id}/title", tags=["Chat"], summary="Rename a chat conversation")
async def patch_chat_title(
    conversation_id: str,
    body: ChatConversationRenameBody,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    try:
        return await chatbot.rename_conversation(body.patient_id, conversation_id, body.title, authorization)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@app.post("/chat/{conversation_id}/unarchive", tags=["Chat"], summary="Unarchive a chat conversation")
async def post_chat_unarchive(
    conversation_id: str,
    body: ChatConversationUnarchiveBody,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    try:
        return await chatbot.unarchive_conversation(body.patient_id, conversation_id, authorization)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@app.delete("/chat/{conversation_id}", tags=["Chat"], summary="Archive a chat session")
async def delete_chat(
    conversation_id: str,
    patient_id: str = Query(..., description="Required to verify ownership"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    if not chatbot:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")
    try:
        chatbot._require_owner(patient_id, authorization)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    n = await chatbot.delete_conversation(patient_id, conversation_id)
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"ok": True, "conversation_id": conversation_id, "archived_at": datetime.now(timezone.utc).isoformat()}


@app.get("/", response_model=RootResponse, summary="Service root", tags=["System"])
async def root():
    return {
        "service": "patient-recommendations",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health", response_model=HealthResponse, summary="Health check", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "scheduler": "running" if scheduler and scheduler.running else "stopped",
        "model": service.get_model_status()
        if service
        else {
            "status": "unavailable",
            "loaded": False,
            "path": "",
            "source_url": None,
            "downloaded": False,
            "loaded_via": None,
            "artifact_type": None,
            "loaded_at": None,
            "size_bytes": None,
            "error": None,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get(
    "/model/status",
    response_model=ModelStatusResponse,
    summary="Model bootstrap status",
    tags=["Model"],
)
async def model_status():
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    return service.get_model_status()


@app.get(
    "/recommendations/{patient_id}",
    response_model=RecommendationRecordResponse,
    summary="Get latest recommendations for a patient",
    tags=["Recommendations"],
)
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


@app.get(
    "/recommendations/{patient_id}/history",
    response_model=list[RecommendationRecordResponse],
    summary="Get recommendation history for a patient",
    tags=["Recommendations"],
)
async def get_recommendation_history(patient_id: str, limit: int = Query(default=10, ge=1, le=50)):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    return await service.get_recommendation_history(patient_id=patient_id, limit=limit)


@app.post(
    "/recommendations/{patient_id}/refresh",
    response_model=RecommendationGenerationResponse,
    summary="Regenerate recommendations for a patient",
    tags=["Recommendations"],
)
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


@app.post(
    "/recommendations/refresh-all",
    response_model=RefreshAllResponse,
    summary="Generate recommendations for all patients",
    tags=["Recommendations"],
)
async def refresh_all_recommendations():
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    result = await service.run_daily_generation()
    return result


@app.post(
    "/predict-acne",
    response_model=AcnePredictionResponse,
    summary="Predict acne class from an uploaded image",
    tags=["Acne Prediction"],
)
async def predict_acne(image: UploadFile = File(..., description="Acne image to classify")):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty")

    try:
        return await service.predict_acne(image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@app.post(
    "/predict-dental",
    response_model=DentalPredictionResponse,
    summary="Predict dental condition class from an uploaded image",
    tags=["Dental Prediction"],
)
async def predict_dental(image: UploadFile = File(..., description="Dental image to classify")):
    if not service:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty")

    try:
        return await service.predict_dental(image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT", 4012))
    logger.info("Starting Recommendation Service on port %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)
