"""
Adaptive Memory & User Modeling System
Transforms raw conversations into evolving user understanding.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import hashlib

from supabase import create_client


class MemoryType(Enum):
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    BEHAVIORAL = "behavioral"


class Confidence:
    """Confidence scoring system for memories."""
    
    def __init__(self, initial_confidence: float = 0.5, decay_rate: float = 0.95):
        self.initial_confidence = initial_confidence
        self.decay_rate = decay_rate
    
    def decay(self, current_confidence: float) -> float:
        """Apply decay to confidence."""
        return max(0.01, current_confidence * self.decay_rate)
    
    def strengthen(self, current_confidence: float, evidence_strength: float) -> float:
        """Strengthen confidence with new evidence."""
        return min(1.0, current_confidence + (1.0 - current_confidence) * evidence_strength)
    
    def weaken(self, current_confidence: float, contrary_evidence_strength: float) -> float:
        """Weaken confidence with contrary evidence."""
        return max(0.01, current_confidence - current_confidence * contrary_evidence_strength)


@dataclass
class Memory:
    """Base class for all memory types."""
    id: str
    user_id: str
    confidence: float = 0.5
    decay_rate: float = 0.95
    embedding: Optional[np.ndarray] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "confidence": self.confidence,
            "decay_rate": self.decay_rate,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat()
        }


@dataclass
class EpisodicMemory(Memory):
    """Memory of significant events (What happened?)."""
    event_type: str  # milestone, failure, win, behavior_change, etc.
    summary: str
    raw_evidence: str  # Original conversation
    importance_score: float  # 0-1
    related_memories: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "event_type": self.event_type,
            "summary": self.summary,
            "raw_evidence": self.raw_evidence,
            "importance_score": self.importance_score,
            "related_memories": self.related_memories
        })
        return base


@dataclass
class SemanticMemory(Memory):
    """Memory of user traits (Who is this person?)."""
    trait: str  # goal, motivation, fear, strength, etc.
    value: str  # What is the trait value
    supporting_evidence: List[str] = field(default_factory=list)
    contradictions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "trait": self.trait,
            "value": self.value,
            "supporting_evidence": self.supporting_evidence,
            "contradictions": self.contradictions
        })
        return base


@dataclass
class BehavioralMemory(Memory):
    """Memory of behavioral patterns (How do they act?)."""
    behavior_type: str  # consistency, procrastination, etc.
    observation: str
    frequency: Optional[float] = None
    trend: str = "stable"  # improving, stable, declining
    
    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "behavior_type": self.behavior_type,
            "observation": self.observation,
            "frequency": self.frequency,
            "trend": self.trend
        })
        return base


class MemoryStore:
    """Stores and retrieves memories using Supabase."""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.client = create_client(supabase_url, supabase_key)
    
    def add_episodic_memory(self, memory: EpisodicMemory) -> str:
        """Add episodic memory."""
        data = {
            "event_type": memory.event_type,
            "summary": memory.summary,
            "raw_evidence": memory.raw_evidence,
            "importance_score": memory.importance_score,
            "confidence": memory.confidence,
            "decay_rate": memory.decay_rate,
            "related_memories": memory.related_memories,
            "metadata": memory.metadata
        }
        
        result = self.client.table('episodic_memories').insert(data).execute()
        memory.id = result.data[0]['id']
        return memory.id
    
    def add_semantic_memory(self, memory: SemanticMemory) -> str:
        """Add semantic memory (upserts on trait)."""
        data = {
            "trait": memory.trait,
            "value": memory.value,
            "confidence": memory.confidence,
            "supporting_evidence": memory.supporting_evidence,
            "contradictions": memory.contradictions,
            "decay_rate": memory.decay_rate,
            "metadata": memory.metadata
        }
        
        # Upsert on user_id and trait
        result = self.client.table('semantic_memories').upsert(
            data,
            on_conflict='user_id, trait'
        ).execute()
        
        if result.data:
            memory.id = result.data[0]['id']
        return memory.id
    
    def add_behavioral_memory(self, memory: BehavioralMemory) -> str:
        """Add behavioral memory."""
        data = {
            "behavior_type": memory.behavior_type,
            "observation": memory.observation,
            "confidence": memory.confidence,
            "frequency": memory.frequency,
            "trend": memory.trend,
            "decay_rate": memory.decay_rate,
            "metadata": memory.metadata
        }
        
        result = self.client.table('behavioral_memories').insert(data).execute()
        memory.id = result.data[0]['id']
        return memory.id
    
    def get_memories_by_type(
        self,
        user_id: str,
        memory_type: MemoryType,
        min_confidence: float = 0.5,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get memories by type with filtering."""
        table_name = f"{memory_type.value}_memories"
        
        result = self.client.table(table_name).select("*") \
            .eq("user_id", user_id) \
            .gte("confidence", min_confidence) \
            .order("confidence", desc=True) \
            .limit(limit) \
            .execute()
        
        return result.data
    
    def get_recent_episodic(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get recent episodic memories."""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        result = self.client.table('episodic_memories').select("*") \
            .eq("user_id, user_id) \
            .gte("timestamp", cutoff_date.isoformat()) \
            .order("importance_score", desc=True) \
            .execute()
        
        return result.data
    
    def decay_all_memories(self, user_id: str):
        """Apply decay to all user memories."""
        # This is typically done via database trigger
        # But we can trigger it manually if needed
        pass


class EmbeddingGenerator:
    """Generates embeddings for memory storage and retrieval."""
    
    def __init__(self, model_name: str = "BAAI/bge-m3"):
        # Import only when needed to avoid dependency issues
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            self.dimension = self.model.get_sentence_embedding_dimension()
        except ImportError:
            # Fallback to simple hash-based embeddings
            self.model = None
            self.dimension = 1024
            print("Warning: Using fallback embedding generation")
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text."""
        if self.model:
            return self.model.encode(text)
        else:
            # Fallback: hash-based embedding
            hash_val = int(hashlib.sha256(text.encode()).hexdigest()[:16], 16)
            return np.array([float((hash_val + i) % 1000) / 1000.0 for i in range(1024)])
    
    def embed_memory(self, memory: Memory) -> np.ndarray:
        """Generate embedding for a memory."""
        text = str(memory)
        return self.generate_embedding(text)
