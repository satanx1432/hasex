"""
Post-Conversation Extraction Agent
Analyzes conversations and updates memories.
"""

import json
from typing import List, Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import re

from memory_system import Memory, MemoryType, EpisodicMemory, SemanticMemory, BehavioralMemory, MemoryStore


class EventType(Enum):
    """Types of episodic events."""
    MILESTONE = "milestone"
    FAILURE = "failure"
    WIN = "win"
    BEHAVIOR_CHANGE = "behavior_change"
    EMOTIONAL_MOMENT = "emotional_moment"
    DECISION = "decision"
    COMMITMENT = "commitment"
    GOAL_CHANGE = "goal_change"


class TraitType(Enum):
    """Types of semantic traits."""
    GOAL = "goal"
    MOTIVATION = "motivation"
    FEAR = "fear"
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    PERSONALITY_TRAIT = "personality_trait"
    EXCUSE = "excuse"
    PSYCHOLOGICAL_BOTTLENECK = "psychological_bottleneck"
    COACHING_STYLE = "coaching_style"
    PRODUCTIVITY_PATTERN = "productivity_pattern"


class BehaviorType(Enum):
    """Types of behavioral patterns."""
    CONSISTENCY = "consistency"
    PROCRASTINATION_PATTERN = "procrastination_pattern"
    FOLLOW_THROUGH_RATE = "follow_through_rate"
    ABANDONMENT_PATTERN = "abandonment_pattern"
    PRODUCTIVE_HOURS = "productive_hours"
    RESPONSE_TO_PRESSURE = "response_to_pressure"
    INTERVENTION_SUCCESS = "intervention_success"
    INTERVENTION_FAILURE = "intervention_failure"


@dataclass
class ExtractionResult:
    """Result of conversation analysis."""
    extracted_events: List[Dict[str, Any]] = field(default_factory=list)
    new_memories: List[Dict[str, Any]] = field(default_factory=list)
    updated_memories: List[Dict[str, Any]] = field(default_factory=list)
    contradictions_detected: List[Dict[str, Any]] = field(default_factory=list)
    confidence_updates: List[Dict[str, Any]] = field(default_factory=list)
    extraction_confidence: float = 0.5


class ExtractionAgent:
    """Analyzes conversations and updates memories."""
    
    def __init__(self, memory_store: MemoryStore, supabase_url: str, supabase_key: str):
        self.memory_store = MemoryStore(supabase_url, supabase_key)
        
        # Pattern matching rules (can be enhanced with ML)
        self.event_patterns = {
            EventType.FAILURE: [r'(quit|give up|stop|can.t|won.t)', r'(skip|miss|forgot)'],
            EventType.WIN: [r'(complet|finish|done|achieve|succeed)', r'(passed|nailed it)'],
            EventType.MILESTONE: [r'(week \d+|month \d+|stage \d+)', r'(first time|started|finally)'],
            EventType.COMMITMENT: [r'(promise|commit|i will|i shall)', r'(going to|will do)'],
            EventType.GOAL_CHANGE: [r'(want to change|different goal|instead of)'],
            EventType.EMOTIONAL_MOMENT: [r'(excited|happy|frustrated|stressed)']
        }
        
        self.trait_patterns = {
            TraitType.GOAL: [r'(want to|goal is to|planning to)'],
            TraitType.MOTIVATION: [r'(because|want to need to|driven by)'],
            TraitType.FEAR: [r'(afraid of|scared of|worried about)'],
            TraitType.EXCUSE: [r'(no time|too busy|can't right now|maybe later)'],
            TraitType.STRENGTH: [r'(good at|excel at', r'natural talent for')],
            TraitType.WEAKNESS: [r'(struggle with|bad at', r'weakness is')],
            TraitType.PRODUCTIVITY_PATTERN: [r'(morning|evening', r'night owl')]
        }
        
        self.behavior_patterns = {
            BehaviorType.PROCRASTINATION_PATTERN: [r'(start tomorrow|later', r'push back)'],
            BehaviorType.CONSISTENCY: [r'(daily|every day', r'on track')],
            BehaviorType.ABANDONMENT_PATTERN: [r'(stopped after|quit at)', r'dropped out']
        }
    
    def extract_from_conversation(
        self,
        conversation_id: str,
        user_id: str,
        conversation_history: List[Dict[str, Any]],
        previous_conversation: List[Dict[str, Any]] = None
    ) -> ExtractionResult:
        """Extract insights from a conversation."""
        
        result = ExtractionResult()
        
        # Combine current + previous for pattern detection
        full_history = conversation_history + (previous_conversation or [])
        
        # Analyze for each type of extraction
        
        # 1. Detect episodic events
        episodic_events = self._detect_episodic_events(full_history)
        if episodic_events:
            result.extracted_events.extend(episodic_events)
            for event in episodic_events:
                # Create new episodic memories
                memory = EpisodicMemory(
                    id="",  # Will be assigned by DB
                    user_id=user_id,
                    event_type=event["type"],
                    summary=event["summary"],
                    raw_evidence=event["evidence"],
                    importance_score=event["importance"],
                    related_memories=event["related_memories"]
                )
                memory.id = self.memory_store.add_episodic_memory(memory)
                result.new_memories.append(memory.to_dict())
        
        # 2. Detect/evolve semantic traits
        semantic_updates = self._analyze_semantic_traits(full_history)
        if semantic_updates:
            result.updated_memories.extend(semantic_updates)
        
        # 3. Detect/evolve behavioral patterns
        behavioral_updates = self._analyze_behavioral_patterns(full_history)
        if behavioral_updates:
            result.updated_memories.extend(behavioral_updates)
        
        # 4. Detect contradictions
        contradictions = self._detect_contradictions(full_history)
        if contradictions:
            result.contradictions_detected.extend(contradictions)
        
        # 5. Set extraction confidence
        result.extraction_confidence = self._calculate_extraction_confidence(
            result.extracted_events,
            result.new_memories,
            result.updated_memories
        )
        
        # Log extraction
        self._log_extraction(user_id, conversation_id, result)
        
        return result
    
    def _detect_episodic_events(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect significant events in conversation."""
        events = []
        
        for i, message in enumerate(messages):
            text = message.get("content", "").lower()
            role = message.get("role", "")
            
            if role != "user":
                continue
            
            # Check for event patterns
            for event_type, patterns in self.event_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, text):
                        events.append({
                            "type": event_type.value,
                            "summary": self._summarize_event(text, event_type),
                            "evidence": text,
                            "importance": self._calculate_importance(event_type, text, i, len(messages)),
                            "related_memories": []
                        })
                        break  # Move to next event type once matched
        
        return events
    
    def _summarize_event(self, text: str, event_type: EventType) -> str:
        """Create summary of an event."""
        # Simple summarization (can be enhanced with AI)
        if len(text) > 100:
            return text[:97] + "..."
        return text
    
    def _calculate_importance(self, event_type: EventType, text: str, position: int, total: int) -> float:
        """Calculate importance score for an event."""
        base_scores = {
            EventType.MILESTONE: 0.8,
            EventType.FAILURE: 0.6,
            EventType.WIN: 0.5,
            EventType.COMMITMENT: 0.7,
            EventType.GOAL_CHANGE: 0.9,
            EventType.EMOTIONAL_MOMENT: 0.4
        }
        
        # Position importance (first and last messages are often more important)
        position_factor = 1.0
        if position == 0 or position == total - 1:
            position_factor = 1.2
        
        # Length importance
        length_factor = min(1.0, len(text) / 100)
        
        return min(1.0, base_scores.get(event_type, 0.5) * position_factor * length_factor)
    
    def _analyze_semantic_traits(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect or evolve semantic traits about the user."""
        updates = []
        
        user_messages = [m for m in messages if m.get("role") == "user"]
        text = " ".join([m.get("content", "") for m in user_messages])
        
        # Check trait patterns
        for trait_type, patterns in self.trait_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    # Extract value from context
                    value = self._extract_trait_value(text, trait_type)
                    
                    if value:
                        updates.append({
                            "memory_type": MemoryType.SEMANTIC,
                            "trait": trait_type.value,
                            "value": value,
                            "confidence": 0.6,  # Initial confidence
                            "decay_rate": 0.97
                        })
        
        return updates
    
    def _extract_trait_value(self, text: str, trait_type: TraitType) -> Optional[str]:
        """Extract the value of a trait from context."""
        # Simple extraction (enhanced with AI in production)
        if trait_type == TraitType.GOAL:
            # Find patterns like "want to [X]" or "goal is to [X]"
            for pattern in [r"want to (\w+(?:\s+\w+)*)", r"goal is to (\w+(?:\s+\w+)*)"]:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return match.group(1)
        elif trait_type == TraitType.MOTIVATION:
            for pattern in [r"because (\w+(?:\s+\w+)*)", r"driven by (\w+(?:\s+\w+)*)"]:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    return match.group(1)
        
        return None
    
    def _analyze_behavioral_patterns(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect behavioral patterns."""
        updates = []
        
        user_messages = [m for m in messages if m.get("role") == "user"]
        text = " ".join([m.get("content", "") for m in user_messages])
        
        # Check behavior patterns
        for behavior_type, patterns in self.behavior_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    updates.append({
                        "memory_type": type(behavior_type).value,
                        "behavior_type": behavior_type.value,
                        "observation": self._summarize_behavior(text, behavior_type),
                        "confidence": 0.5,
                        "decay_rate": 0.96,
                        "trend": "stable"
                    })
        
        return updates
    
    def _summarize_behavior(self, text: str, behavior_type: BehaviorType) -> str:
        """Summarize a behavioral observation."""
        return text[:97] + "..." if len(text) > 100 else text
    
    def _detect_contradictions(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect contradictions between new evidence and existing beliefs."""
        contradictions = []
        
        # Get existing semantic memories
        existing_traits = self.memory_store.get_memories_by_type("user", MemoryType.SEMANTIC)
        
        # Analyze current conversation for contradictions
        user_messages = [m for m in messages if m.get("role") == "user"]
        for message in user_messages:
            text = message.get("content", "")
            
            # Check for contradictions with existing traits
            for trait in existing_traits:
                trait_name = trait.get("trait")
                trait_value = trait.get("value", "")
                
                # Simple contradiction detection (can be enhanced)
                if trait_name == "excuse" and trait_value:
                    if "did it" in text.lower() or "completed" in text.lower():
                        contradictions.append({
                            "trait": trait_name,
                            "old_value": trait_value,
                            "new_evidence": text,
                            "confidence_before": trait.get("confidence", 0.5),
                            "confidence_after": trait.get("confidence", 0.5) * 0.8  # Weaken confidence
                        })
        
        return contradictions
    
    def _calculate_extraction_confidence(
        self,
        events: List[Dict[str, Any]],
        new_memories: List[Dict[str, Any]],
        updated_memories: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence in the extraction."""
        
        factors = []
        
        # Factor 1: Number of events detected
        event_count = len(events)
        if event_count > 0:
            factors.append(min(1.0, event_count / 5))  # More events = higher confidence
        else:
            factors.append(0.3)
        
        # Factor 2: Conversation length
        factors.append(min(1.0, len(new_memories + updated_memories) / 10))
        
        # Factor 3: Contradictions detected (lower confidence if many)
        contradiction_count = len(self._detect_contradictions([]))  # Would need full history
        if contradiction_count > 0:
            factors.append(1.0 - contradiction_count * 0.2)
        else:
            factors.append(1.0)
        
        return sum(factors) / len(factors)
    
    def _log_extraction(self, user_id: str, conversation_id: str, result: ExtractionResult):
        """Log extraction to database."""
        try:
            log_data = {
                "user_id": user_id,
                "conversation_id": conversation_id,
                "extracted_events": result.extracted_events,
                "new_memories": [m.to_dict() if hasattr(m, "to_dict") else m for m in result.new_memories],
                "updated_memories": result.updated_memories,
                "contradictions_detected": result.contradictions_detected,
                "confidence_updates": result.confidence_updates,
                "extraction_confidence": result.extraction_confidence
            }
            
            self.client.table('conversation_extractions').insert(log_data).execute()
        except:
            pass  # Don't fail if logging fails
    
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Assemble current user profile from all memories."""
        # Get all memory types
        episodic = self.memory_store.get_recent_episodic(user_id, days=30)
        semantic = self.memory_store.get_memories_by_type(user_id, MemoryType.SEMANTIC)
        behavioral = self.memory_store.get_memories_by_type(user_id, MemoryType.BEHAVIORAL)
        
        return {
            "episodic_events": episodic,
            "semantic_traits": semantic,
            "behavioral_patterns": behavioral
        }


if __name__ == "__main__":
    # Test the extraction agent
    print("Testing Extraction Agent...")
    
    from config import settings
    
    # Create mock memory store
    # store = MemoryStore(settings.supabase_url, settings.supabase_key)
    
    # Test extraction
    agent = ExtractionAgent(None, "", "")
    
    conversation = [
        {"role": "user", "content": "I want to become a programmer"},
        {"role": "assistant", "content": "That's a great goal! What's your timeline?"},
        {"role": "user", "content": "I'm thinking 6 months, but I'm worried I'll quit after 2 weeks like last time"},
        {"role": "assistant", "content": "Let's address that concern first..."}
    ]
    
    result = agent.extract_from_conversation("test_conv", "user_123", conversation)
    
    print(f"Extraction confidence: {result.extraction_confidence}")
    print(f"Events detected: {len(result.extracted_events)}")
    print(f"New memories: {len(result.new_memories)}")
    print(f"Updated memories: {len(result.updated_memories)}")
    print(f"Contradictions: {len(result.contradictions_detected)}")
