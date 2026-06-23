# RAG Prototype - BGE-M3 vs EmbedQA 5

A complete RAG (Retrieval-Augmented Generation) prototype comparing BGE-M3 and EmbedQA 5 embedding models with hybrid search and reranking.

## Features

- **Multi-format Document Processing**: Support for markdown, PDF, and webpages
- **Hybrid Search**: Combines dense embeddings with sparse BM25 retrieval
- **Reranking**: Cross-encoder reranking for improved relevance
- **Citation Support**: Answers with source attribution
- **Model Comparison**: Benchmark BGE-M3 vs EmbedQA 5
- **Performance Metrics**: Recall@10, MRR, latency, and memory usage

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage with Sample Data

```bash
# Test a single query
python run_evaluation.py --query "What is machine learning?"

# Run full evaluation
python run_evaluation.py --evaluate
```

### Index Your Own Documents

```bash
python run_evaluation.py --documents doc1.md doc2.pdf https://example.com --query "your question"
```

### Model Selection

```bash
# Test with BGE-M3 (default)
python run_evaluation.py --query "test" --model bge_m3

# Test with EmbedQA 5
python run_evaluation.py --query "test" --model embedqa_5
```

## Architecture

```
┌─────────────────┐
│  Input Query    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Embedding│
    │  Model   │
    └────┬─────┘
         │
    ┌────▼─────────────┐
    │  Dense Retrieval │
    │  (Vector DB)     │
    └────┬─────────────┘
         │
    ┌────▼─────────────┐
    │ Sparse Retrieval │
    │    (BM25)        │
    └────┬─────────────┘
         │
    ┌────▼─────────────┐
    │  Hybrid Search   │
    │  (Dense+Sparse)  │
    └────┬─────────────┘
         │
    ┌────▼─────────────┐
    │   Reranking      │
    │ (Cross-Encoder)  │
    └────┬─────────────┘
         │
    ┌────▼─────────────┐
    │  Answer + Citations│
    └───────────────────┘
```

## Models

### BGE-M3
- **Dimensions**: 1024
- **Features**: Dense, sparse, and multi-vector embeddings
- **Strengths**: Multilingual, multi-functionality, hybrid search support

### EmbedQA 5
- **Dimensions**: 768  
- **Features**: Dense embeddings optimized for QA
- **Strengths**: Question-answer specific, efficient

## Evaluation Metrics

- **Recall@10**: Fraction of relevant documents retrieved in top 10
- **MRR (Mean Reciprocal Rank)**: Average reciprocal rank of first relevant document
- **Latency**: Average query processing time in milliseconds
- **Memory Usage**: GPU memory consumption in GB

## Configuration

Edit `config.yaml` to customize:
- Model selection and parameters
- Chunking strategy
- Search weights (dense vs sparse)
- Reranking settings
- Vector database configuration

## Project Structure

```
rag-prototype/
├── config.yaml                  # Configuration file
├── requirements.txt             # Python dependencies
├── document_processor.py       # Document chunking
├── embedding_models.py         # BGE-M3 and EmbedQA 5
├── vector_database.py          # ChromaDB wrapper
├── sparse_retrieval.py         # BM25 sparse search
├── reranker.py                 # Cross-encoder reranking
├── rag_pipeline.py             # Main RAG pipeline
├── evaluation.py               # Evaluation framework
├── run_evaluation.py           # Main execution script
└── README.md                   # This file
```

## Requirements

- Python 3.8+
- PyTorch with CUDA support (recommended for GPU acceleration)
- 8GB+ RAM (16GB+ recommended)
- GPU with 4GB+ VRAM (optional but recommended)

## Notes

- First run will download models (~2-3GB total)
- ChromaDB data is persisted in `./chroma_db`
- Models support both CPU and GPU inference
- Use GPU for significantly better performance

## License

MIT License
