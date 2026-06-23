"""
Intelligent RAG system with automatic model selection.
Uses Supabase pgvector for vector storage.
"""

# Configuration for Supabase integration
SUPABASE_URL = "your-supabase-url"
SUPABASE_KEY = "your-supabase-key"

# Model configurations
MODELS = {
    "bge_m3": {
        "name": "BAAI/bge-m3",
        "dimension": 1024,
        "max_length": 512
    },
    "embedqa_5": {
        "name": "nvidia/EmbedQA-5.0", 
        "dimension": 768,
        "max_length": 512
    }
}

# Evaluation configuration
EVALUATION_CONFIG = {
    "sample_queries_per_doc": 2,
    "min_document_sections": 5,
    "question_generation": "extractive"
}
