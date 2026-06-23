"""
Qdrant vector database integration.
"""
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, SearchRequest
)
from typing import List, Dict, Any, Optional
import numpy as np
from config import settings


class VectorStore:
    """Qdrant vector database operations."""
    
    def __init__(
        self,
        url: str = None,
        api_key: str = None,
        collection_name: str = None
    ):
        self.url = url or settings.qdrant_url
        self.api_key = api_key or settings.qdrant_api_key
        self.collection_name = collection_name or settings.qdrant_collection_name
        
        # Initialize Qdrant client
        if self.api_key:
            self.client = QdrantClient(url=self.url, api_key=self.api_key)
        else:
            self.client = QdrantClient(url=self.url)
        
        # Create collection if it doesn't exist
        self._ensure_collection()
    
    def _ensure_collection(self) -> None:
        """Ensure collection exists with proper configuration."""
        collections = self.client.get_collections().collections
        collection_names = [col.name for col in collections]
        
        if self.collection_name not in collection_names:
            print(f"Creating collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=1024,  # BGE-M3 dimension
                    distance=Distance.COSINE,
                ),
                optimizers_config=None  # Use default optimizers
            )
            print(f"Collection {self.collection_name} created successfully")
    
    def add_documents(
        self,
        texts: List[str],
        embeddings: np.ndarray,
        metadata: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> None:
        """Add documents with embeddings to Qdrant."""
        if ids is None:
            # Generate IDs based on current time and index
            import time
            ids = [f"{int(time.time() * 1000)}_{i}" for i in range(len(texts))]
        
        # Prepare points
        points = [
            PointStruct(
                id=ids[i],
                vector=embeddings[i].tolist(),
                payload={
                    "text": texts[i],
                    **metadata[i]
                }
            )
            for i in range(len(texts))
        ]
        
        # Upload in batches
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i+batch_size]
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch
            )
        
        print(f"Added {len(points)} documents to collection")
    
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        # Build filter if provided
        search_filter = None
        if filter_conditions:
            conditions = []
            for key, value in filter_conditions.items():
                conditions.append(
                    FieldCondition(
                        key=key,
                        match=MatchValue(value=value)
                    )
                )
            search_filter = Filter(must=conditions)
        
        # Search
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding.tolist(),
            limit=top_k,
            query_filter=search_filter,
            with_payload=True
        )
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result.id,
                "score": result.score,
                "text": result.payload.get("text", ""),
                "metadata": {k: v for k, v in result.payload.items() if k != "text"}
            })
        
        return formatted_results
    
    def delete_document(self, document_id: str) -> None:
        """Delete document by ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector={"filter": FieldCondition(
                key="document_id",
                match=MatchValue(value=document_id)
            )}
        )
        print(f"Deleted document {document_id}")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get collection information."""
        info = self.client.get_collection(self.collection_name)
        return {
            "name": self.collection_name,
            "vector_count": info.points_count,
            "vector_size": info.config.params.vectors.size,
            "distance_metric": info.config.params.vectors.distance.value
        }
    
    def clear_collection(self) -> None:
        """Clear all documents from collection."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector={"filter": {"must": []}}
        )
        print(f"Cleared collection {self.collection_name}")
