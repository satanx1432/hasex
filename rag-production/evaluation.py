"""
Evaluation framework for RAG system.
"""
import time
import numpy as np
from typing import List, Dict, Any, Set
from collections import defaultdict
import json

from hybrid_search import HybridSearch
from document_processor import DocumentProcessor


class EvaluationMetrics:
    """Calculate retrieval metrics."""
    
    @staticmethod
    def recall_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
        """Calculate Recall@K."""
        if not relevant:
            return 0.0
        retrieved_at_k = set(retrieved[:k])
        return len(retrieved_at_k & relevant) / len(relevant)
    
    @staticmethod
    def mrr(retrieved: List[str], relevant: Set[str]) -> float:
        """Calculate Mean Reciprocal Rank."""
        for i, doc_id in enumerate(retrieved):
            if doc_id in relevant:
                return 1.0 / (i + 1)
        return 0.0
    
    @staticmethod
    def average_precision(retrieved: List[str], relevant: Set[str]) -> float:
        """Calculate Average Precision."""
        if not relevant:
            return 0.0
        
        precisions = []
        relevant_found = 0
        
        for i, doc_id in enumerate(retrieved):
            if doc_id in relevant:
                relevant_found += 1
                precision = relevant_found / (i + 1)
                precisions.append(precision)
        
        return np.mean(precisions) if precisions else 0.0


class Evaluator:
    """Evaluate RAG system performance."""
    
    def __init__(self, hybrid_search: HybridSearch):
        self.hybrid_search = hybrid_search
        self.metrics = EvaluationMetrics()
    
    def evaluate(
        self,
        queries: List[Dict[str, Any]],
        k: int = 10
    ) -> Dict[str, Any]:
        """Evaluate system on query set."""
        results = {
            "num_queries": len(queries),
            "k": k,
            "recalls": [],
            "mrrs": [],
            "latencies_ms": []
        }
        
        for query_data in queries:
            query = query_data["query"]
            relevant_docs = query_data["relevant_docs"]
            
            # Time the query
            start_time = time.time()
            
            # Search
            retrieved = self.hybrid_search.search(
                query=query,
                top_k=k,
                use_hybrid=True,
                use_reranking=True
            )
            
            query_time = (time.time() - start_time) * 1000
            
            # Extract document IDs
            retrieved_ids = [r["id"] for r in retrieved]
            
            # Calculate metrics
            recall = self.metrics.recall_at_k(retrieved_ids, relevant_docs, k)
            mrr = self.metrics.mrr(retrieved_ids, relevant_docs)
            
            results["recalls"].append(recall)
            results["mrrs"].append(mrr)
            results["latencies_ms"].append(query_time)
        
        # Calculate averages
        results["avg_recall_at_k"] = np.mean(results["recalls"])
        results["avg_mrr"] = np.mean(results["mrrs"])
        results["avg_latency_ms"] = np.mean(results["latencies_ms"])
        
        return results
    
    def create_evaluation_dataset(
        self,
        documents: Dict[str, str],
        num_queries: int = 10
    ) -> List[Dict[str, Any]]:
        """Create simple evaluation dataset from documents."""
        queries = []
        doc_ids = list(documents.keys())
        
        for i in range(num_queries):
            doc_id = doc_ids[i % len(doc_ids)]
            content = documents[doc_id]
            
            # Simple question generation
            if i % 3 == 0:
                question = f"What is the main topic of document {doc_id}?"
            elif i % 3 == 1:
                question = f"Explain the key concepts in document {doc_id}"
            else:
                question = f"What are the important points mentioned in {doc_id}?"
            
            queries.append({
                "query": question,
                "relevant_docs": {doc_id}
            })
        
        return queries
    
    def save_evaluation(self, results: Dict[str, Any], filename: str = "evaluation_results.json"):
        """Save evaluation results."""
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Evaluation results saved to {filename}")
    
    def print_summary(self, results: Dict[str, Any]):
        """Print evaluation summary."""
        print("\n" + "="*60)
        print("EVALUATION SUMMARY")
        print("="*60)
        print(f"Number of queries: {results['num_queries']}")
        print(f"K value: {results['k']}")
        print(f"\nAverage Recall@{results['k']}: {results['avg_recall_at_k']:.4f}")
        print(f"Average MRR: {results['avg_mrr']:.4f}")
        print(f"Average Latency: {results['avg_latency_ms']:.2f}ms")
        print("="*60)


# Standalone evaluation script
def run_evaluation(hybrid_search, documents: Dict[str, str], num_queries: int = 10):
    """Run evaluation on document set."""
    evaluator = Evaluator(hybrid_search)
    
    print("Creating evaluation dataset...")
    queries = evaluator.create_evaluation_dataset(documents, num_queries)
    
    print(f"Running evaluation with {len(queries)} queries...")
    results = evaluator.evaluate(queries, k=10)
    
    evaluator.print_summary(results)
    evaluator.save_evaluation(results)
    
    return results


if __name__ == "__main__":
    # Example usage
    from config import settings
    from embedding_model import EmbeddingModel, Reranker
    from vector_store import VectorStore
    
    # Initialize components
    print("Initializing components for evaluation...")
    embedding_model = EmbeddingModel()
    reranker = Reranker()
    vector_store = VectorStore()
    hybrid_search = HybridSearch(vector_store, embedding_model, reranker)
    
    # Sample documents
    documents = {
        "doc1": """
        Machine learning is a subset of artificial intelligence that enables systems 
        to learn from data without being explicitly programmed. It uses algorithms 
        to find patterns and make predictions.
        """,
        "doc2": """
        Deep learning is a type of machine learning that uses neural networks with 
        multiple layers to progressively extract higher-level features from raw input.
        """
    }
    
    # Run evaluation
    results = run_evaluation(hybrid_search, documents, num_queries=5)
