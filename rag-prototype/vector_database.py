"""
Vector database manager using ChromaDB.
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import numpy as np
from document_processor import DocumentChunk


class VectorDatabase:
    """Manages vector storage and retrieval using ChromaDB."""
    
    def __init__(
        self,
        collection_name: str = "rag_documents",
        persist_directory: str = "./chroma_db",
        embedding_function: Optional[Any] = None
    ):
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=embedding_function
        )
    
    def add_documents(
        self,
        chunks: List[DocumentChunk],
        embeddings: np.ndarray,
        batch_size: int = 100
    ) -> None:
        """Add document chunks with embeddings to the database."""
        ids = []
        texts = []
        metadatas = []
        
        for chunk in chunks:
            ids.append(f"{chunk.source}_{chunk.chunk_id}")
            texts.append(chunk.text)
            metadatas.append({
                "source": chunk.source,
                "chunk_id": chunk.chunk_id,
                "chunk_size": chunk.metadata.get("chunk_size", 0),
                "source_type": chunk.metadata.get("source_type", "unknown"),
                **{k: v for k, v in chunk.metadata.items() if k not in ["chunk_size", "source_type"]}
            })
        
        # Add in batches
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i+batch_size]
            batch_texts = texts[i:i+batch_size]
            batch_metadatas = metadatas[i:i+batch_size]
            batch_embeddings = embeddings[i:i+batch_size]
            
            self.collection.add(
                ids=batch_ids,
                documents=batch_texts,
                metadatas=batch_metadatas,
                embeddings=batch_embeddings.tolist()
            )
        
        print(f"Added {len(ids)} documents to collection '{self.collection_name}'")
    
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where=where
        )
        
        # Format results
        formatted_results = []
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "document": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "score": results['distances'][0][i] if 'distances' in results else 0.0
                })
        
        return formatted_results
    
    def delete_collection(self) -> None:
        """Delete the current collection."""
        self.client.delete_collection(self.collection_name)
        print(f"Deleted collection '{self.collection_name}'")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection."""
        count = self.collection.count()
        return {
            "name": self.collection_name,
            "document_count": count,
            "persist_directory": self.persist_directory
        }


class HybridSearch:
    """Hybrid search combining dense and sparse retrieval."""
    
    def __init__(
        self,
        vector_db: VectorDatabase,
        dense_weight: float = 0.7,
        sparse_weight: float = 0.3
    ):
        self.vector_db = vector_db
        self.dense_weight = dense_weight
        self.sparse_weight = sparse_weight
    
    def hybrid_search(
        self,
        query: str,
        query_embedding: np.ndarray,
        top_k: int = 10,
        sparse_results: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """Combine dense and sparse search results."""
        # Get dense results
        dense_results = self.vector_db.search(query_embedding, top_k=top_k * 2)
        
        # If sparse results are provided, combine them
        if sparse_results:
            combined_scores = {}
            
            # Score dense results
            for result in dense_results:
                doc_id = result["id"]
                combined_scores[doc_id] = self.dense_weight * (1 - result["score"])
            
            # Score sparse results
            for result in sparse_results:
                doc_id = result["id"]
                sparse_score = result.get("score", 0.0)
                if doc_id in combined_scores:
                    combined_scores[doc_id] += self.sparse_weight * sparse_score
                else:
                    combined_scores[doc_id] = self.sparse_weight * sparse_score
            
            # Sort by combined score
            sorted_results = sorted(
                combined_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Get top-k results
            top_k_ids = [item[0] for item in sorted_results[:top_k]]
            
            # Return full results for top-k
            final_results = []
            for result in dense_results + sparse_results:
                if result["id"] in top_k_ids:
                    result["combined_score"] = combined_scores[result["id"]]
                    final_results.append(result)
            
            return sorted(final_results, key=lambda x: x["combined_score"], reverse=True)[:top_k]
        
        return dense_results[:top_k]


if __name__ == "__main__":
    # Test the vector database
    print("Testing Vector Database...")
    
    from document_processor import DocumentProcessor
    
    # Create test chunks
    processor = DocumentProcessor()
    test_chunks = processor.process_text(
        "This is a test document for the vector database. It should be stored and retrievable.",
        source="test_doc"
    )
    
    # Create vector DB
    vector_db = VectorDatabase(collection_name="test_collection")
    
    # Note: In a real scenario, you would provide embeddings here
    # For testing, we'll skip the actual embedding step
    print("Vector database initialized successfully")
    print(f"Collection info: {vector_db.get_collection_info()}")
