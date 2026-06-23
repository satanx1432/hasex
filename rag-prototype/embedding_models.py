"""
Embedding model wrapper supporting BGE-M3 and EmbedQA 5.
"""

import torch
from transformers import AutoTokenizer, AutoModel
from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
import time


class BaseEmbeddingModel:
    """Base class for embedding models."""
    
    def __init__(self, model_name: str, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.model_name = model_name
        self.device = device
        self.dimension = None
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
        """Encode texts to embeddings."""
        raise NotImplementedError
    
    def encode_queries(self, queries: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
        """Encode queries (may differ from document encoding)."""
        return self.encode(queries, batch_size)


class BGE_M3(BaseEmbeddingModel):
    """BGE-M3 embedding model supporting dense, sparse, and multi-vector."""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        super().__init__(model_name, device)
        print(f"Loading BGE-M3 model on {device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(device)
        self.model.eval()
        self.dimension = 1024
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32, normalize: bool = True) -> np.ndarray:
        """Encode texts using dense embeddings."""
        if isinstance(texts, str):
            texts = [texts]
        
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            # Tokenize
            encoded_input = self.tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(self.device)
            
            # Encode
            with torch.no_grad():
                model_output = self.model(**encoded_input)
                # Use [CLS] token embedding
                embeddings = model_output.last_hidden_state[:, 0]
                
                if normalize:
                    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
            
            all_embeddings.append(embeddings.cpu().numpy())
        
        return np.vstack(all_embeddings)
    
    def encode_sparse(self, texts: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
        """Encode texts using sparse embeddings (lexical weights)."""
        if isinstance(texts, str):
            texts = [texts]
        
        # BGE-M3 sparse encoding
        all_sparse_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            encoded_input = self.tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(self.device)
            
            with torch.no_grad():
                model_output = self.model(**encoded_input)
                # Use the sparse embeddings from the model
                sparse_embeddings = model_output.sparse_embeddings
                
            all_sparse_embeddings.append(sparse_embeddings.cpu().numpy())
        
        return np.vstack(all_sparse_embeddings)


class EmbedQA5(BaseEmbeddingModel):
    """EmbedQA 5 embedding model for comparison."""
    
    def __init__(self, model_name: str = "nvidia/EmbedQA-5.0", device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        super().__init__(model_name, device)
        print(f"Loading EmbedQA 5 model on {device}...")
        self.model = SentenceTransformer(model_name, device=device)
        self.dimension = 768
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32, normalize: bool = True) -> np.ndarray:
        """Encode texts using SentenceTransformer."""
        if isinstance(texts, str):
            texts = [texts]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=normalize,
            show_progress_bar=False
        )
        
        return np.array(embeddings)


class ModelProfiler:
    """Profile embedding models for performance metrics."""
    
    def __init__(self):
        self.embedding_times = []
        self.memory_usage = []
    
    def profile_model(self, model: BaseEmbeddingModel, texts: List[str], warmup: int = 2) -> dict:
        """Profile model performance on a dataset."""
        print(f"\nProfiling {model.model_name}...")
        
        # Warmup
        for _ in range(warmup):
            model.encode(texts[:10])
        
        # Memory measurement
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
        
        # Timing
        start_time = time.time()
        embeddings = model.encode(texts)
        end_time = time.time()
        
        # Memory
        memory_used = 0
        if torch.cuda.is_available():
            memory_used = torch.cuda.max_memory_allocated() / (1024 ** 3)  # GB
        
        avg_time = (end_time - start_time) / len(texts)
        
        return {
            "model": model.model_name,
            "dimension": model.dimension,
            "avg_latency_ms": avg_time * 1000,
            "total_memory_gb": memory_used,
            "throughput_docs_per_sec": len(texts) / (end_time - start_time)
        }


if __name__ == "__main__":
    # Test the models
    test_texts = [
        "This is a test document for embedding generation.",
        "RAG systems combine retrieval with generation for better answers.",
        "Vector databases store embeddings for similarity search."
    ]
    
    # Test BGE-M3
    print("Testing BGE-M3...")
    bge_model = BGE_M3()
    bge_embeddings = bge_model.encode(test_texts)
    print(f"BGE-M3 embeddings shape: {bge_embeddings.shape}")
    
    # Profile BGE-M3
    profiler = ModelProfiler()
    bge_profile = profiler.profile_model(bge_model, test_texts * 10)
    print(f"BGE-M3 Profile: {bge_profile}")
