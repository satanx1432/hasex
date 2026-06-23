"""
Intelligent model selector with automatic decision making.
"""

import json
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum


class UseCase(Enum):
    """Different use cases for RAG systems."""
    PRODUCTION = "production"
    REALTIME = "realtime"
    MULTILINGUAL = "multilingual"
    RESOURCE_CONSTRAINED = "resource_constrained"
    ENGLISH_ONLY = "english_only"
    MAXIMUM_QUALITY = "maximum_quality"


@dataclass
class ModelCapabilities:
    """Capabilities of embedding models."""
    name: str
    dimension: int
    multilingual: bool
    dense_support: bool
    sparse_support: bool
    avg_latency_ms: float
    memory_usage_gb: float
    recall_quality: float  # 0-1 scale
    mrr_quality: float  # 0-1 scale


class ModelSelector:
    """Intelligent model selector with automatic decision making."""
    
    def __init__(self):
        # Known model capabilities
        self.capabilities = {
            "bge_m3": ModelCapabilities(
                name="BGE-M3",
                dimension=1024,
                multilingual=True,
                dense_support=True,
                sparse_support=True,
                avg_latency_ms=45.0,
                memory_usage_gb=2.3,
                recall_quality=0.82,
                mrr_quality=0.71
            ),
            "embedqa_5": ModelCapabilities(
                name="EmbedQA 5",
                dimension=768,
                multilingual=False,
                dense_support=True,
                sparse_support=False,
                avg_latency_ms=33.0,
                memory_usage_gb=1.8,
                recall_quality=0.78,
                mrr_quality=0.68
            )
        }
    
    def select_model(
        self,
        benchmark_results: Optional[Dict[str, Any]] = None,
        use_case: UseCase = UseCase.PRODUCTION,
        latency_threshold_ms: Optional[float] = None,
        memory_threshold_gb: Optional[float] = None
    ) -> Dict[str, Any]:
        """Select the best model based on benchmark results and requirements."""
        print("\n" + "="*60)
        print("INTELLIGENT MODEL SELECTION")
        print("="*60)
        
        print(f"\nUse Case: {use_case.value}")
        
        # Filter models based on hard constraints
        available_models = self._filter_by_constraints(
            latency_threshold_ms,
            memory_threshold_gb
        )
        
        if len(available_models) == 0:
            print("No models meet the constraints. Relaxing constraints...")
            available_models = list(self.capabilities.keys())
        
        print(f"Available models: {available_models}")
        
        # Score each model based on use case
        scores = {}
        for model_name in available_models:
            score = self._score_model_for_use_case(
                model_name, use_case, benchmark_results
            )
            scores[model_name] = score
            print(f"  {model_name}: score = {score:.4f}")
        
        # Select best model
        best_model = max(scores.keys(), key=lambda x: scores[x])
        best_score = scores[best_model]
        
        # Generate recommendation with reasoning
        recommendation = {
            "selected_model": best_model,
            "score": best_score,
            "reasoning": self._generate_reasoning(best_model, use_case, scores),
            "tradeoffs": self._analyze_tradeoffs(best_model, available_models),
            "capabilities": self.capabilities[best_model].__dict__
        }
        
        print(f"\nSelected: {best_model.upper()}")
        print(f"Score: {best_score:.4f}")
        print(f"Reasoning: {recommendation['reasoning']}")
        
        return recommendation
    
    def _filter_by_constraints(
        self,
        latency_threshold: Optional[float],
        memory_threshold: Optional[float]
    ) -> List[str]:
        """Filter models by hard constraints."""
        available = []
        
        for model_name, caps in self.capabilities.items():
            if latency_threshold and caps.avg_latency_ms > latency_threshold:
                continue
            if memory_threshold and caps.memory_usage_gb > memory_threshold:
                continue
            available.append(model_name)
        
        return available
    
    def _score_model_for_use_case(
        self,
        model_name: str,
        use_case: UseCase,
        benchmark_results: Optional[Dict[str, Any]]
    ) -> float:
        """Score model for specific use case."""
        caps = self.capabilities[model_name]
        score = 0.0
        
        # Base quality score
        quality_score = (caps.recall_quality + caps.mrr_quality) / 2
        score += quality_score * 0.6
        
        # Use case specific scoring
        if use_case == UseCase.MULTILINGUAL:
            if caps.multilingual:
                score += 0.3
            else:
                score -= 0.5
        
        elif use_case == UseCase.REALTIME:
            latency_score = max(0, 1 - caps.avg_latency_ms / 100)
            score += latency_score * 0.4
        
        elif use_case == UseCase.RESOURCE_CONSTRAINED:
            resource_score = 1 / (caps.memory_usage_gb + 1)
            score += resource_score * 0.4
        
        elif use_case == UseCase.ENGLISH_ONLY:
            if not caps.multilingual:
                score += 0.1  # Slight preference for English-optimized
            score -= 0.0
        
        elif use_case == UseCase.MAXIMUM_QUALITY:
            score = quality_score  # Maximize quality
        
        elif use_case == UseCase.PRODUCTION:
            # Balanced scoring for production
            if caps.sparse_support:
                score += 0.1  # Hybrid search is valuable
        
        # Apply benchmark results if available
        if benchmark_results and "comparison" in benchmark_results:
            if benchmark_results["comparison"]["overall_winner"] == model_name:
                score += 0.1
        
        return score
    
    def _generate_reasoning(
        self,
        model_name: str,
        use_case: UseCase,
        scores: Dict[str, float]
    ) -> str:
        """Generate human-readable reasoning for the selection."""
        caps = self.capabilities[model_name]
        other_model = "embedqa_5" if model_name == "bge_m3" else "bge_m3"
        other_caps = self.capabilities[other_model]
        
        reasoning_parts = []
        
        # Quality reasoning
        if caps.recall_quality > other_caps.recall_quality:
            reasoning_parts.append(f"Superior retrieval quality ({caps.recall_quality:.2f} vs {other_caps.recall_quality:.2f} recall)")
        
        # Dimension reasoning
        if caps.dimension > other_caps.dimension:
            reasoning_parts.append(f"Higher dimensional embeddings ({caps.dimension} vs {other_caps.dimension} dims) for richer representations")
        
        # Multilingual reasoning
        if use_case == UseCase.MULTILINGUAL and caps.multilingual:
            reasoning_parts.append("Multilingual support required for this use case")
        
        # Hybrid search reasoning
        if use_case == UseCase.PRODUCTION and caps.sparse_support:
            reasoning_parts.append("Hybrid search support improves retrieval robustness")
        
        # Performance reasoning
        if caps.avg_latency_ms < other_caps.avg_latency_ms:
            reasoning_parts.append(f"Faster inference ({caps.avg_latency_ms:.0f}ms vs {other_caps.avg_latency_ms:.0f}ms)")
        
        # Score reasoning
        score_diff = scores[model_name] - scores[other_model]
        if score_diff > 0.1:
            reasoning_parts.append(f"Overall superior score ({scores[model_name]:.4f} vs {scores[other_model]:.4f})")
        
        if not reasoning_parts:
            reasoning_parts.append("Selected based on balanced performance profile")
        
        return ". ".join(reasoning_parts) + "."
    
    def _analyze_tradeoffs(
        self,
        selected_model: str,
        available_models: List[str]
    ) -> Dict[str, str]:
        """Analyze tradeoffs of the selected model."""
        tradeoffs = {}
        caps = self.capabilities[selected_model]
        
        for other_model in available_models:
            if other_model == selected_model:
                continue
            
            other_caps = self.capabilities[other_model]
            
            if caps.avg_latency_ms > other_caps.avg_latency_ms:
                tradeoffs["latency"] = f"{caps.avg_latency_ms:.0f}ms vs {other_caps.avg_latency_ms:.0f}ms"
            
            if caps.memory_usage_gb > other_caps.memory_usage_gb:
                tradeoffs["memory"] = f"{caps.memory_usage_gb:.1f}GB vs {other_caps.memory_usage_gb:.1f}GB"
            
            if caps.dimension > other_caps.dimension:
                tradeoffs["dimension"] = f"Higher ({caps.dimension} vs {other_caps.dimension})"
            else:
                tradeoffs["dimension"] = f"Lower ({caps.dimension} vs {other_caps.dimension})"
        
        if not tradeoffs:
            tradeoffs["notes"] = "Balanced profile with minimal tradeoffs"
        
        return tradeoffs
    
    def auto_select_from_benchmark(
        self,
        benchmark_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Automatically select model based on benchmark results."""
        comparison = benchmark_results["comparison"]
        
        # Use the benchmark comparison to determine use case
        if comparison["differences"]["latency_diff_ms"] > 20:
            # Significant latency difference
            use_case = UseCase.REALTIME
        elif comparison["differences"]["memory_diff_gb"] > 0.5:
            # Significant memory difference
            use_case = UseCase.RESOURCE_CONSTRAINED
        else:
            # Default to production
            use_case = UseCase.PRODUCTION
        
        return self.select_model(benchmark_results, use_case)
    
    def save_selection(
        self,
        selection: Dict[str, Any],
        output_path: str = "model_selection.json"
    ) -> None:
        """Save model selection to file."""
        save_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "selection": selection
        }
        
        with open(output_path, 'w') as f:
            json.dump(save_data, f, indent=2)
        
        print(f"\nSelection saved to {output_path}")


if __name__ == "__main__":
    # Test the model selector
    print("Testing Intelligent Model Selector...")
    
    selector = ModelSelector()
    
    # Test automatic selection with simulated benchmark
    simulated_benchmark = {
        "comparison": {
            "overall_winner": "bge_m3",
            "scores": {
                "bge_m3": 0.75,
                "embedqa_5": 0.68
            },
            "differences": {
                "recall_diff": 0.04,
                "mrr_diff": 0.03,
                "latency_diff_ms": 12.0,
                "memory_diff_gb": 0.5
            }
        }
    }
    
    # Auto-select from benchmark
    selection = selector.auto_select_from_benchmark(simulated_benchmark)
    
    print("\n" + "="*60)
    print("SELECTION COMPLETE")
    print("="*60)
    
    print(f"\nSelected Model: {selection['selected_model'].upper()}")
    print(f"\nReasoning: {selection['reasoning']}")
    print(f"\nTradeoffs: {selection['tradeoffs']}")
