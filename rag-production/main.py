"""
FastAPI application for RAG system.
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import tempfile
import os
import time
from pathlib import Path

from config import settings
from document_processor import DocumentProcessor
from embedding_model import EmbeddingModel, Reranker
from vector_store import VectorStore
from hybrid_search import HybridSearch
from supabase_client import SupabaseClient


# Pydantic models
class IngestRequest(BaseModel):
    text: str
    source: str = "text_input"
    metadata: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    use_hybrid: bool = True
    use_reranking: bool = True
    filter_conditions: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    use_hybrid: bool = True
    use_reranking: bool = True


class SearchResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    num_results: int
    model: str
    processing_time_ms: float


class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    query: str
    model: str
    processing_time_ms: float


# Initialize FastAPI app
app = FastAPI(
    title="Production RAG API",
    description="RAG system with BGE-M3 embeddings and Qdrant vector database",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global components (initialized on startup)
vector_store = None
embedding_model = None
reranker = None
hybrid_search = None
document_processor = None
supabase_client = None


@app.on_event("startup")
async def startup_event():
    """Initialize components on startup."""
    global vector_store, embedding_model, reranker, hybrid_search, document_processor, supabase_client
    
    print("Initializing RAG system components...")
    
    # Initialize components
    document_processor = DocumentProcessor(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )
    
    embedding_model = EmbeddingModel()
    reranker = Reranker()
    vector_store = VectorStore()
    
    # Initialize Supabase client
    try:
        supabase_client = SupabaseClient()
        print("Supabase client initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize Supabase client: {e}")
        supabase_client = None
    
    hybrid_search = HybridSearch(
        vector_store=vector_store,
        embedding_model=embedding_model,
        reranker=reranker
    )
    
    print("RAG system initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down RAG system...")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Production RAG API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check vector store connection
        collection_info = vector_store.get_collection_info()
        return {
            "status": "healthy",
            "vector_store": "connected",
            "collection_info": collection_info,
            "model": embedding_model.model_name,
            "device": embedding_model.device
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")


@app.post("/ingest/text", response_model=Dict[str, Any])
async def ingest_text(request: IngestRequest):
    """Ingest text document."""
    try:
        start_time = time.time()
        
        # Process text
        chunks = document_processor.process_text(
            request.text,
            source=request.source,
            doc_type=request.metadata.get("doc_type", "text") if request.metadata else "text"
        )
        
        # Generate embeddings
        texts = [chunk.text for chunk in chunks]
        embeddings = embedding_model.encode(texts)
        
        # Prepare metadata
        metadata_list = []
        for chunk in chunks:
            meta = chunk.metadata.copy()
            if request.metadata:
                meta.update(request.metadata)
            metadata_list.append(meta)
        
        # Store in vector database
        import uuid
        document_id = str(uuid.uuid4())
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        
        vector_store.add_documents(
            texts=texts,
            embeddings=embeddings,
            metadata=metadata_list,
            ids=ids
        )
        
        # Store metadata in Supabase
        if supabase_client:
            supabase_client.store_document_metadata(
                document_id=document_id,
                metadata={
                    "source": request.source,
                    "num_chunks": len(chunks),
                    **(request.metadata or {})
                }
            )
            
            # Store chunk metadata
            for i, (chunk_id, meta) in enumerate(zip(ids, metadata_list)):
                supabase_client.store_chunk_metadata(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    metadata=meta
                )
        
        # Index for hybrid search
        hybrid_search.index_for_hybrid(texts, ids)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "document_id": document_id,
            "num_chunks": len(chunks),
            "processing_time_ms": processing_time,
            "message": "Text ingested successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/ingest/file", response_model=Dict[str, Any])
async def ingest_file(file: UploadFile = File(...)):
    """Ingest file (PDF or Markdown)."""
    try:
        start_time = time.time()
        
        # Validate file size
        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        
        if size_mb > settings.max_document_size_mb:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.max_document_size_mb}MB"
            )
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Process based on file type
            file_path = Path(tmp_file_path)
            source = file.filename
            
            if file_path.suffix.lower() == '.pdf':
                chunks = document_processor.process_pdf(str(file_path), source)
            elif file_path.suffix.lower() in ['.md', '.markdown']:
                chunks = document_processor.process_markdown(str(file_path), source)
            else:
                chunks = document_processor.process_text(content.decode('utf-8'), source, "text")
            
            # Generate embeddings
            texts = [chunk.text for chunk in chunks]
            embeddings = embedding_model.encode(texts)
            
            # Prepare metadata
            metadata_list = []
            for chunk in chunks:
                meta = chunk.metadata.copy()
                meta["filename"] = file.filename
                meta["file_type"] = file_path.suffix.lower()
                metadata_list.append(meta)
            
            # Store in vector database
            import uuid
            document_id = str(uuid.uuid4())
            ids = [f"{document_id}_{i}" for i in range(len(chunks))]
            
            vector_store.add_documents(
                texts=texts,
                embeddings=embeddings,
                metadata=metadata_list,
                ids=ids
            )
            
            # Index for hybrid search
            hybrid_search.index_for_hybrid(texts, ids)
            
            processing_time = (time.time() - start_time) * 1000
            
            return {
                "document_id": document_id,
                "filename": file.filename,
                "num_chunks": len(chunks),
                "processing_time_ms": processing_time,
                "message": "File ingested successfully"
            }
        
        finally:
            # Cleanup temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File ingestion failed: {str(e)}")


@app.post("/ingest/url", response_model=Dict[str, Any])
async def ingest_url(url: str, background_tasks: BackgroundTasks):
    """Ingest webpage (async)."""
    async def process_url(url: str):
        try:
            chunks = document_processor.process_webpage(url)
            
            if not chunks:
                return {"error": "No content extracted from URL"}
            
            # Generate embeddings
            texts = [chunk.text for chunk in chunks]
            embeddings = embedding_model.encode(texts)
            
            # Prepare metadata
            metadata_list = []
            for chunk in chunks:
                meta = chunk.metadata.copy()
                metadata_list.append(meta)
            
            # Store in vector database
            import uuid
            document_id = str(uuid.uuid4())
            ids = [f"{document_id}_{i}" for i in range(len(chunks))]
            
            vector_store.add_documents(
                texts=texts,
                embeddings=embeddings,
                metadata=metadata_list,
                ids=ids
            )
            
            # Index for hybrid search
            hybrid_search.index_for_hybrid(texts, ids)
            
            return {
                "document_id": document_id,
                "url": url,
                "num_chunks": len(chunks),
                "message": "URL ingested successfully"
            }
        
        except Exception as e:
            return {"error": str(e)}
    
    # Process in background
    background_tasks.add_task(process_url, url)
    
    return {
        "message": "URL ingestion started",
        "url": url,
        "status": "processing"
    }


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Search documents."""
    try:
        start_time = time.time()
        
        results = hybrid_search.search(
            query=request.query,
            top_k=request.top_k,
            use_hybrid=request.use_hybrid,
            use_reranking=request.use_reranking,
            filter_conditions=request.filter_conditions
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return SearchResponse(
            query=request.query,
            results=results,
            num_results=len(results),
            model=embedding_model.model_name,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint with answer generation."""
    try:
        start_time = time.time()
        
        # Retrieve documents
        retrieved_docs = hybrid_search.search(
            query=request.query,
            top_k=request.top_k,
            use_hybrid=request.use_hybrid,
            use_reranking=request.use_reranking
        )
        
        # Generate answer
        answer_data = hybrid_search.generate_answer(request.query, retrieved_docs)
        
        processing_time = (time.time() - start_time) * 1000
        
        return ChatResponse(
            answer=answer_data["answer"],
            sources=answer_data["sources"],
            query=request.query,
            model=embedding_model.model_name,
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Chat endpoint with streaming response."""
    async def generate_stream():
        try:
            # Retrieve documents
            retrieved_docs = hybrid_search.search(
                query=request.query,
                top_k=request.top_k,
                use_hybrid=request.use_hybrid,
                use_reranking=request.use_reranking
            )
            
            # Generate answer
            answer_data = hybrid_search.generate_answer(request.query, retrieved_docs)
            
            # Stream the answer
            answer = answer_data["answer"]
            for char in answer:
                yield char
            
            # Send metadata
            yield "\n\n---METADATA---\n"
            import json
            yield json.dumps({
                "sources": answer_data["sources"],
                "num_retrieved": answer_data["num_retrieved"],
                "model": embedding_model.model_name
            })
        
        except Exception as e:
            yield f"Error: {str(e)}"
    
    return StreamingResponse(generate_stream(), media_type="text/plain")


@app.get("/stats")
async def get_stats():
    """Get system statistics."""
    try:
        collection_info = vector_store.get_collection_info()
        
        return {
            "vector_store": collection_info,
            "model": {
                "name": embedding_model.model_name,
                "dimension": embedding_model.get_dimension(),
                "device": embedding_model.device
            },
            "settings": {
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "hybrid_search_enabled": hybrid_search.sparse_indexed
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
