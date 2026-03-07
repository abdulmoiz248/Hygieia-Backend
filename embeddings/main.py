import logging
import os
from datetime import datetime
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from services.embeddings_service import EmbeddingsService

from dotenv import load_dotenv
load_dotenv()


if not os.getenv("GROQ_API_KEY"):
    print("GROQ_API_KEY is not set. RAG functionality will be unavailable.")
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CV Embeddings and RAG Service",
    description=(
        "Microservice for generating CV embeddings, semantic retrieval, and "
        "Groq-powered retrieval-augmented generation."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embeddings_service = EmbeddingsService()


class GenerateEmbeddingsRequest(BaseModel):
    cv_id: str = Field(..., description="Unique CV identifier")
    cv_url: str = Field(..., description="Public URL to CV PDF")
    email: EmailStr = Field(..., description="Candidate email")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class CVMetadata(BaseModel):
    cv_id: str
    email: str
    cv_url: str
    created_at: str


class SearchResult(BaseModel):
    cv_id: str
    email: str
    cv_url: str
    similarity_score: float


class RagAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=6, ge=1, le=20)
    min_similarity: float = Field(default=0.15, ge=0, le=1)
    model: Optional[str] = Field(default=None, max_length=120)
    temperature: float = Field(default=0.2, ge=0, le=1)


class RagSource(BaseModel):
    source_id: str
    cv_id: str
    email: str
    cv_url: str
    similarity_score: float


class RagRetrieval(BaseModel):
    chunks_considered: int
    chunks_used: int
    min_similarity: float
    model: Optional[str] = None


class RagAskResponse(BaseModel):
    answer: str
    sources: List[RagSource]
    retrieval: RagRetrieval


@app.get("/")
async def root():
    return {
        "service": "CV Embeddings and RAG Service",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/cv/health")
async def health_check():
    try:
        stats = embeddings_service.get_stats()
        rag_status = embeddings_service.rag_ready()
        return {
            "status": "healthy",
            "stats": stats,
            "rag": rag_status,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy",
        ) from exc


@app.get("/rag/health")
async def rag_health_check():
    try:
        return {
            "status": "healthy",
            "rag": embeddings_service.rag_ready(),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error("RAG health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service unhealthy",
        ) from exc


@app.post("/cv/generate-embeddings", status_code=status.HTTP_201_CREATED)
async def generate_embeddings(request: GenerateEmbeddingsRequest):
    logger.info("[EMBEDDINGS] Generating embeddings for CV: %s", request.cv_id)

    try:
        result = await embeddings_service.generate_and_store_embeddings(
            cv_id=request.cv_id,
            cv_url=request.cv_url,
            email=request.email,
        )

        logger.info("[EMBEDDINGS] Successfully generated embeddings for CV: %s", request.cv_id)
        return {
            "message": "Embeddings generated successfully",
            "cv_id": request.cv_id,
            "chunks_processed": result.get("chunks_processed", 0),
        }
    except ValueError as exc:
        logger.error("[EMBEDDINGS] Validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[EMBEDDINGS] Error generating embeddings: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {exc}",
        ) from exc


@app.post("/cv/search", response_model=List[SearchResult])
async def search_similar_cvs(request: SearchRequest):
    logger.info("[EMBEDDINGS] Searching similar CVs for query prefix: %s", request.query[:50])

    try:
        results = await embeddings_service.search_similar(query=request.query, top_k=request.top_k)
        return results
    except ValueError as exc:
        logger.error("[EMBEDDINGS] Search validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[EMBEDDINGS] Search error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {exc}",
        ) from exc


@app.post("/rag/ask", response_model=RagAskResponse)
async def ask_rag(request: RagAskRequest):
    logger.info("[RAG] Received question with top_k=%s", request.top_k)

    try:
        return await embeddings_service.ask_rag(
            question=request.question,
            top_k=request.top_k,
            min_similarity=request.min_similarity,
            model=request.model,
            temperature=request.temperature,
        )
    except ValueError as exc:
        logger.error("[RAG] Validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("[RAG] LLM call error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate answer from Groq.",
        ) from exc
    except Exception as exc:
        logger.error("[RAG] Unexpected error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected RAG error.",
        ) from exc


@app.get("/cv/embeddings/{cv_id}")
async def get_cv_embeddings(cv_id: str):
    logger.info("[EMBEDDINGS] Retrieving metadata for CV: %s", cv_id)

    try:
        metadata = embeddings_service.get_cv_metadata(cv_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No embeddings found for CV: {cv_id}",
            )

        return metadata
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[EMBEDDINGS] Error retrieving metadata: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve embeddings: {exc}",
        ) from exc


@app.get("/cv/embeddings", response_model=List[CVMetadata])
async def list_all_embeddings():
    logger.info("[EMBEDDINGS] Listing all CV embeddings")

    try:
        return embeddings_service.list_all_embeddings()
    except Exception as exc:
        logger.error("[EMBEDDINGS] Error listing embeddings: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list embeddings: {exc}",
        ) from exc


@app.delete("/cv/embeddings/{cv_id}", status_code=status.HTTP_200_OK)
async def delete_embeddings(cv_id: str):
    logger.info("[EMBEDDINGS] Deleting embeddings for CV: %s", cv_id)

    try:
        success = embeddings_service.delete_embeddings(cv_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No embeddings found for CV: {cv_id}",
            )

        return {"message": "Embeddings deleted successfully", "cv_id": cv_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[EMBEDDINGS] Error deleting embeddings: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embeddings: {exc}",
        ) from exc


@app.get("/cv/stats")
async def get_statistics():
    try:
        return embeddings_service.get_stats()
    except Exception as exc:
        logger.error("[EMBEDDINGS] Error getting stats: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {exc}",
        ) from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT", 4008))
    logger.info("[EMBEDDINGS] Starting service on port %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)
