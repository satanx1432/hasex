"""
Hybrid search combining dense and sparse retrieval with reranking.
"""
from rank_bm25 import BM25Okapi
from typing import List, Dict, Any
import re
import numpy as np
from embedding_model import EmbeddingModel, Reranker
from vector_store import VectorStore


class SparseRetriever:
    """BM25 sparse retrieval for keyword matching."""
    
    def __init__(self):
        self.bm25 = None
        self.documents = []
        self.document_ids = []
        self.tokenized_corpus = []
    
    def index_documents(self, documents: List[str], document_ids: List[str]) -> None:
        """Index documents for BM25 retrieval."""
        self.documents = documents
        self.document_ids = document_ids
        
        # Tokenize documents
        self.tokenized_corpus = [self._tokenize(doc) for doc in documents]
        
        # Create BM25 index
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        print(f"Indexed {len(documents)} documents for sparse retrieval")
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization."""
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens
    
    def search(self, query: str, top_k: int = 20) -> List[Dict[str, Any]]:
        """Search for relevant documents using BM25."""
        if self.bm25 is None:
            return []
        
        # Tokenize query
        tokenized_query = self._tokenize(query)
        
        # Get BM25 scores
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top-k results
        top_indices = scores.argsort()[-top_k:][::-1]
        
        # Format results
        results = []
        for idx in top_indices:
            if idx < len(self.documents):
                results.append({
                    "id": self.document_ids[idx],
                    "document": self.documents[idx],
                    "score": float(scores[idx])
                })
        
        return results


class HybridSearch:
    """Hybrid search combining dense and sparse retrieval."""
    
    def __init__(
        self,
        vector_store: VectorStore,
        embedding_model: EmbeddingModel,
        reranker: Reranker,
        dense_weight: float = 0.7,
        sparse_weight: float = 0.3
    ):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.reranker = reranker
        self.dense_weight = dense_weight
        self.sparse_weight = sparse_weight
        
        # Initialize sparse retriever
        self.sparse_retriever = SparseRetriever()
        self.sparse_indexed = False
    
    def index_for_hybrid(self, documents: List[str], document_ids: List[str]) -> None:
        """Index documents for hybrid search."""
        # Index for sparse retrieval
        self.sparse_retriever.index_documents(documents, document_ids)
        self.sparse_indexed = True
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        use_hybrid: bool = True,
        use_reranking: bool = True,
        filter_conditions: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Search using hybrid approach."""
        # Generate query embedding
        query_embedding = self.embedding_model.encode_queries(query)
        
        # Dense search (always performed)
        dense_results = self.vector_store.search(
            query_embedding,
            top_k=top_k * 2 if use_hybrid else top_k,
            filter_conditions=filter_conditions
        )
        
        if use_hybrid and self.sparse_indexed:
            # Sparse search
            sparse_results = self.sparse_retriever.search(query, top_k=top_k * 2)
            
            # Combine results
            combined_results = self._combine_results(dense_results, sparse_results)
            
            # Take top-k
            results = combined_results[:top_k * 2]
        else:
            results = dense_results
        
        # Rerank
        if use_reranking and len(results) > 0:
            results = self._rerank_results(query, results, top_k)
        else:
            results = results[:top_k]
        
        return results
    
    def _combine_results(
        self,
        dense_results: List[Dict[str, Any]],
        sparse_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Combine dense and sparse search results."""
        combined_scores = {}
        result_map = {}
        
        # Score dense results
        for result in dense_results:
            doc_id = result.get("id", result.get("metadata", {}).get("document_id", str(id(result))))
            combined_scores[doc_id] = self.dense_weight * result["score"]
            result_map[doc_id] = result
        
        # Score sparse results
        for result in sparse_results:
            doc_id = result.get("id")
            sparse_score = result["score"]
            
            if doc_id in combined_scores:
                combined_scores[doc_id] += self.sparse_weight * sparse_score
            else:
                combined_scores[doc_id] = self.sparse_weight * sparse_score
                # Create result from sparse
                result_map[doc_id] = {
                    "id": doc_id,
                    "text": result["document"],
                    "score": sparse_score,
                    "metadata": {}
                }
        
        # Sort by combined score
        sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)
        
        # Build final results
        final_results = []
        for doc_id in sorted_ids:
            result = result_map[doc_id].copy()
            result["combined_score"] = combined_scores[doc_id]
            result["original_score"] = result.get("score", 0)
            result["score"] = combined_scores[doc_id]  # Use combined as main score
            final_results.append(result)
        
        return final_results
    
    def _rerank_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Rerank results using cross-encoder."""
        documents = [r.get("text", "") for r in results]
        
        # Rerank
        top_indices = self.reranker.rerank_with_scores(query, documents, top_k)
        
        # Build reranked results
        reranked_results = []
        for idx, score in top_indices:
            result = results[idx].copy()
            result["rerank_score"] = float(score)
            reranked_results.append(result)
        
        return reranked_results
    
    def generate_answer(
        self,
        query: str,
        retrieved_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate answer with citations from retrieved documents."""
        if not retrieved_docs:
            return {
                "answer": "I couldn't find any relevant information to answer your question.",
                "sources": []
            }
        
        # Format answer with citations
        context_parts = []
        sources = []
        
        for i, doc in enumerate(retrieved_docs[:3]):
            text = doc.get("text", "")
            source = doc.get("metadata", {}).get("source", doc.get("id", "unknown"))
            score = doc.get("rerank_score", doc.get("score", 0))
            
            context_parts.append(f"[{i+1}] {text[:200]}...")
            sources.append({
                "source": source,
                "relevance": float(score)
            })
        
        answer = f"Based on the retrieved documents, here's what I found:\n\n"
        answer += " ".join(context_parts)
        answer += "\n\nSources:"
        for i, source_info in enumerate(sources):
            answer += f"\n{i+1}. {source_info['source']} (relevance: {source_info['relevance']:.3f})"
        
        return {
            "answer": answer,
            "sources": sources,
            "num_retrieved": len(retrieved_docs)
        }
