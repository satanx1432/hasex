"""
Reranking module using cross-encoder models.
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Any
import numpy as np
import time


class Reranker:
    """Reranks search results using cross-encoder models."""
    
    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        top_k: int = 5
    ):
        self.model_name = model_name
        self.device = device
        self.top_k = top_k
        
        print(f"Loading reranker model {model_name} on {device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.to(device)
        self.model.eval()
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        batch_size: int = 16
    ) -> List[Dict[str, Any]]:
        """Rerank documents based on query-document relevance."""
        if not documents:
            return documents[:self.top_k]
        
        # Prepare pairs
        pairs = [[query, doc["document"]] for doc in documents]
        
        all_scores = []
        
        # Process in batches
        for i in range(0, len(pairs), batch_size):
            batch_pairs = pairs[i:i+batch_size]
            
            # Tokenize
            features = self.tokenizer(
                batch_pairs,
                padding=True,
                truncation=True,
                return_tensors='pt'
            ).to(self.device)
            
            # Compute scores
            with torch.no_grad():
                scores = self.model(**features).logits.squeeze(dim=1)
                scores = torch.sigmoid(scores)  # Convert to probabilities
            
            all_scores.extend(scores.cpu().numpy())
        
        # Add scores to documents
        for doc, score in zip(documents, all_scores):
            doc["rerank_score"] = float(score)
        
        # Sort by rerank score
        reranked = sorted(documents, key=lambda x: x["rerank_score"], reverse=True)
        
        return reranked[:self.top_k]
    
    def profile_reranking(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        warmup: int = 2
    ) -> Dict[str, Any]:
        """Profile reranking performance."""
        # Warmup
        for _ in range(warmup):
            self.rerank(query, documents[:10])
        
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
        
        start_time = time.time()
        reranked = self.rerank(query, documents)
        end_time = time.time()
        
        memory_used = 0
        if torch.cuda.is_available():
            memory_used = torch.cuda.max_memory_allocated() / (1024 ** 3)
        
        return {
            "model": self.model_name,
            "avg_latency_ms": (end_time - start_time) * 1000,
            "memory_gb": memory_used,
            "throughput_docs_per_sec": len(documents) / (end_time - start_time)
        }


class NoOpReranker:
    """No-op reranker that just returns top-k results without reranking."""
    
    def __init__(self, top_k: int = 5):
        self.top_k = top_k
        self.model_name = "no_op"
    
    def rerank(self, query: str, documents: List[Dict[str, Any]], batch_size: int = 16) -> List[Dict[str, Any]]:
        """Return top-k documents without reranking."""
        return documents[:self.top_k]
    
    def profile_reranking(self, query: str, documents: List[Dict[str, Any]], warmup: int = 2) -> Dict[str, Any]:
        """Profile (no-op)."""
        return {
            "model": self.model_name,
            "avg_latency_ms": 0,
            "memory_gb": 0,
            "throughput_docs_per_sec": float('inf')
        }


if __name__ == "__main__":
    # Test the reranker
    print("Testing Reranker...")
    
    # Create sample documents
    documents = [
        {
            "id": "doc_1",
            "document": "Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
            "score": 0.8
        },
        {
            "id": "doc_2", 
            "document": "Deep learning uses neural networks with multiple layers for pattern recognition.",
            "score": 0.7
        },
        {
            "id": "doc_3",
            "document": "The weather today is sunny with a high of 75 degrees.",
            "score": 0.5
        }
    ]
    
    query = "What is machine learning?"
    
    # Test with no-op reranker (faster for testing)
    print("\nTesting NoOpReranker...")
    no_op_reranker = NoOpReranker(top_k=2)
    reranked_noop = no_op_reranker.rerank(query, documents)
    print(f"Reranked (no-op): {[doc['id'] for doc in reranked_noop]}")
