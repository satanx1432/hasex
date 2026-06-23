"""
Main RAG pipeline integrating all components.
"""

import yaml
import time
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

from document_processor import DocumentProcessor, DocumentChunk
from embedding_models import BGE_M3, EmbedQA5, ModelProfiler
from vector_database import VectorDatabase, HybridSearch
from sparse_retrieval import SparseRetriever
from reranker import Reranker, NoOpReranker


class RAGPipeline:
    """Complete RAG pipeline with embeddings, retrieval, and reranking."""
    
    def __init__(self, config_path: str = "config.yaml"):
        # Load configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialize components
        self.processor = DocumentProcessor(
            chunk_size=self.config['chunking']['chunk_size'],
            chunk_overlap=self.config['chunking']['chunk_overlap']
        )
        
        # Initialize models
        self.embedding_model = BGE_M3(
            device="cuda" if __import__('torch').cuda.is_available() else "cpu"
        )
        
        self.comparison_model = EmbedQA5(
            device="cuda" if __import__('torch').cuda.is_available() else "cpu"
        )
        
        # Initialize vector database
        self.vector_db = VectorDatabase(
            collection_name=self.config['vector_db']['collection_name'],
            persist_directory=self.config['vector_db']['persist_directory']
        )
        
        # Initialize sparse retriever
        self.sparse_retriever = SparseRetriever()
        
        # Initialize hybrid search
        self.hybrid_search = HybridSearch(
            self.vector_db,
            dense_weight=self.config['search']['hybrid_weights']['dense'],
            sparse_weight=self.config['search']['hybrid_weights']['sparse']
        )
        
        # Initialize reranker
        self.reranker = Reranker(
            model_name=self.config['reranker']['name'],
            top_k=self.config['reranker']['top_k']
        )
        
        # Profiler
        self.profiler = ModelProfiler()
        
        # State
        self.indexed_documents = False
    
    def index_documents(self, documents: List[Union[str, Path]]) -> None:
        """Index documents from various sources."""
        all_chunks = []
        
        for doc in documents:
            doc_path = str(doc)
            
            if doc_path.endswith('.md') or doc_path.endswith('.markdown'):
                chunks = self.processor.process_markdown(doc_path)
            elif doc_path.endswith('.pdf'):
                chunks = self.processor.process_pdf(doc_path)
            elif doc_path.startswith('http'):
                chunks = self.processor.process_webpage(doc_path)
            else:
                # Treat as text file
                with open(doc_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                chunks = self.processor.process_text(text, source=doc_path)
            
            all_chunks.extend(chunks)
        
        print(f"Total chunks created: {len(all_chunks)}")
        
        # Generate embeddings
        print("Generating embeddings...")
        texts = [chunk.text for chunk in all_chunks]
        embeddings = self.embedding_model.encode(texts)
        
        # Add to vector database
        self.vector_db.add_documents(all_chunks, embeddings)
        
        # Index for sparse retrieval
        print("Indexing for sparse retrieval...")
        self.sparse_retriever.index_documents(all_chunks)
        
        self.indexed_documents = True
        print("Document indexing complete!")
    
    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        use_hybrid: bool = True,
        use_reranking: bool = True,
        model: str = "bge_m3"
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant documents for a query."""
        if not self.indexed_documents:
            raise ValueError("No documents indexed. Call index_documents() first.")
        
        # Select model
        if model == "bge_m3":
            embed_model = self.embedding_model
        elif model == "embedqa_5":
            embed_model = self.comparison_model
        else:
            raise ValueError(f"Unknown model: {model}")
        
        # Generate query embedding
        start_time = time.time()
        query_embedding = embed_model.encode_queries(query)
        embedding_time = time.time() - start_time
        
        # Perform search
        if use_hybrid:
            # Get sparse results
            sparse_results = self.sparse_retriever.search(query, top_k=top_k * 2)
            
            # Perform hybrid search
            dense_results = self.vector_db.search(query_embedding, top_k=top_k * 2)
            results = self.hybrid_search.hybrid_search(
                query, query_embedding, top_k=top_k * 2, sparse_results=sparse_results
            )
        else:
            # Dense only
            results = self.vector_db.search(query_embedding, top_k=top_k * 2)
        
        retrieval_time = time.time() - start_time - embedding_time
        
        # Rerank
        if use_reranking and len(results) > 0:
            rerank_start = time.time()
            results = self.reranker.rerank(query, results)
            rerank_time = time.time() - rerank_start
        else:
            rerank_time = 0
            results = results[:top_k]
        
        # Add timing info
        for result in results:
            result["timing"] = {
                "embedding_ms": embedding_time * 1000,
                "retrieval_ms": retrieval_time * 1000,
                "reranking_ms": rerank_time * 1000,
                "total_ms": (embedding_time + retrieval_time + rerank_time) * 1000
            }
        
        return results
    
    def generate_answer(
        self,
        query: str,
        retrieved_docs: List[Dict[str, Any]],
        max_length: int = 500
    ) -> str:
        """Generate an answer with citations (simplified version)."""
        if not retrieved_docs:
            return "I couldn't find any relevant information to answer your question."
        
        # Simple answer generation (in production, use an LLM)
        context = "\n\n".join([
            f"[Source: {doc['metadata'].get('source', 'unknown')}] {doc['document']}"
            for doc in retrieved_docs[:3]
        ])
        
        # Create answer with citations
        answer = f"""Based on the retrieved documents, here's what I found:

{context}

Sources:
"""
        for i, doc in enumerate(retrieved_docs[:3]):
            answer += f"{i+1}. {doc['metadata'].get('source', 'unknown')} (relevance: {doc.get('rerank_score', doc.get('score', 0)):.3f})\n"
        
        return answer
    
    def compare_models(
        self,
        queries: List[str],
        top_k: int = 10
    ) -> Dict[str, Any]:
        """Compare BGE-M3 vs EmbedQA 5 performance."""
        results = {
            "bge_m3": {},
            "embedqa_5": {}
        }
        
        for model_name, model in [("bge_m3", self.embedding_model), ("embedqa_5", self.comparison_model)]:
            print(f"\n{'='*50}")
            print(f"Testing {model_name}")
            print(f"{'='*50}")
            
            # Profile model
            sample_texts = ["Sample text for profiling"] * 10
            profile = self.profiler.profile_model(model, sample_texts)
            results[model_name]["profile"] = profile
            
            # Test retrieval
            model_results = []
            total_time = 0
            
            for query in queries:
                start_time = time.time()
                retrieved = self.retrieve(
                    query,
                    top_k=top_k,
                    use_hybrid=True,
                    use_reranking=True,
                    model=model_name
                )
                query_time = time.time() - start_time
                total_time += query_time
                
                model_results.append({
                    "query": query,
                    "num_results": len(retrieved),
                    "avg_score": sum(r.get('rerank_score', r.get('score', 0)) for r in retrieved) / len(retrieved) if retrieved else 0,
                    "time_ms": query_time * 1000
                })
            
            results[model_name]["retrieval"] = model_results
            results[model_name]["avg_query_time_ms"] = (total_time / len(queries)) * 1000
        
        return results


if __name__ == "__main__":
    # Test the RAG pipeline
    print("Testing RAG Pipeline...")
    
    # Create pipeline
    pipeline = RAGPipeline()
    
    # Test with sample documents
    sample_docs = [
        "Machine learning enables computers to learn from data without explicit programming.",
        "Deep learning uses neural networks with multiple layers for complex pattern recognition.",
        "Natural language processing helps computers understand and generate human language.",
        "Computer vision allows machines to interpret and understand visual information."
    ]
    
    # Create temporary text files
    import tempfile
    import os
    
    temp_dir = tempfile.mkdtemp()
    doc_paths = []
    
    for i, text in enumerate(sample_docs):
        doc_path = os.path.join(temp_dir, f"doc_{i}.txt")
        with open(doc_path, 'w') as f:
            f.write(text)
        doc_paths.append(doc_path)
    
    try:
        # Index documents
        pipeline.index_documents(doc_paths)
        
        # Test retrieval
        query = "What is deep learning?"
        results = pipeline.retrieve(query, top_k=3)
        
        print(f"\nQuery: {query}")
        print(f"Retrieved {len(results)} results:")
        for i, result in enumerate(results):
            print(f"\n{i+1}. Score: {result.get('rerank_score', result.get('score', 0)):.4f}")
            print(f"   Document: {result['document'][:100]}...")
            print(f"   Source: {result['metadata'].get('source', 'unknown')}")
            print(f"   Timing: {result['timing']}")
        
        # Generate answer
        answer = pipeline.generate_answer(query, results)
        print(f"\nGenerated Answer:\n{answer}")
        
    finally:
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
