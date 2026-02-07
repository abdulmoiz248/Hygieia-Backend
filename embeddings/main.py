from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uvicorn
import os
import logging
from datetime import datetime

from services.embeddings_service import EmbeddingsService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CV Embeddings Service",
    description="Microservice for generating and managing CV embeddings using FAISS",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize embeddings service
embeddings_service = EmbeddingsService()


class GenerateEmbeddingsRequest(BaseModel):
    cv_id: str
    cv_url: str
    email: EmailStr


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "CV Embeddings Service",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/cv/health")
async def health_check():
    """Detailed health check"""
    try:
        stats = embeddings_service.get_stats()
        return {
            "status": "healthy",
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )


@app.post("/cv/generate-embeddings", status_code=status.HTTP_201_CREATED)
async def generate_embeddings(request: GenerateEmbeddingsRequest):
    """
    Generate embeddings for a CV document
    
    This endpoint:
    1. Downloads the CV from the provided URL
    2. Extracts text from the PDF
    3. Generates embeddings using sentence transformers
    4. Stores embeddings in FAISS index
    """
    logger.info(f"[EMBEDDINGS] Generating embeddings for CV: {request.cv_id}")
    
    try:
        result = await embeddings_service.generate_and_store_embeddings(
            cv_id=request.cv_id,
            cv_url=request.cv_url,
            email=request.email
        )
        
        logger.info(f"[EMBEDDINGS] Successfully generated embeddings for CV: {request.cv_id}")
        return {
            "message": "Embeddings generated successfully",
            "cv_id": request.cv_id,
            "chunks_processed": result.get("chunks_processed", 0)
        }
    except ValueError as e:
        logger.error(f"[EMBEDDINGS] Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Error generating embeddings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )


@app.post("/cv/search", response_model=List[SearchResult])
async def search_similar_cvs(request: SearchRequest):
    """
    Search for similar CVs using semantic search
    
    Args:
        query: Search query (job description, skills, etc.)
        top_k: Number of results to return (default: 5)
    """
    logger.info(f"[EMBEDDINGS] Searching for similar CVs with query: {request.query[:50]}...")
    
    try:
        results = await embeddings_service.search_similar(
            query=request.query,
            top_k=request.top_k
        )
        
        logger.info(f"[EMBEDDINGS] Found {len(results)} similar CVs")
        return results
    except ValueError as e:
        logger.error(f"[EMBEDDINGS] Search validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@app.get("/cv/embeddings/{cv_id}")
async def get_cv_embeddings(cv_id: str):
    """Get metadata for a specific CV's embeddings"""
    logger.info(f"[EMBEDDINGS] Retrieving embeddings metadata for CV: {cv_id}")
    
    try:
        metadata = embeddings_service.get_cv_metadata(cv_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No embeddings found for CV: {cv_id}"
            )
        
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Error retrieving metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve embeddings: {str(e)}"
        )


@app.get("/cv/embeddings", response_model=List[CVMetadata])
async def list_all_embeddings():
    """List all CVs that have embeddings"""
    logger.info("[EMBEDDINGS] Listing all CV embeddings")
    
    try:
        all_metadata = embeddings_service.list_all_embeddings()
        return all_metadata
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Error listing embeddings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list embeddings: {str(e)}"
        )


@app.delete("/cv/embeddings/{cv_id}", status_code=status.HTTP_200_OK)
async def delete_embeddings(cv_id: str):
    """Delete embeddings for a specific CV"""
    logger.info(f"[EMBEDDINGS] Deleting embeddings for CV: {cv_id}")
    
    try:
        success = embeddings_service.delete_embeddings(cv_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No embeddings found for CV: {cv_id}"
            )
        
        logger.info(f"[EMBEDDINGS] Successfully deleted embeddings for CV: {cv_id}")
        return {"message": "Embeddings deleted successfully", "cv_id": cv_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Error deleting embeddings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embeddings: {str(e)}"
        )


@app.get("/cv/stats")
async def get_statistics():
    """Get statistics about the embeddings service"""
    try:
        stats = embeddings_service.get_stats()
        return stats
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Error getting stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 4008))
    logger.info(f"[EMBEDDINGS] Starting CV Embeddings Service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
