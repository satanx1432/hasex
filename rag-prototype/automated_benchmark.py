"""
Automated benchmarking system for model comparison.
"""

import time
import torch
import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass
from pathlib import Path
import json

from embedding_models import BGE_M3, EmbedQA5, ModelProfiler
from supabase_vector_store import get_vector_store
from auto_evaluation import EvaluationDatasetGenerator
from evaluation import EvaluationMetrics


@dataclass
class BenchmarkResult:
    """Results from benchmarking a single model."""
    model_name: str
    recall_at_10: float
    mrr: float
    precision_at_10: float
    map: float
    avg_latency_ms: float
    memory_usage_gb: float
    throughput_docs_per_sec: float
    total_queries: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model_name": self.model_name,
            "recall_at_10": self.recall_at_10,
            "mrr": self.mrr,
            "precision_at_10": self.precision_at_10,
            "map": self.map,
            "avg_latency_ms": self.avg_latency_ms,
            "memory_usage_gb": self.memory_usage_gb,
            "throughput_docs_per_sec": self.throughput_docs_per_sec,
            "total_queries": self.total_queries
        }


class AutomatedBenchmark:
    """Automated benchmarking system for model comparison."""
    
    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        top_k: int = 10,
        use_supabase: bool = False  # Use fallback if no Supabase configured
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k
        
        # Initialize models
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}")
        
        self.bge_m3 = BGE_M3(device=device)
        self.embedqa_5 = EmbedQA5(device=device)
        self.profiler = ModelProfiler()
        
        # Initialize vector store
        self.vector_store = get_vector_store(use_supabase=use_supabase)
        
        # Initialize metrics calculator
        self.metrics = EvaluationMetrics()
    
    def prepare_documents(self, documents: Dict[str, str]) -> Dict[str, List[str]]:
        """Chunk documents for indexing."""
        from document_processor import DocumentProcessor
        
        processor = DocumentProcessor(self.chunk_size, self.chunk_overlap)
        chunked_docs = {}
        
        print("Preparing documents for indexing...")
        for doc_id, content in documents.items():
            chunks = processor.process_text(content, source=doc_id)
            chunked_docs[doc_id] = [chunk.text for chunk in chunks]
            print(f"  {doc_id}: {len(chunks)} chunks")
        
        return chunked_docs
    
    def index_documents(self, chunked_docs: Dict[str, List[str]], model_name: str) -> Dict[str, Any]:
        """Index documents using specified model."""
        print(f"\nIndexing documents with {model_name}...")
        
        # Select model
        if model_name == "bge_m3":
            model = self.bge_m3
        elif model_name == "embedqa_5":
            model = self.embedqa_5
        else:
            raise ValueError(f"Unknown model: {model_name}")
        
        # Flatten all chunks
        all_chunks = []
        all_doc_ids = []
        
        for doc_id, chunks in chunked_docs.items():
            all_chunks.extend(chunks)
            all_doc_ids.extend([doc_id] * len(chunks))
        
        # Generate embeddings
        start_time = time.time()
        embeddings = model.encode(all_chunks)
        embedding_time = time.time() - start_time
        
        print(f"Generated {len(embeddings)} embeddings in {embedding_time:.2f}s")
        
        # Store in vector store
        start_time = time.time()
        for doc_id, chunks in chunked_docs.items():
            doc_embeddings = embeddings[len(all_doc_ids) - len(all_chunks):len(all_doc_ids)]
            self.vector_store.add_embeddings(
                doc_id, chunks, doc_embeddings, source=doc_id
            )
            all_doc_ids = all_doc_ids[:len(all_doc_ids) - len(chunks)]  # Update for next iteration
        
        storage_time = time.time() - start_time
        
        stats = {
            "total_chunks": len(all_chunks),
            "embedding_time": embedding_time,
            "storage_time": storage_time,
            "model_dimension": model.dimension
        }
        
        print(f"Indexing complete: {stats['total_chunks']} chunks stored")
        return stats
    
    def benchmark_model(
        self,
        queries: List[Dict[str, Any]],
        model_name: str
    ) -> BenchmarkResult:
        """Benchmark a single model on evaluation dataset."""
        print(f"\n{'='*60}")
        print(f"BENCHMARKING: {model_name.upper()}")
        print(f"{'='*60}")
        
        # Select model
        if model_name == "bge_m3":
            model = self.bge_m3
        elif model_name == "embedqa_5":
            model = self.embedqa_5
        else:
            raise ValueError(f"Unknown model: {model_name}")
        
        # Profile model
        print("Profiling model performance...")
        profile = self.profiler.profile_model(model, ["sample"] * 10)
        
        # Run queries
        results = {
            "recalls": [],
            "mrrs": [],
            "precisions": [],
            "aps": [],
            "latencies": []
        }
        
        total_start = time.time()
        
        for i, query_data in enumerate(queries):
            query = query_data["query"]
            relevant_docs = query_data["relevant_docs"]
            
            # Embed query
            query_start = time.time()
            query_embedding = model.encode_queries(query)
            query_time = (time.time() - query_start) * 1000
            
            # Search
            search_start = time.time()
            retrieved = self.vector_store.search(query_embedding, top_k=self.top_k * 2)
            search_time = (time.time() - search_start) * 1000
            
            # Calculate metrics
            retrieved_ids = [r["metadata"]["document_id"] for r in retrieved]
            recall = self.metrics.recall_at_k(retrieved_ids, relevant_docs, self.top_k)
            mrr = self.metrics.mrr(retrieved_ids, relevant_docs)
            precision = self.metrics.precision_at_k(retrieved_ids, relevant_docs, self.top_k)
            ap = self.metrics.average_precision(retrieved_ids, relevant_docs)
            
            results["recalls"].append(recall)
            results["mrrs"].append(mrr)
            results["precisions"].append(precision)
            results["aps"].append(ap)
            results["latencies"].append(query_time + search_time)
            
            if (i + 1) % max(1, len(queries) // 5) == 0:
                print(f"  Processed {i + 1}/{len(queries)} queries...")
        
        total_time = time.time() - total_start
        
        # Calculate averages
        avg_recall = np.mean(results["recalls"])
        avg_mrr = np.mean(results["mrrs"])
        avg_precision = np.mean(results["precisions"])
        avg_ap = np.mean(results["aps"])
        avg_latency = np.mean(results["latencies"])
        
        return BenchmarkResult(
            model_name=model_name,
            recall_at_10=avg_recall,
            mrr=avg_mrr,
            precision_at_10=avg_precision,
            map=avg_ap,
            avg_latency_ms=avg_latency,
            memory_usage_gb=profile["total_memory_gb"],
            throughput_docs_per_sec=len(queries) / total_time,
            total_queries=len(queries)
        )
    
    def run_comparison(
        self,
        documents: Dict[str, str],
        num_queries: int = 20
    ) -> Dict[str, Any]:
        """Run complete benchmark comparison between models."""
        print("\n" + "="*60)
        print("AUTOMATED MODEL BENCHMARKING")
        print("="*60)
        
        # Prepare documents
        chunked_docs = self.prepare_documents(documents)
        
        # Generate evaluation dataset
        dataset_gen = EvaluationDatasetGenerator()
        queries = dataset_gen.generate_synthetic_dataset(documents, num_queries)
        
        # Benchmark both models
        bge_result = self.benchmark_model(queries, "bge_m3")
        embedqa_result = self.benchmark_model(queries, "embedqa_5")
        
        # Compare results
        comparison = self._compare_results(bge_result, embedqa_result)
        
        return {
            "bge_m3": bge_result.to_dict(),
            "embedqa_5": embedqa_result.to_dict(),
            "comparison": comparison,
            "queries": queries,
            "num_documents": len(documents),
            "num_queries": len(queries)
        }
    
    def _compare_results(
        self,
        bge: BenchmarkResult,
        embedqa: BenchmarkResult
    ) -> Dict[str, Any]:
        """Compare benchmark results and determine winner."""
        # Calculate weighted score
        # Weights: 40% recall, 40% MRR, 10% speed, 10% memory efficiency
        def calculate_score(result: BenchmarkResult) -> float:
            recall_score = result.recall_at_10
            mrr_score = result.mrr
            # Normalize latency (lower is better)
            latency_score = 1 / (result.avg_latency_ms / 100 + 1)
            # Normalize memory (lower is better)
            memory_score = 1 / (result.memory_usage_gb + 1)
            
            return (recall_score * 0.4 + 
                    mrr_score * 0.4 + 
                    latency_score * 0.1 + 
                    memory_score * 0.1)
        
        bge_score = calculate_score(bge)
        embedqa_score = calculate_score(embedqa)
        
        # Determine individual metric winners
        recall_winner = "bge_m3" if bge.recall_at_10 > embedqa.recall_at_10 else "embedqa_5"
        mrr_winner = "bge_m3" if bge.mrr > embedqa.mrr else "embedqa_5"
        speed_winner = "bge_m3" if bge.avg_latency_ms < embedqa.avg_latency_ms else "embedqa_5"
        memory_winner = "bge_m3" if bge.memory_usage_gb < embedqa.memory_usage_gb else "embedqa_5"
        
        overall_winner = "bge_m3" if bge_score > embedqa_score else "embedqa_5"
        
        comparison = {
            "overall_winner": overall_winner,
            "scores": {
                "bge_m3": bge_score,
                "embedqa_5": embedqa_score
            },
            "metric_winners": {
                "recall": recall_winner,
                "mrr": mrr_winner,
                "speed": speed_winner,
                "memory": memory_winner
            },
            "differences": {
                "recall_diff": bge.recall_at_10 - embedqa.recall_at_10,
                "mrr_diff": bge.mrr - embedqa.mrr,
                "latency_diff_ms": bge.avg_latency_ms - embedqa.avg_latency_ms,
                "memory_diff_gb": bge.memory_usage_gb - embedqa.memory_usage_gb
            }
        }
        
        return comparison
    
    def save_results(self, results: Dict[str, Any], output_path: str = "benchmark_results.json") -> None:
        """Save benchmark results to file."""
        # Convert dataclasses to dicts for JSON serialization
        save_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "bge_m3": results["bge_m3"],
            "embedqa_5": results["embedqa_5"],
            "comparison": results["comparison"],
            "num_documents": results["num_documents"],
            "num_queries": results["num_queries"]
        }
        
        with open(output_path, 'w') as f:
            json.dump(save_data, f, indent=2)
        
        print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    # Test the automated benchmarking
    print("Testing Automated Benchmarking...")
    
    benchmark = AutomatedBenchmark()
    
    # Sample documents
    documents = {
        "doc_1": """
        Machine learning algorithms learn patterns from data to make predictions.
        Deep learning uses neural networks with multiple layers for complex tasks.
        Natural language processing enables computers to understand human language.
        """,
        "doc_2": """
        Computer vision allows machines to interpret visual information from images and videos.
        Reinforcement learning trains agents to make decisions through rewards and penalties.
        Generative AI creates new content including text, images, and code.
        """
    }
    
    # Run comparison
    results = benchmark.run_comparison(documents, num_queries=5)
    
    # Save results
    benchmark.save_results(results)
    
    # Print summary
    print("\n" + "="*60)
    print("BENCHMARK SUMMARY")
    print("="*60)
    
    print(f"\nWinner: {results['comparison']['overall_winner'].upper()}")
    print(f"Score: {results['comparison']['scores'][results['comparison']['overall_winner']]:.4f}")
    print(f"\nMetric Winners:")
    for metric, winner in results['comparison']['metric_winners'].items():
        print(f"  {metric.capitalize()}: {winner.upper()}")
