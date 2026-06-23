"""
Supabase pgvector integration for vector storage.
"""

import os
import numpy as np
from typing import List, Dict, Any, Optional
from supabase import create_client, Client


class SupabaseVectorStore:
    """Vector storage using Supabase pgvector."""
    
    def __init__(
        self,
        supabase_url: str = None,
        supabase_key: str = None,
        table_name: str = "document_embeddings"
    ):
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_KEY")
        self.table_name = table_name
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key must be provided or set as environment variables")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        
    def initialize_schema(self) -> None:
        """Initialize the database schema for vector storage."""
        # Create table if it doesn't exist
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {self.table_name} (
            id SERIAL PRIMARY KEY,
            document_id TEXT NOT NULL,
            chunk_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1024),
            metadata JSONB,
            source TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """
        
        # Create index for similarity search
        create_index_sql = f"""
        CREATE INDEX IF NOT EXISTS {self.table_name}_embedding_idx 
        ON {self.table_name} 
        USING ivfflat (embedding vector_cosine_ops);
        """
        
        print("Initializing Supabase schema...")
        # Note: In production, you'd run these SQL commands through Supabase SQL editor
        # or use migrations. For this prototype, we assume the schema exists.
        print("Schema initialization complete (assuming table exists)")
    
    def add_embeddings(
        self,
        document_id: str,
        chunks: List[str],
        embeddings: np.ndarray,
        metadata: List[Dict[str, Any]] = None,
        source: str = ""
    ) -> None:
        """Add document chunks with embeddings to Supabase."""
        if metadata is None:
            metadata = [{}] * len(chunks)
        
        data = []
        for i, (chunk, embedding, meta) in enumerate(zip(chunks, embeddings, metadata)):
            data.append({
                "document_id": document_id,
                "chunk_id": i,
                "content": chunk,
                "embedding": embedding.tolist(),
                "metadata": meta,
                "source": source
            })
        
        result = self.client.table(self.table_name).insert(data).execute()
        print(f"Added {len(chunks)} embeddings to Supabase")
        return result
    
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents using pgvector."""
        # Convert to string format for pgvector
        embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
        
        # Build the query
        query = self.client.table(self.table_name).select("*")
        
        # Add similarity search using pgvector
        # Note: This requires the ivfflat index to be created
        # For simplicity, we'll use a basic cosine similarity calculation
        all_results = query.execute()
        
        if not all_results.data:
            return []
        
        # Calculate cosine similarity in Python (simplified)
        results_with_scores = []
        for row in all_results.data:
            stored_embedding = np.array(row["embedding"])
            similarity = self._cosine_similarity(query_embedding, stored_embedding)
            
            results_with_scores.append({
                "id": row["id"],
                "document_id": row["document_id"],
                "chunk_id": row["chunk_id"],
                "content": row["content"],
                "metadata": row["metadata"],
                "source": row["source"],
                "score": similarity
            })
        
        # Sort by similarity and return top-k
        results_with_scores.sort(key=lambda x: x["score"], reverse=True)
        
        if document_ids:
            results_with_scores = [r for r in results_with_scores if r["document_id"] in document_ids]
        
        return results_with_scores[:top_k]
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    def get_document_count(self) -> int:
        """Get total number of documents in the store."""
        result = self.client.table(self.table_name).select("id", count="exact").execute()
        return result.count if hasattr(result, 'count') else len(result.data)
    
    def delete_document(self, document_id: str) -> None:
        """Delete all chunks for a document."""
        self.client.table(self.table_name).delete().eq("document_id", document_id).execute()
        print(f"Deleted document {document_id}")


class FallbackVectorStore:
    """Fallback in-memory vector store when Supabase is not available."""
    
    def __init__(self):
        self.embeddings = []
        self.documents = []
        self.metadata = []
    
    def add_embeddings(
        self,
        document_id: str,
        chunks: List[str],
        embeddings: np.ndarray,
        metadata: List[Dict[str, Any]] = None,
        source: str = ""
    ) -> None:
        """Add embeddings to in-memory store."""
        if metadata is None:
            metadata = [{}] * len(chunks)
        
        for chunk, embedding, meta in zip(chunks, embeddings, metadata):
            self.embeddings.append(embedding)
            self.documents.append(chunk)
            self.metadata.append({
                "document_id": document_id,
                "chunk_id": len(self.documents) - 1,
                **meta,
                "source": source
            })
        
        print(f"Added {len(chunks)} embeddings to in-memory store")
    
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Search in-memory vectors."""
        if not self.embeddings:
            return []
        
        # Calculate similarities
        similarities = []
        for i, embedding in enumerate(self.embeddings):
            similarity = self._cosine_similarity(query_embedding, embedding)
            similarities.append({
                "id": i,
                "content": self.documents[i],
                "metadata": self.metadata[i],
                "score": similarity
            })
        
        # Sort and filter
        similarities.sort(key=lambda x: x["score"], reverse=True)
        
        if document_ids:
            similarities = [s for s in similarities if s["metadata"].get("document_id") in document_ids]
        
        return similarities[:top_k]
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity."""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    def get_document_count(self) -> int:
        """Get document count."""
        return len(set(m["document_id"] for m in self.metadata))
    
    def delete_document(self, document_id: str) -> None:
        """Delete document from memory."""
        # Filter out embeddings for this document
        to_keep = []
        for i, meta in enumerate(self.metadata):
            if meta.get("document_id") != document_id:
                to_keep.append(i)
        
        self.embeddings = [self.embeddings[i] for i in to_keep]
        self.documents = [self.documents[i] for i in to_keep]
        self.metadata = [self.metadata[i] for i in to_keep]
        
        print(f"Deleted document {document_id} from in-memory store")


def get_vector_store(use_supabase: bool = True, **kwargs) -> Any:
    """Get appropriate vector store based on configuration."""
    try:
        if use_supabase:
            return SupabaseVectorStore(**kwargs)
    except Exception as e:
        print(f"Supabase not available, using fallback: {e}")
        return FallbackVectorStore()
