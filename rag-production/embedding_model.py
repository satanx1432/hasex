"""
BGE-M3 embedding model wrapper.
"""
import torch
from transformers import AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer
from typing import List, Union
import numpy as np
from config import settings


class EmbeddingModel:
    """BGE-M3 embedding model."""
    
    def __init__(
        self,
        model_name: str = None,
        device: str = None
    ):
        self.model_name = model_name or settings.embedding_model
        self.device = device or settings.device
        
        # Check if CUDA is available
        if self.device == "cuda" and not torch.cuda.is_available():
            print("CUDA not available, falling back to CPU")
            self.device = "cpu"
        
        print(f"Loading {self.model_name} on {self.device}...")
        
        # Try sentence-transformers first (simpler)
        try:
            self.model = SentenceTransformer(self.model_name, device=self.device)
            self.use_sentence_transformers = True
            self.dimension = self.model.get_sentence_embedding_dimension()
        except:
            # Fall back to transformers
            print("Falling back to transformers...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            self.use_sentence_transformers = False
            self.dimension = 1024  # BGE-M3 default
        
        print(f"Model loaded. Dimension: {self.dimension}")
    
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        normalize: bool = True
    ) -> np.ndarray:
        """Encode texts to embeddings."""
        if isinstance(texts, str):
            texts = [texts]
        
        if self.use_sentence_transformers:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                normalize_embeddings=normalize,
                show_progress_bar=False
            )
            return np.array(embeddings)
        else:
            return self._encode_with_transformers(texts, batch_size, normalize)
    
    def _encode_with_transformers(
        self,
        texts: List[str],
        batch_size: int,
        normalize: bool
    ) -> np.ndarray:
        """Encode using transformers."""
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
                embeddings = model_output.last_hidden_state[:, 0]
                
                if normalize:
                    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
            
            all_embeddings.append(embeddings.cpu().numpy())
        
        return np.vstack(all_embeddings)
    
    def encode_queries(
        self,
        queries: Union[str, List[str]],
        batch_size: int = 32
    ) -> np.ndarray:
        """Encode queries (may use different prompts)."""
        # For BGE-M3, we can add query prefix for better performance
        if isinstance(queries, str):
            queries = [queries]
        
        # Add query prefix
        prefixed_queries = [f"Represent this sentence for searching relevant passages: {q}" for q in queries]
        
        return self.encode(prefixed_queries, batch_size=batch_size)
    
    def get_dimension(self) -> int:
        """Get embedding dimension."""
        return self.dimension


class Reranker:
    """Cross-encoder reranking model."""
    
    def __init__(
        self,
        model_name: str = None,
        device: str = None
    ):
        self.model_name = model_name or settings.reranker_model
        self.device = device or settings.device
        
        # Check if CUDA is available
        if self.device == "cuda" and not torch.cuda.is_available():
            print("CUDA not available for reranker, falling back to CPU")
            self.device = "cpu"
        
        print(f"Loading reranker {self.model_name} on {self.device}...")
        
        from cross_encoder import CrossEncoder
        self.model = CrossEncoder(self.model_name, device=self.device)
    
    def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5
    ) -> List[int]:
        """Rerank documents and return top-k indices."""
        # Create query-document pairs
        pairs = [[query, doc] for doc in documents]
        
        # Score
        scores = self.model.predict(pairs)
        
        # Get top-k indices
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        return top_indices.tolist()
    
    def rerank_with_scores(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5
    ) -> List[tuple]:
        """Rerank and return (index, score) tuples."""
        pairs = [[query, doc] for doc in documents]
        scores = self.model.predict(pairs)
        
        # Sort and return top-k
        scored = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return scored[:top_k]
