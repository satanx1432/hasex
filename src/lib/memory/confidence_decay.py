"""
Confidence and Decay System
Manages memory confidence scores and temporal decay.
"""

import numpy as np
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import math

from memory_system import Memory, EpisodicMemory, SemanticMemory, BehavioralMemory


class DecayStrategy(Enum):
    """Strategies for memory decay."""
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    STEP = "step"
    NO_DECAY = "no_decay"


@dataclass
class ConfidenceEvolution:
    """Track confidence changes over time."""
    memory_id: str
    memory_type: str
    initial_confidence: float
    current_confidence: float
    history: List[Dict[str, float]] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def add_history(self, confidence: float, reason: str):
        """Add a confidence change to history."""
        self.history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": confidence,
            "reason": reason
        })
        self.current_confidence = confidence
        self.last_updated = datetime.utcnow()
    
    def get_trend(self) -> str:
        """Get confidence trend."""
        if len(self.history) < 2:
            return "stable"
        
        recent = [h["confidence"] for h in self.history[-5:]]
        if len(recent) < 2:
            return "stable"
        
        trend = np.polyfit(range(len(recent)), recent, 1)[0]
        
        if trend > 0.01:
            return "increasing"
        elif trend < -0.01:
            return "decreasing"
        else:
            return "stable"


class ConfidenceManager:
    """Manages confidence scores for all memories."""
    
    def __init__(
        self,
        base_decay_rate: float = 0.95,
        decay_strategy: DecayStrategy = DecayStrategy.EXPONENTIAL,
        min_confidence: float = 0.01,
        strengthen_rate: float = 0.1,
        weaken_rate: float = 0.2
    ):
        self.base_decay_rate = base_decay_rate
        self.decay_strategy = decay_strategy
        self.min_confidence = min_confidence
        self.strengthen_rate = strengthen_rate
        self.weaken_rate = weaken_rate
        self.evolution_history: Dict[str, ConfidenceEvolution] = {}
    
    def apply_decay(
        self,
        memory: Memory,
        days_since_access: float = 1.0
    ) -> float:
        """Apply decay to a memory's confidence."""
        old_confidence = memory.confidence
        
        if self.decay_strategy == DecayStrategy.NO_DECAY:
            return old_confidence
        
        new_confidence = self._calculate_decay(old_confidence, days_since_access)
        new_confidence = max(self.min_confidence, new_confidence)
        
        # Track evolution
        if memory.id not in self.evolution_history:
            self.evolution_history[memory.id] = ConfidenceEvolution(
                memory_id=memory.id,
                memory_type=type(memory).__name__,
                initial_confidence=old_confidence,
                current_confidence=old_confidence
            )
        
        if abs(new_confidence - old_confidence) > 0.001:
            self.evolution_history[memory.id].add_history(new_confidence, "decay")
        
        return new_confidence
    
    def _calculate_decay(self, confidence: float, days: float) -> float:
        """Calculate decayed confidence."""
        if self.decay_strategy == DecayStrategy.LINEAR:
            return confidence * (1 - (1 - self.base_decay_rate) * days)
        
        elif self.decay_strategy == DecayStrategy.EXPONENTIAL:
            return confidence * (self.base_decay_rate ** days)
        
        elif self.decay_strategy == DecayStrategy.STEP:
            # Step decay: drops after certain thresholds
            if days > 7:  # 1 week
                return confidence * 0.5
            elif days > 30:  # 1 month
                return confidence * 0.25
            else:
                return confidence
        
        else:  # NO_DECAY
            return confidence
    
    def strengthen(
        self,
        memory: Memory,
        evidence_strength: float = 0.5
    ) -> float:
        """Strengthen confidence with supporting evidence."""
        old_confidence = memory.confidence
        
        # Strengthen more for low confidence, less for high confidence
        strengthening_factor = (1.0 - old_confidence) * self.strengthen_rate * evidence_strength
        new_confidence = min(1.0, old_confidence + strengthening_factor)
        
        # Track evolution
        if memory.id not in self.evolution_history:
            self.evolution_history[memory.id] = ConfidenceEvolution(
                memory_id=memory.id,
                memory_type=type(memory).__name__,
                initial_confidence=old_confidence,
                current_confidence=old_confidence
            )
        
        self.evolution_history[memory.id].add_history(new_confidence, "strengthen")
        
        return new_confidence
    
    def weaken(
        self,
        memory: Memory,
        contrary_evidence_strength: float = 0.5
    ) -> float:
        """Weaken confidence with contrary evidence."""
        old_confidence = memory.confidence
        
        # Weaken proportional to current confidence
        weakening_factor = old_confidence * self.weaken_rate * contrary_evidence_strength
        new_confidence = max(self.min_confidence, old_confidence - weakening_factor)
        
        # Track evolution
        if memory.id not in self.evolution_history:
            self.evolution_history[memory.id] = ConfidenceEvolution(
                memory_id=memory.id,
                memory_type=type(memory).__name__,
                initial_confidence=old_confidence,
                current_confidence=old_confidence
            )
        
        self.evolution_history[memory.id].add_history(new_confidence, "weaken")
        
        return new_confidence
    
    def resolve_contradiction(
        self,
        memory: Memory,
        old_evidence_confidence: float,
        new_evidence_confidence: float
    ) -> float:
        """Resolve contradiction between old and new evidence."""
        old_confidence = memory.confidence
        
        # Weighted average based on evidence confidence
        total_confidence = old_evidence_confidence + new_evidence_confidence
        if total_confidence == 0:
            return old_confidence
        
        weighted_confidence = (
            (old_confidence * old_evidence_confidence + 
             new_evidence_confidence * (1.0 - old_confidence)) / 
            total_confidence
        )
        
        new_confidence = max(self.min_confidence, weighted_confidence)
        
        # Track evolution
        if memory.id not in self.evolution_history:
            self.evolution_history[memory.id] = ConfidenceEvolution(
                memory_id=memory.id,
                memory_type=type(memory).__name__,
                initial_confidence=old_confidence,
                current_confidence=old_confidence
            )
        
        self.evolution_history[memory.id].add_history(new_confidence, "contradiction")
        
        return new_confidence
    
    def get_evolution(self, memory_id: str) -> Optional[ConfidenceEvolution]:
        """Get confidence evolution for a memory."""
        return self.evolution_history.get(memory_id)
    
    def get_all_trends(self) -> Dict[str, str]:
        """Get confidence trends for all tracked memories."""
        return {
            mem_id: evolution.get_trend()
            for mem_id, evolution in self.evolution_history.items()
        }


class DecayScheduler:
    """Schedules and executes batch decay operations."""
    
    def __init__(self, confidence_manager: ConfidenceManager):
        self.confidence_manager = confidence_manager
        self.last_decay_date: Optional[datetime] = None
        self.decay_interval_days = 1.0  # Daily decay
    
    def should_decay(self) -> bool:
        """Check if decay should run."""
        if self.last_decay_date is None:
            return True
        
        days_since_last = (datetime.utcnow() - self.last_decay_date).days
        return days_since_last >= self.decay_interval_days
    
    def run_batch_decay(
        self,
        memories: List[Memory],
        force: bool = False
    ) -> Dict[str, float]:
        """Run batch decay on a list of memories."""
        if not force and not self.should_decay():
            return {}
        
        results = {}
        for memory in memories:
            days_since_access = (datetime.utcnow() - memory.last_updated).days
            new_confidence = self.confidence_manager.apply_decay(memory, days_since_access)
            results[memory.id] = new_confidence
            memory.confidence = new_confidence
        
        self.last_decay_date = datetime.utcnow()
        return results
    
    def get_memory_importance(self, memory: Memory) -> float:
        """Calculate current importance of a memory."""
        # Importance = confidence * (1 - decay rate) * age factor
        age_days = (datetime.utcnow() - memory.created_at).days
        age_factor = max(0.1, 1.0 - (age_days / 365))  # Decay over year
        
        importance = memory.confidence * (1 - memory.decay_rate) * age_factor
        
        # Boost for recent events
        if age_days < 7:
            importance *= 1.5
        
        return min(1.0, importance)


class ConfidenceThresholds:
    """Defines confidence thresholds for different operations."""
    
    def __init__(
        self,
        retrieval_threshold: float = 0.5,
        action_threshold: float = 0.7,
        strong_belief_threshold: float = 0.85,
        weak_belief_threshold: float = 0.3
    ):
        self.retrieval_threshold = retrieval_threshold
        self.action_threshold = action_threshold
        self.strong_belief_threshold = strong_belief_threshold
        self.weak_belief_threshold = weak_belief_threshold
    
    def should_retrieve(self, confidence: float) -> bool:
        """Determine if memory is confident enough to retrieve."""
        return confidence >= self.retrieval_threshold
    
    def should_act_on(self, confidence: float) -> bool:
        """Determine if we should act on a belief."""
        return confidence >= self.action_threshold
    
    def is_strong_belief(self, confidence: float) -> bool:
        """Determine if this is a strong belief."""
        return confidence >= self.strong_belief_threshold
    
    def is_weak_belief(self, confidence: float) -> bool:
        """Determine if this is a weak belief."""
        return confidence <= self.weak_belief_threshold


def test_confidence_system():
    """Test the confidence and decay system."""
    print("Testing Confidence System...")
    
    # Create manager
    manager = ConfidenceManager(
        base_decay_rate=0.95,
        decay_strategy=DecayStrategy.EXPONENTIAL
    )
    
    # Create test memory
    memory = Memory(
        id="test_mem_1",
        user_id="user_123",
        confidence=0.8,
        decay_rate=0.95
    )
    
    print(f"Initial confidence: {memory.confidence}")
    
    # Apply decay
    new_conf = manager.apply_decay(memory, days_since_access=1.0)
    print(f"After 1 day decay: {new_conf}")
    
    new_conf = manager.apply_decay(memory, days_since_access=7.0)
    print(f"After 7 days decay: {new_conf}")
    
    # Strengthen
    strengthened = manager.strengthen(memory, evidence_strength=0.8)
    print(f"After strengthening: {strengthened}")
    
    # Weaken
    weakened = manager.weaken(memory, contrary_evidence_strength=0.6)
    print(f"After weakening: {weakened}")
    
    # Resolve contradiction
    resolved = manager.resolve_contradiction(memory, 0.7, 0.8)
    print(f"After contradiction resolution: {resolved}")
    
    # Get evolution
    evolution = manager.get_evolution(memory.id)
    if evolution:
        print(f"Confidence trend: {evolution.get_trend()}")
        print(f"History length: {len(evolution.history)}")
    
    print("Confidence system test complete.")


if __name__ == "__main__":
    test_confidence_system()
