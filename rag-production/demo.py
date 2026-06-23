"""
Simple demo script to demonstrate the RAG system components without full dependencies.
"""
import time
from typing import Dict, Any, List

# Simple mock implementations for demo purposes

class MockEmbeddingModel:
    """Mock embedding model for demo."""
    def __init__(self):
        self.model_name = "BAAI/bge-m3 (mock)"
        self.device = "cpu"
        self.dimension = 1024
        
    def encode(self, texts: List[str]) -> List[List[float]]:
        """Generate mock embeddings (simple hash-based)."""
        embeddings = []
        for text in texts:
            # Simple hash-based embedding for demo
            hash_val = hash(text) % 10000
            embedding = [(hash_val + i) % 1000 / 1000.0 for i in range(1024)]
            embeddings.append(embedding)
        return embeddings

class MockVectorStore:
    """Mock vector store for demo."""
    def __init__(self):
        self.documents = {}
        self.embeddings = {}
        self.collection_name = "rag_documents"
        
    def add_documents(self, texts: List[str], embeddings: List[List[float]], metadata: List[Dict], ids: List[str]):
        """Mock document addition."""
        for i, (text, emb, meta, doc_id) in enumerate(zip(texts, embeddings, metadata, ids)):
            self.documents[doc_id] = {
                "text": text,
                "embedding": emb,
                "metadata": meta
            }
            self.embeddings[doc_id] = emb
        print(f"Added {len(ids)} documents to mock vector store")
    
    def search(self, query_embedding: List[float], top_k: int = 10):
        """Mock search using simple similarity."""
        results = []
        for doc_id, doc_data in self.documents.items():
            # Simple similarity calculation
            similarity = sum(1.0 if a == b else abs(a - b) for a, b in zip(query_embedding, doc_data["embedding"][:50])) / 50.0
            results.append({
                "id": doc_id,
                "score": similarity,
                "text": doc_data["text"],
                "metadata": doc_data["metadata"]
            })
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

class DocumentProcessor:
    """Simple document processor."""
    def __init__(self, chunk_size=512, chunk_overlap=50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process_text(self, text: str, source: str = "text_input"):
        """Simple chunking."""
        chunks = []
        for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
            chunk = text[i:i + self.chunk_size]
            if chunk:
                chunks.append({
                    "text": chunk,
                    "source": source,
                    "chunk_id": i // (self.chunk_size - self.chunk_overlap),
                    "metadata": {"chunk_size": len(chunk), "source": source}
                })
        return chunks

def run_demo():
    """Run the demo RAG system."""
    print("="*60)
    print("RAG SYSTEM DEMO")
    print("="*60)
    
    # Initialize components
    print("\n1. Initializing components...")
    processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
    embedding_model = MockEmbeddingModel()
    vector_store = MockVectorStore()
    
    # Sample document
    sample_text = """
    Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.
    
    Deep learning is a subset of machine learning that uses neural networks with multiple layers to progressively extract higher-level features from raw input. It has revolutionized fields like computer vision, natural language processing, and speech recognition.
    
    Natural language processing (NLP) is a branch of artificial intelligence that helps computers understand, interpret, and manipulate human language. It enables machines to read text, hear speech, interpret it, measure sentiment, and determine which parts are important.
    """
    
    # Process document
    print("\n2. Processing document...")
    chunks = processor.process_text(sample_text, source="demo_doc")
    texts = [chunk["text"] for chunk in chunks]
    metadata = [chunk["metadata"] for chunk in chunks]
    print(f"Created {len(chunks)} chunks")
    
    # Generate embeddings
    print("\n3. Generating embeddings...")
    embeddings = embedding_model.encode(texts)
    print(f"Generated {len(embeddings)} embeddings (dimension: {embedding_model.dimension})")
    
    # Store in vector database
    print("\n4. Storing in vector database...")
    import uuid
    document_id = str(uuid.uuid4())
    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    vector_store.add_documents(texts, embeddings, metadata, ids)
    
    # Search
    print("\n5. Testing search...")
    query = "What is deep learning?"
    query_embedding = embedding_model.encode([query])[0]
    results = vector_store.search(query_embedding, top_k=3)
    
    print(f"\nQuery: {query}")
    print(f"\nTop {len(results)} results:")
    for i, result in enumerate(results):
        print(f"\n{i+1}. Score: {result['score']:.4f}")
        print(f"   Text: {result['text'][:100]}...")
        print(f"   Source: {result['metadata'].get('source', 'unknown')}")
    
    # Generate answer
    print("\n6. Generating answer...")
    answer = f"Based on the retrieved documents, I found information about: {results[0]['text'][:150]}... This appears to be related to machine learning and AI concepts."
    print(f"\nAnswer: {answer}")
    
    print("\n" + "="*60)
    print("DEMO COMPLETE")
    print("="*60)
    print("\nProduction System Features:")
    print("✓ BGE-M3 real embeddings (1024-dim)")
    print("✓ Qdrant vector database (cosine similarity)")
    print("✓ Hybrid search (dense + BM25)")
    print("✓ Cross-encoder reranking")
    print("✓ FastAPI with streaming support")
    print("✓ Document ingestion (PDF, Markdown, Web)")
    print("✓ Docker deployment with Qdrant")
    print("\nTo run the full system:")
    print("1. Install Docker Desktop")
    print("2. Run: docker-compose up -d")
    print("3. Access API at http://localhost:8000")

if __name__ == "__main__":
    run_demo()
