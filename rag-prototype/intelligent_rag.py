"""
Intelligent RAG system with automatic model selection.
This system automatically benchmarks models and uses the best one.
"""

import argparse
import json
import time
from typing import List, Dict, Any
import torch
from document_processor import DocumentProcessor

from document_processor import DocumentProcessor
from embedding_models import BGE_M3, EmbedQA5
from supabase_vector_store import get_vector_store
from sparse_retrieval import SparseRetriever
from reranker import Reranker, NoOpReranker
from automated_benchmark import AutomatedBenchmark
from intelligent_selector import ModelSelector, UseCase


class IntelligentRAG:
    """Complete RAG system with automatic model selection."""
    
    def __init__(
        self,
        auto_select_model: bool = True,
        force_model: str = None,
        use_supabase: bool = False,
        chunk_size: int = 512,
        chunk_overlap: int = 50
    ):
        self.auto_select_model = auto_select_model
        self.force_model = force_model
        self.use_supabase = use_supabase
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize components
        self.processor = DocumentProcessor(chunk_size, chunk_overlap)
        self.vector_store = get_vector_store(use_supabase=use_supabase)
        self.sparse_retriever = SparseRetriever()
        
        # Models
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.bge_m3 = BGE_M3(device=device)
        self.embedqa_5 = EmbedQA5(device=device)
        
        # Reranker
        self.reranker = Reranker(device=device)
        
        # Selected model (to be determined)
        self.selected_model = None
        self.model_selection_info = None
        
        # State
        self.indexed = False
        self.benchmark_run = False
    
    def setup_and_select_model(
        self,
        documents: Dict[str, str],
        num_benchmark_queries: int = 20
    ) -> Dict[str, Any]:
        """Setup system and automatically select best model."""
        print("\n" + "="*70)
        print("INTELLIGENT RAG SYSTEM - AUTOMATIC MODEL SELECTION")
        print("="*70)
        
        # Step 1: Prepare documents
        print("\nStep 1: Document Preparation")
        chunked_docs = {}
        for doc_id, content in documents.items():
            chunks = self.processor.process_text(content, source=doc_id)
            chunked_docs[doc_id] = [chunk.text for chunk in chunks]
            print(f"  {doc_id}: {len(chunks)} chunks")
        
        # Step 2: Run automatic benchmark
        if self.auto_select_model and not self.force_model:
            print("\nStep 2: Automatic Model Benchmarking")
            benchmark = AutomatedBenchmark()
            benchmark_results = benchmark.run_comparison(documents, num_benchmark_queries)
            
            # Save benchmark results
            benchmark.save_results(benchmark_results)
            
            # Step 3: Intelligent model selection
            print("\nStep 3: Intelligent Model Selection")
            selector = ModelSelector()
            self.model_selection_info = selector.auto_select_from_benchmark(benchmark_results)
            selector.save_selection(self.model_selection_info)
            
            # Select model based on recommendation
            self.selected_model = self.model_selection_info["selected_model"]
            print(f"\nAutomatically selected: {self.selected_model.upper()}")
            print(f"Reasoning: {self.model_selection_info['reasoning']}")
            
            self.benchmark_run = True
        
        elif self.force_model:
            print(f"\nUsing forced model: {self.force_model}")
            self.selected_model = self.force_model
            self.model_selection_info = {
                "selected_model": self.force_model,
                "reasoning": "User-specified model"
            }
        else:
            # Default to BGE-M3
            print("\nUsing default model: BGE-M3")
            self.selected_model = "bge_m3"
            self.model_selection_info = {
                "selected_model": "bge_m3",
                "reasoning": "Default selection (no benchmark run)"
            }
        
        # Step 4: Index with selected model
        print(f"\nStep 4: Indexing with {self.selected_model.upper()}")
        self._index_with_selected_model(chunked_docs)
        
        # Step 5: Index for sparse retrieval
        print("\nStep 5: Indexing for Sparse Retrieval")
        self._index_sparse_retrieval(documents)
        
        self.indexed = True
        
        return {
            "selected_model": self.selected_model,
            "selection_info": self.model_selection_info,
            "num_documents": len(documents),
            "num_chunks": sum(len(chunks) for chunks in chunked_docs.values())
        }
    
    def _index_with_selected_model(self, chunked_docs: Dict[str, List[str]]) -> None:
        """Index documents using the selected model."""
        # Select model
        if self.selected_model == "bge_m3":
            model = self.bge_m3
        elif self.selected_model == "embedqa_5":
            model = self.embedqa_5
        else:
            raise ValueError(f"Unknown model: {self.selected_model}")
        
        # Flatten chunks
        all_chunks = []
        all_doc_ids = []
        
        for doc_id, chunks in chunked_docs.items():
            all_chunks.extend(chunks)
            all_doc_ids.extend([doc_id] * len(chunks))
        
        # Generate embeddings
        print(f"  Generating embeddings with {model.model_name}...")
        embeddings = model.encode(all_chunks)
        print(f"  Generated {len(embeddings)} embeddings")
        
        # Store in vector database
        for doc_id, chunks in chunked_docs.items():
            doc_embeddings = embeddings[len(all_doc_ids) - len(all_chunks):len(all_doc_ids)]
            self.vector_store.add_embeddings(
                doc_id, chunks, doc_embeddings, source=doc_id
            )
            all_doc_ids = all_doc_ids[:len(all_doc_ids) - len(chunks)]
        
        print(f"  Indexed {len(chunked_docs)} documents")
    
    def _index_sparse_retrieval(self, documents: Dict[str, str]) -> None:
        """Index documents for sparse retrieval."""
        from document_processor import DocumentProcessor
        
        processor = DocumentProcessor(self.chunk_size, self.chunk_overlap)
        
        all_chunks = []
        for doc_id, content in documents.items():
            chunks = processor.process_text(content, source=doc_id)
            all_chunks.extend(chunks)
        
        self.sparse_retriever.index_documents(all_chunks)
        print(f"  Indexed {len(all_chunks)} chunks for sparse retrieval")
    
    def query(
        self,
        query: str,
        top_k: int = 10,
        use_reranking: bool = True,
        use_hybrid: bool = True
    ) -> Dict[str, Any]:
        """Query the RAG system."""
        if not self.indexed:
            raise ValueError("System not indexed. Call setup_and_select_model() first.")
        
        print(f"\nQuery: {query}")
        print(f"Model: {self.selected_model.upper()}")
        
        start_time = time.time()
        
        # Get query embedding
        if self.selected_model == "bge_m3":
            model = self.bge_m3
        else:
            model = self.embedqa_5
        
        query_embedding = model.encode_queries(query)
        embedding_time = time.time() - start_time
        
        # Dense search
        dense_results = self.vector_store.search(query_embedding, top_k=top_k * 2)
        dense_time = time.time() - start_time - embedding_time
        
        # Hybrid search
        if use_hybrid:
            sparse_results = self.sparse_retriever.search(query, top_k=top_k * 2)
            
            # Combine results
            combined_scores = {}
            
            # Score dense results
            for result in dense_results:
                doc_id = result["id"]
                combined_scores[doc_id] = 0.7 * result["score"]
            
            # Score sparse results
            for result in sparse_results:
                doc_id = result["id"]
                sparse_score = result["score"]
                if doc_id in combined_scores:
                    combined_scores[doc_id] += 0.3 * sparse_score
                else:
                    combined_scores[doc_id] = 0.3 * sparse_score
            
            # Sort and select top-k
            sorted_results = sorted(
                combined_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            results = []
            for doc_id, score in sorted_results[:top_k * 2]:
                for result in dense_results + sparse_results:
                    if result["id"] == doc_id:
                        result["combined_score"] = score
                        results.append(result)
                        break
            
            results = sorted(results, key=lambda x: x["combined_score"], reverse=True)[:top_k]
        else:
            results = dense_results[:top_k]
        
        retrieval_time = time.time() - start_time - embedding_time - dense_time
        
        # Reranking
        if use_reranking and len(results) > 0:
            rerank_start = time.time()
            results = self.reranker.rerank(query, results)
            rerank_time = time.time() - rerank_start
        else:
            rerank_time = 0
        
        total_time = time.time() - start_time
        
        # Add timing info
        for result in results:
            result["timing"] = {
                "embedding_ms": embedding_time * 1000,
                "retrieval_ms": retrieval_time * 1000,
                "reranking_ms": rerank_time * 1000,
                "total_ms": total_time * 1000,
                "model": self.selected_model
            }
        
        return {
            "query": query,
            "results": results,
            "model_used": self.selected_model,
            "timing": {
                "total_ms": total_time * 1000,
                "embedding_ms": embedding_time * 1000,
                "retrieval_ms": retrieval_time * 1000,
                "reranking_ms": rerank_time * 1000
            }
        }
    
    def generate_answer(self, query: str, retrieved_docs: List[Dict[str, Any]]) -> str:
        """Generate answer with citations."""
        if not retrieved_docs:
            return "I couldn't find any relevant information to answer your question."
        
        # Format answer with citations
        answer = f"Based on the retrieved documents, here's what I found:\n\n"
        
        for i, doc in enumerate(retrieved_docs[:3]):
            source = doc.get("metadata", {}).get("source", "unknown")
            score = doc.get("rerank_score", doc.get("score", 0))
            answer += f"{i+1}. [{source}] {doc['content'][:150]}... (relevance: {score:.3f})\n\n"
        
        answer += f"\nAnswer generated using {self.selected_model.upper()} model."
        answer += f"\nRetrieved {len(retrieved_docs)} relevant documents."
        
        return answer
    
    def get_tradeoff_analysis(self) -> Dict[str, Any]:
        """Generate comprehensive tradeoff analysis."""
        if not self.model_selection_info:
            return {"error": "No model selection data available"}
        
        selected = self.model_selection_info["selected_model"]
        other = "embedqa_5" if selected == "bge_m3" else "bge_m3"
        
        analysis = {
            "selected_model": selected.upper(),
            "selection_reasoning": self.model_selection_info["reasoning"],
            "tradeoffs": self.model_selection_info.get("tradeoffs", {}),
            "performance_comparison": {
                selected: self.model_selection_info["capabilities"],
                alternative: self.capabilities[other] if other in self.capabilities else "N/A"
            },
            "recommendation_summary": self._generate_tradeoff_summary(selected, other)
        }
        
        return analysis
    
    def _generate_tradeoff_summary(self, selected: str, other: str) -> str:
        """Generate a human-readable tradeoff summary."""
        selected_caps = self.capabilities[selected]
        other_caps = self.capabilities.get(other)
        
        if not other_caps:
            return f"{selected.upper()} was selected. No comparison model available."
        
        summary_parts = []
        
        # Quality comparison
        if selected_caps.recall_quality > other_caps.recall_quality:
            improvement = (selected_caps.recall_quality - other_caps.recall_quality) * 100
            summary_parts.append(f"Selected model achieves {improvement:.1f}% higher recall.")
        
        # Performance comparison
        if selected_caps.avg_latency_ms < other_caps.avg_latency_ms:
            improvement = (other_caps.avg_latency_ms - selected_caps.avg_latency_ms)
            summary_parts.append(f"Selected model is {improvement:.0f}ms faster.")
        else:
            increase = (selected_caps.avg_latency_ms - other_caps.avg_latency_ms)
            summary_parts.append(f"Selected model is {increase:.0f}ms slower.")
        
        # Memory comparison
        if selected_caps.memory_usage_gb < other_caps.memory_usage_gb:
            savings = (other_caps.memory_usage_gb - selected_caps.memory_usage_gb)
            summary_parts.append(f"Selected model uses {savings:.1f}GB less memory.")
        else:
            extra = (selected_caps.memory_usage_gb - other_caps.memory_usage_gb)
            summary_parts.append(f"Selected model uses {extra:.1f}GB more memory.")
        
        # Feature comparison
        if selected_caps.multilingual and not other_caps.multilingual:
            summary_parts.append("Selected model supports multilingual queries.")
        
        if selected_caps.sparse_support and not other_caps.sparse_support:
            summary_parts.append("Selected model enables hybrid search for better precision.")
        
        return " ".join(summary_parts)


if __name__ == "__main__":
    # Test the intelligent RAG system
    print("Testing Intelligent RAG System...")
    
    # Sample documents
    documents = {
        "ml_guide": """
        Machine learning enables computers to learn from data without explicit programming.
        Deep learning uses neural networks with multiple layers for pattern recognition.
        Supervised learning uses labeled data to train algorithms.
        """,
        "ai_applications": """
        Natural language processing powers chatbots and translation services.
        Computer vision enables self-driving cars and medical image analysis.
        Reinforcement learning trains agents through reward systems.
        Generative AI creates content including text, images, and code.
        """
    }
    
    # Create system
    rag = IntelligentRAG(auto_select_model=True, use_supabase=False)
    
    # Setup and select model
    setup_result = rag.setup_and_select_model(documents, num_benchmark_queries=5)
    
    # Test query
    query = "What is deep learning?"
    result = rag.query(query, top_k=5, use_reranking=True, use_hybrid=True)
    
    print(f"\nQuery Results:")
    print(f"  Model: {result['model_used']}")
    print(f"  Total time: {result['timing']['total_ms']:.1f}ms")
    print(f"  Retrieved {len(result['results'])} documents")
    
    # Generate answer
    answer = rag.generate_answer(query, result['results'])
    print(f"\n{answer}")
    
    # Tradeoff analysis
    analysis = rag.get_tradeoff_analysis()
    print(f"\n{analysis}")
