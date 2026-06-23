"""
Sparse retrieval using BM25 for hybrid search.
"""

from rank_bm25 import BM25Okapi
from typing import List, Dict, Any
import re
from document_processor import DocumentChunk


class SparseRetriever:
    """BM25-based sparse retrieval for keyword matching."""
    
    def __init__(self):
        self.bm25 = None
        self.documents = []
        self.document_ids = []
        self.tokenized_corpus = []
    
    def index_documents(self, chunks: List[DocumentChunk]) -> None:
        """Index documents for BM25 retrieval."""
        self.documents = chunks
        self.document_ids = [f"{chunk.source}_{chunk.chunk_id}" for chunk in chunks]
        
        # Tokenize documents
        self.tokenized_corpus = [
            self._tokenize(chunk.text)
            for chunk in chunks
        ]
        
        # Create BM25 index
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        print(f"Indexed {len(chunks)} documents for sparse retrieval")
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization for BM25."""
        # Convert to lowercase and split on non-alphanumeric characters
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
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
                    "document": self.documents[idx].text,
                    "metadata": self.documents[idx].metadata,
                    "score": float(scores[idx])
                })
        
        return results
    
    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the sparse index."""
        return {
            "document_count": len(self.documents),
            "avg_doc_length": sum(len(doc) for doc in self.tokenized_corpus) / len(self.tokenized_corpus) if self.tokenized_corpus else 0,
            "vocabulary_size": len(set(word for doc in self.tokenized_corpus for word in doc)) if self.tokenized_corpus else 0
        }


if __name__ == "__main__":
    # Test the sparse retriever
    print("Testing Sparse Retriever...")
    
    from document_processor import DocumentProcessor
    
    # Create test chunks
    processor = DocumentProcessor()
    test_texts = [
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks with multiple layers.",
        "Natural language processing deals with text and speech.",
        "Computer vision enables machines to interpret visual information.",
        "Reinforcement learning involves agents learning through rewards."
    ]
    
    chunks = []
    for i, text in enumerate(test_texts):
        chunks.extend(processor.process_text(text, source=f"doc_{i}"))
    
    # Index documents
    retriever = SparseRetriever()
    retriever.index_documents(chunks)
    
    # Search
    query = "neural networks and deep learning"
    results = retriever.search(query, top_k=3)
    
    print(f"\nQuery: '{query}'")
    print(f"Found {len(results)} results:")
    for i, result in enumerate(results):
        print(f"{i+1}. Score: {result['score']:.4f}")
        print(f"   Text: {result['document'][:100]}...")
    
    print(f"\nIndex stats: {retriever.get_index_stats()}")
