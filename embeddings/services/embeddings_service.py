import os
import faiss
import numpy as np
import requests
import json
import logging
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime
from sentence_transformers import SentenceTransformer
import PyPDF2
from io import BytesIO

logger = logging.getLogger(__name__)


class EmbeddingsService:
    """Service for managing CV embeddings using FAISS"""
    
    def __init__(self):
        # Initialize paths
        self.base_dir = Path("cvs")
        self.base_dir.mkdir(exist_ok=True)
        
        self.index_path = self.base_dir / "faiss.index"
        self.metadata_path = self.base_dir / "metadata.json"
        
        # Initialize model
        logger.info("[EMBEDDINGS] Loading sentence transformer model...")
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.embedding_dim = 384  # Dimension for all-MiniLM-L6-v2
        
        # Initialize or load FAISS index
        self.index = self._load_or_create_index()
        
        # Load metadata
        self.metadata = self._load_metadata()
        
        logger.info(f"[EMBEDDINGS] Service initialized with {self.index.ntotal} embeddings")
    
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing FAISS index or create new one"""
        if self.index_path.exists():
            logger.info("[EMBEDDINGS] Loading existing FAISS index")
            return faiss.read_index(str(self.index_path))
        else:
            logger.info("[EMBEDDINGS] Creating new FAISS index")
            # Using IndexFlatL2 for exact search with L2 distance
            index = faiss.IndexFlatL2(self.embedding_dim)
            return index
    
    def _load_metadata(self) -> Dict:
        """Load metadata from disk"""
        if self.metadata_path.exists():
            with open(self.metadata_path, 'r') as f:
                return json.load(f)
        return {
            "cvs": {},  # cv_id -> {email, cv_url, created_at, chunks}
            "index_to_cv": []  # list mapping index position to cv_id
        }
    
    def _save_metadata(self):
        """Save metadata to disk"""
        with open(self.metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def _save_index(self):
        """Save FAISS index to disk"""
        faiss.write_index(self.index, str(self.index_path))
        logger.info("[EMBEDDINGS] FAISS index saved to disk")
    
    async def generate_and_store_embeddings(
        self, 
        cv_id: str, 
        cv_url: str, 
        email: str
    ) -> Dict:
        """Generate embeddings for a CV and store in FAISS"""
        
        # Download CV
        logger.info(f"[EMBEDDINGS] Downloading CV from: {cv_url}")
        try:
            response = requests.get(cv_url, timeout=30)
            response.raise_for_status()
        except Exception as e:
            raise ValueError(f"Failed to download CV: {str(e)}")
        
        # Extract text from PDF
        text = self._extract_text_from_pdf(response.content)
        if not text.strip():
            raise ValueError("No text could be extracted from CV")
        
        # Split text into chunks
        chunks = self._split_text(text)
        logger.info(f"[EMBEDDINGS] Split CV into {len(chunks)} chunks")
        
        # Generate embeddings
        embeddings = self.model.encode(chunks, convert_to_numpy=True)
        
        # If CV already exists, remove old embeddings
        if cv_id in self.metadata["cvs"]:
            logger.info(f"[EMBEDDINGS] Removing old embeddings for CV: {cv_id}")
            self.delete_embeddings(cv_id)
        
        # Add to FAISS index
        start_idx = self.index.ntotal
        self.index.add(embeddings.astype('float32'))
        
        # Update metadata
        self.metadata["cvs"][cv_id] = {
            "email": email,
            "cv_url": cv_url,
            "created_at": datetime.utcnow().isoformat(),
            "chunks": len(chunks),
            "start_idx": start_idx,
            "end_idx": self.index.ntotal
        }
        
        # Add index mappings
        for _ in range(len(chunks)):
            self.metadata["index_to_cv"].append(cv_id)
        
        # Save to disk
        self._save_index()
        self._save_metadata()
        
        logger.info(f"[EMBEDDINGS] Stored {len(chunks)} embeddings for CV: {cv_id}")
        
        return {
            "cv_id": cv_id,
            "chunks_processed": len(chunks),
            "total_embeddings": self.index.ntotal
        }
    
    def _extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"[EMBEDDINGS] PDF extraction error: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def _split_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
        
        return chunks if chunks else [text]
    
    async def search_similar(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for similar CVs using semantic search"""
        
        if self.index.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        
        # Search in FAISS
        k = min(top_k * 3, self.index.ntotal)  # Get more results to account for duplicates
        distances, indices = self.index.search(query_embedding.astype('float32'), k)
        
        # Aggregate results by CV
        cv_scores = {}
        for distance, idx in zip(distances[0], indices[0]):
            if idx < len(self.metadata["index_to_cv"]):
                cv_id = self.metadata["index_to_cv"][idx]
                
                # Convert L2 distance to similarity score (0-1)
                similarity = 1 / (1 + distance)
                
                if cv_id not in cv_scores:
                    cv_scores[cv_id] = []
                cv_scores[cv_id].append(similarity)
        
        # Calculate average similarity for each CV
        results = []
        for cv_id, scores in cv_scores.items():
            cv_data = self.metadata["cvs"].get(cv_id, {})
            results.append({
                "cv_id": cv_id,
                "email": cv_data.get("email", ""),
                "cv_url": cv_data.get("cv_url", ""),
                "similarity_score": float(np.mean(scores))
            })
        
        # Sort by similarity and return top_k
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]
    
    def get_cv_metadata(self, cv_id: str) -> Optional[Dict]:
        """Get metadata for a specific CV"""
        cv_data = self.metadata["cvs"].get(cv_id)
        if not cv_data:
            return None
        
        return {
            "cv_id": cv_id,
            "email": cv_data["email"],
            "cv_url": cv_data["cv_url"],
            "created_at": cv_data["created_at"],
            "chunks": cv_data["chunks"]
        }
    
    def list_all_embeddings(self) -> List[Dict]:
        """List all CVs with embeddings"""
        results = []
        for cv_id, data in self.metadata["cvs"].items():
            results.append({
                "cv_id": cv_id,
                "email": data["email"],
                "cv_url": data["cv_url"],
                "created_at": data["created_at"]
            })
        return results
    
    def delete_embeddings(self, cv_id: str) -> bool:
        """Delete embeddings for a specific CV"""
        if cv_id not in self.metadata["cvs"]:
            return False
        
        cv_data = self.metadata["cvs"][cv_id]
        start_idx = cv_data["start_idx"]
        end_idx = cv_data["end_idx"]
        num_vectors = end_idx - start_idx
        
        # FAISS doesn't support direct deletion, so we need to rebuild the index
        # without the vectors to delete
        logger.info(f"[EMBEDDINGS] Rebuilding index to remove CV: {cv_id}")
        
        # Create new index
        new_index = faiss.IndexFlatL2(self.embedding_dim)
        new_index_to_cv = []
        new_cvs_metadata = {}
        
        # Copy vectors except the ones to delete
        for i in range(self.index.ntotal):
            if i < start_idx or i >= end_idx:
                vector = self.index.reconstruct(i)
                new_index.add(np.array([vector], dtype='float32'))
                
                old_cv_id = self.metadata["index_to_cv"][i]
                new_index_to_cv.append(old_cv_id)
        
        # Update metadata for remaining CVs
        current_idx = 0
        for old_cv_id, old_data in self.metadata["cvs"].items():
            if old_cv_id != cv_id:
                chunks = old_data["chunks"]
                new_cvs_metadata[old_cv_id] = {
                    **old_data,
                    "start_idx": current_idx,
                    "end_idx": current_idx + chunks
                }
                current_idx += chunks
        
        # Update service state
        self.index = new_index
        self.metadata["cvs"] = new_cvs_metadata
        self.metadata["index_to_cv"] = new_index_to_cv
        
        # Save changes
        self._save_index()
        self._save_metadata()
        
        logger.info(f"[EMBEDDINGS] Successfully deleted embeddings for CV: {cv_id}")
        return True
    
    def get_stats(self) -> Dict:
        """Get statistics about the embeddings service"""
        return {
            "total_cvs": len(self.metadata["cvs"]),
            "total_embeddings": self.index.ntotal,
            "embedding_dimension": self.embedding_dim,
            "model": "sentence-transformers/all-MiniLM-L6-v2"
        }
