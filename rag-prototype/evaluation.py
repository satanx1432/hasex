"""
Evaluation framework for comparing retrieval quality.
"""

import numpy as np
import time
from typing import List, Dict, Any, Set
from collections import defaultdict
import json


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
    def precision_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
        """Calculate Precision@K."""
        if k == 0:
            return 0.0
        
        retrieved_at_k = set(retrieved[:k])
        return len(retrieved_at_k & relevant) / k
    
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


class EvaluationDataset:
    """Sample evaluation dataset for testing."""
    
    def __init__(self):
        self.queries = [
            {
                "query": "What is machine learning?",
                "relevant_docs": {"doc_0", "doc_1"}  # ML and deep learning docs
            },
            {
                "query": "How do neural networks work?",
                "relevant_docs": {"doc_1"}  # Deep learning doc
            },
            {
                "query": "What is natural language processing?",
                "relevant_docs": {"doc_2"}  # NLP doc
            },
            {
                "query": "How does computer vision work?",
                "relevant_docs": {"doc_3"}  # Computer vision doc
            },
            {
                "query": "What are the applications of AI?",
                "relevant_docs": {"doc_0", "doc_1", "doc_2", "doc_3"}  # All docs
            }
        ]
    
    def create_sample_documents(self) -> List[str]:
        """Create sample documents for evaluation."""
        return [
            "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.",
            "Deep learning is a subset of machine learning that uses neural networks with multiple layers to progressively extract higher-level features from raw input. It has revolutionized fields like computer vision, natural language processing, and speech recognition.",
            "Natural language processing (NLP) is a branch of artificial intelligence that helps computers understand, interpret, and manipulate human language. It enables machines to read text, hear speech, interpret it, measure sentiment, and determine which parts are important.",
            "Computer vision is a field of AI that trains computers to interpret and understand the visual world. Using digital images from cameras and videos and deep learning models, machines can accurately identify and classify objects."
        ]


class Evaluator:
    """Evaluate retrieval systems."""
    
    def __init__(self, pipeline):
        self.pipeline = pipeline
        self.metrics = EvaluationMetrics()
    
    def evaluate_model(
        self,
        model_name: str,
        queries: List[Dict[str, Any]],
        k: int = 10
    ) -> Dict[str, Any]:
        """Evaluate a single model on the query set."""
        results = {
            "model": model_name,
            "recall_at_k": [],
            "precision_at_k": [],
            "mrr": [],
            "average_precision": [],
            "latency_ms": [],
            "memory_usage_gb": []
        }
        
        for query_data in queries:
            query = query_data["query"]
            relevant_docs = query_data["relevant_docs"]
            
            # Retrieve documents
            start_time = time.time()
            retrieved = self.pipeline.retrieve(
                query,
                top_k=k,
                use_hybrid=True,
                use_reranking=True,
                model=model_name
            )
            latency = (time.time() - start_time) * 1000
            
            # Extract document IDs
            retrieved_ids = [r["id"] for r in retrieved]
            
            # Calculate metrics
            recall = self.metrics.recall_at_k(retrieved_ids, relevant_docs, k)
            precision = self.metrics.precision_at_k(retrieved_ids, relevant_docs, k)
            mrr = self.metrics.mrr(retrieved_ids, relevant_docs)
            avg_precision = self.metrics.average_precision(retrieved_ids, relevant_docs)
            
            # Store metrics
            results["recall_at_k"].append(recall)
            results["precision_at_k"].append(precision)
            results["mrr"].append(mrr)
            results["average_precision"].append(avg_precision)
            results["latency_ms"].append(latency)
        
        # Calculate averages
        results["avg_recall_at_k"] = np.mean(results["recall_at_k"])
        results["avg_precision_at_k"] = np.mean(results["precision_at_k"])
        results["avg_mrr"] = np.mean(results["mrr"])
        results["map"] = np.mean(results["average_precision"])
        results["avg_latency_ms"] = np.mean(results["latency_ms"])
        
        # Get model profile
        if model_name == "bge_m3":
            model = self.pipeline.embedding_model
        else:
            model = self.pipeline.comparison_model
        
        profile = self.pipeline.profiler.profile_model(model, ["sample"] * 10)
        results["memory_usage_gb"] = profile["total_memory_gb"]
        
        return results
    
    def compare_models(
        self,
        queries: List[Dict[str, Any]],
        k: int = 10
    ) -> Dict[str, Any]:
        """Compare BGE-M3 vs EmbedQA 5."""
        comparison = {
            "evaluation_details": {},
            "summary": {}
        }
        
        # Evaluate BGE-M3
        print("Evaluating BGE-M3...")
        bge_results = self.evaluate_model("bge_m3", queries, k)
        comparison["evaluation_details"]["bge_m3"] = bge_results
        
        # Evaluate EmbedQA 5
        print("Evaluating EmbedQA 5...")
        embedqa_results = self.evaluate_model("embedqa_5", queries, k)
        comparison["evaluation_details"]["embedqa_5"] = embedqa_results
        
        # Create summary
        comparison["summary"] = {
            "bge_m3": {
                "recall_at_10": bge_results["avg_recall_at_k"],
                "mrr": bge_results["avg_mrr"],
                "avg_latency_ms": bge_results["avg_latency_ms"],
                "memory_gb": bge_results["memory_usage_gb"]
            },
            "embedqa_5": {
                "recall_at_10": embedqa_results["avg_recall_at_k"],
                "mrr": embedqa_results["avg_mrr"],
                "avg_latency_ms": embedqa_results["avg_latency_ms"],
                "memory_gb": embedqa_results["memory_usage_gb"]
            }
        }
        
        # Determine winner
        recall_winner = "bge_m3" if bge_results["avg_recall_at_k"] > embedqa_results["avg_recall_at_k"] else "embedqa_5"
        mrr_winner = "bge_m3" if bge_results["avg_mrr"] > embedqa_results["avg_mrr"] else "embedqa_5"
        latency_winner = "bge_m3" if bge_results["avg_latency_ms"] < embedqa_results["avg_latency_ms"] else "embedqa_5"
        memory_winner = "bge_m3" if bge_results["memory_usage_gb"] < embedqa_results["memory_usage_gb"] else "embedqa_5"
        
        comparison["summary"]["recommendations"] = {
            "best_recall": recall_winner,
            "best_mrr": mrr_winner,
            "fastest": latency_winner,
            "most_efficient": memory_winner
        }
        
        # Overall recommendation (weighted score)
        bge_score = (
            bge_results["avg_recall_at_k"] * 0.4 +
            bge_results["avg_mrr"] * 0.4 +
            (1 / (bge_results["avg_latency_ms"] / 1000 + 1)) * 0.1 +
            (1 / (bge_results["memory_usage_gb"] + 1)) * 0.1
        )
        
        embedqa_score = (
            embedqa_results["avg_recall_at_k"] * 0.4 +
            embedqa_results["avg_mrr"] * 0.4 +
            (1 / (embedqa_results["avg_latency_ms"] / 1000 + 1)) * 0.1 +
            (1 / (embedqa_results["memory_usage_gb"] + 1)) * 0.1
        )
        
        comparison["summary"]["overall_winner"] = "bge_m3" if bge_score > embedqa_score else "embedqa_5"
        comparison["summary"]["scores"] = {
            "bge_m3": bge_score,
            "embedqa_5": embedqa_score
        }
        
        return comparison
    
    def generate_report(self, comparison: Dict[str, Any], output_path: str = "evaluation_report.json") -> None:
        """Generate evaluation report."""
        with open(output_path, 'w') as f:
            json.dump(comparison, f, indent=2)
        
        # Also print summary
        print("\n" + "="*60)
        print("EVALUATION SUMMARY")
        print("="*60)
        
        summary = comparison["summary"]
        
        print("\nBGE-M3:")
        print(f"  Recall@10: {summary['bge_m3']['recall_at_10']:.4f}")
        print(f"  MRR: {summary['bge_m3']['mrr']:.4f}")
        print(f"  Latency: {summary['bge_m3']['avg_latency_ms']:.2f} ms")
        print(f"  Memory: {summary['bge_m3']['memory_gb']:.2f} GB")
        
        print("\nEmbedQA 5:")
        print(f"  Recall@10: {summary['embedqa_5']['recall_at_10']:.4f}")
        print(f"  MRR: {summary['embedqa_5']['mrr']:.4f}")
        print(f"  Latency: {summary['embedqa_5']['avg_latency_ms']:.2f} ms")
        print(f"  Memory: {summary['embedqa_5']['memory_gb']:.2f} GB")
        
        print("\nRecommendations:")
        print(f"  Best Recall: {summary['recommendations']['best_recall']}")
        print(f"  Best MRR: {summary['recommendations']['best_mrr']}")
        print(f"  Fastest: {summary['recommendations']['fastest']}")
        print(f"  Most Memory Efficient: {summary['recommendations']['most_efficient']}")
        print(f"  Overall Winner: {summary['overall_winner'].upper()}")
        
        print(f"\nScores (higher is better):")
        print(f"  BGE-M3: {summary['scores']['bge_m3']:.4f}")
        print(f"  EmbedQA 5: {summary['scores']['embedqa_5']:.4f}")
        
        print("\n" + "="*60)


if __name__ == "__main__":
    # Test the evaluation framework
    print("Testing Evaluation Framework...")
    
    from rag_pipeline import RAGPipeline
    import tempfile
    import shutil
    
    # Create pipeline
    pipeline = RAGPipeline()
    
    # Create evaluation dataset
    dataset = EvaluationDataset()
    documents = dataset.create_sample_documents()
    
    # Create temporary files
    temp_dir = tempfile.mkdtemp()
    doc_paths = []
    
    try:
        for i, doc in enumerate(documents):
            doc_path = f"{temp_dir}/doc_{i}.txt"
            with open(doc_path, 'w') as f:
                f.write(doc)
            doc_paths.append(doc_path)
        
        # Index documents
        pipeline.index_documents(doc_paths)
        
        # Create evaluator
        evaluator = Evaluator(pipeline)
        
        # Run comparison
        comparison = evaluator.compare_models(dataset.queries, k=10)
        
        # Generate report
        evaluator.generate_report(comparison)
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
