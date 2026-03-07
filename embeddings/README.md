# CV Embeddings and RAG Service

A FastAPI microservice for generating and managing CV embeddings using FAISS and Sentence Transformers, with Groq-powered RAG for question answering.

## Features

- Generate embeddings from CV PDFs using sentence transformers
- Store embeddings locally using FAISS vector database
- Semantic search for similar CVs
- RAG endpoint that retrieves relevant CV chunks and generates grounded answers with Groq
- RESTful API for managing embeddings

## API Endpoints

### Health & Stats
- `GET /` - Health check
- `GET /cv/health` - Detailed health check with stats
- `GET /cv/stats` - Get service statistics
- `GET /rag/health` - RAG readiness check (vectors + Groq key)

### Embeddings Management
- `POST /cv/generate-embeddings` - Generate embeddings for a CV
- `GET /cv/embeddings` - List all CVs with embeddings
- `GET /cv/embeddings/{cv_id}` - Get metadata for a specific CV
- `DELETE /cv/embeddings/{cv_id}` - Delete embeddings for a CV

### Search
- `POST /cv/search` - Search for similar CVs using semantic search

### RAG
- `POST /rag/ask` - Ask a question over indexed CV knowledge using retrieval + Groq

## Setup

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the service:
```bash
python main.py
```

The service will start on port 4008 (or the port specified in PORT environment variable).

### Required Environment Variables

- `GROQ_API_KEY` - Groq API key for generation
- `GROQ_MODEL` - Optional model override (default `llama-3.1-8b-instant`)
- `RAG_MAX_CONTEXT_CHARS` - Maximum context payload passed to LLM
- `RAG_MAX_QUESTION_CHARS` - Maximum question length accepted by RAG endpoint
- `RAG_MAX_TOP_K` - Maximum retrieval top-k allowed per request
- `EMBEDDINGS_DATA_DIR` - Optional absolute/relative path where `faiss.index` and `metadata.json` are stored

### Docker

Build and run with Docker:
```bash
docker build -t embeddings-service .
docker run -p 4008:4008 embeddings-service
```

## Data Storage

- FAISS index is stored in `cvs/faiss.index`
- Metadata is stored in `cvs/metadata.json`
- Both files persist between restarts

## Model

Uses `sentence-transformers/all-MiniLM-L6-v2` for generating embeddings:
- Fast and efficient
- 384-dimensional embeddings
- Good balance between speed and quality
