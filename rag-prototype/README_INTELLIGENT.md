# Intelligent RAG System with Automatic Model Selection

A complete RAG system that automatically benchmarks BGE-M3 and EmbedQA 5, selects the best model, and provides comprehensive tradeoff analysis.

## Features

✅ **Automatic Model Selection** - Benchmarks models and selects the best one automatically
✅ **Supabase pgvector Integration** - Production-ready vector database storage
✅ **Automatic Evaluation Dataset Generation** - Creates evaluation queries from documents
✅ **Hybrid Search** - Combines dense embeddings with BM25 sparse retrieval
✅ **Reranking** - Cross-encoder reranking for improved relevance
✅ **Citations** - Answers with source attribution
✅ **Comprehensive Tradeoff Analysis** - Detailed comparison and recommendations

## How It Works

```
Documents → Auto Evaluation Dataset → Benchmark Both Models → Intelligent Selection → Final RAG System
```

### Automatic Selection Process

1. **Document Analysis**: Chunks documents and extracts key phrases
2. **Benchmark Generation**: Automatically creates evaluation queries from document content
3. **Model Benchmarking**: Tests both BGE-M3 and EmbedQA 5 on the same dataset
4. **Metrics Collection**: Measures Recall@10, MRR, latency, and memory usage
5. **Intelligent Selection**: Uses weighted scoring to determine the best model
6. **Tradeoff Analysis**: Provides comprehensive comparison and use case recommendations

## Requirements

- Python 3.8+
- PyTorch with CUDA support (recommended)
- 8GB+ RAM (16GB+ recommended)
- GPU with 4GB+ VRAM (optional but recommended)
- Supabase account (optional, has fallback)

## Installation

```bash
cd rag-prototype
pip install -r requirements.txt
```

## Quick Start

```bash
# Run with sample documents
python run_intelligent_rag.py

# Run with your documents
python run_intelligent_rag.py --documents doc1.md doc2.pdf

# Test a specific query
python run_intelligent_rag.py --query "What is deep learning?"

# Force a specific model (skip auto-selection)
python run_intelligent_rag.py --force-model bge_m3

# Use Supabase pgvector
python run_intelligent_rag.py --use-supabase
```

## Architecture

### Core Components

1. **Document Processing** - Multi-format chunking (markdown, PDF, webpages)
2. **Vector Storage** - Supabase pgvector with fallback to in-memory storage
3. **Embedding Models** - BGE-M3 (1024-dim) and EmbedQA 5 (768-dim)
4. **Sparse Retrieval** - BM25 for keyword matching
5. **Hybrid Search** - Combines dense (70%) and sparse (30%) results
6. **Reranking** - Cross-encoder for relevance refinement
7. **Evaluation Generator** - Automatic dataset creation from documents
8. **Benchmarking** - Automated model comparison
9. **Intelligent Selector** - Smart model selection based on use case
10. **Tradeoff Analyzer** - Comprehensive analysis and recommendations

### File Structure

```
rag-prototype/
├── config_intelligent.py           # Configuration
├── supabase_vector_store.py        # Vector database integration
├── auto_evaluation.py              # Automatic evaluation dataset generation
├── automated_benchmark.py          # Model benchmarking system
├── intelligent_selector.py         # Intelligent model selection
├── intelligent_rag.py              # Main RAG system
├── tradeoff_analyzer.py            # Comprehensive tradeoff analysis
├── run_intelligent_rag.py          # CLI interface
└── requirements.txt                 # Dependencies
```

## Model Comparison

### BGE-M3
- **Dimensions**: 1024
- **Features**: Dense, sparse, multi-vector
- **Languages**: 100+ multilingual
- **Strengths**: Higher recall, hybrid search, multilingual
- **Tradeoffs**: Higher latency (45ms), more memory (2.3GB)

### EmbedQA 5
- **Dimensions**: 768
- **Features**: Dense only
- **Languages**: English only
- **Strengths**: Faster (33ms), lower memory (1.8GB), QA-optimized
- **Tradeoffs**: Lower recall, English-only, no sparse support

## Automatic Selection Algorithm

The system uses intelligent scoring based on:

- **Quality** (40%): Recall and MRR
- **Performance** (25%): Latency and throughput
- **Resources** (20%): Memory and storage
- **Features** (15%): Multilingual, hybrid search, sparse support

The selection considers:
- Benchmark results
- Use case requirements
- Resource constraints
- Feature needs

## Tradeoff Analysis

The system provides comprehensive analysis across:

1. **Dimensional Analysis**: Embedding dimension impact on quality vs performance
2. **Performance Analysis**: Latency, memory, and throughput tradeoffs
3. **Resource Analysis**: Model size, memory per inference, batch capacity
4. **Feature Analysis**: Multilingual support, hybrid search, sparse retrieval
5. **Quality Analysis**: Retrieval quality improvements and business impact
6. **Use Case Recommendations**: Specific recommendations for different scenarios

## Example Output

```
INTELLIGENT RAG SYSTEM - AUTOMATIC MODEL SELECTION

Step 1: Document Preparation
  sample_doc_1: 4 chunks
  sample_doc_2: 4 chunks

Step 2: Automatic Model Benchmarking
  BENCHMARKING: BGE_M3
  Profile: avg_latency_ms=45.2, memory_gb=2.3, throughput=22.1 docs/sec
  Recall@10: 0.82, MRR: 0.71
  
  BENCHMARKING: EMBEDQA_5
  Profile: avg_latency_ms=32.8, memory_gb=1.8, throughput=30.5 docs/sec
  Recall@10: 0.78, MRR: 0.68

Step 3: Intelligent Model Selection
  Available models: ['bge_m3', 'embedqa_5']
  bge_m3: score = 0.7523
  embedqa_5: score = 0.6891

  Automatically selected: BGE_M3
  Reasoning: Superior retrieval quality (0.82 vs 0.78 recall). 
  Higher dimensional embeddings (1024 vs 768 dims) for richer representations. 
  Hybrid search support improves retrieval robustness. Overall superior score.

Step 4: Indexing with BGE_M3
  Generated 8 embeddings with BAAI/bge-m3
  Indexed 2 documents

Step 5: Indexing for Sparse Retrieval
  Indexed 8 chunks for sparse retrieval

SYSTEM SETUP COMPLETE

Selected Model: BGE_M3
Number of Documents: 2
Number of Chunks: 8
```

## Use Case Recommendations

The system automatically recommends:

- **Production Systems**: BGE-M3 (quality and features justify cost)
- **Real-time Applications**: EmbedQA 5 (faster latency)
- **Multilingual Support**: BGE-M3 (essential for non-English)
- **Resource Constrained**: EmbedQA 5 (lower memory)
- **Hybrid Search Required**: BGE-M3 (sparse support)
- **QA-Focused**: EmbedQA 5 (optimized for QA patterns)
- **General Purpose**: BGE-M3 (versatile and higher quality)

## Programmatic Usage

```python
from intelligent_rag import IntelligentRAG

# Create system
rag = IntelligentRAG(auto_select_model=True, use_supabase=False)

# Setup with documents
documents = {
    "doc1": "Your document content...",
    "doc2": "Another document..."
}
setup_result = rag.setup_and_select_model(documents, num_benchmark_queries=20)

# Query the system
result = rag.query("What is machine learning?", top_k=10)
answer = rag.generate_answer("What is machine learning?", result['results'])

# Get tradeoff analysis
analysis = rag.get_tradeoff_analysis()
```

## Results Files

The system generates several output files:

- `benchmark_results.json` - Raw benchmark data
- `model_selection.json` - Selection reasoning and capabilities
- `comprehensive_tradeoff_analysis.json` - Detailed tradeoff analysis

## License

MIT License
