"""
Main script to run the intelligent RAG system with automatic model selection.
"""

import argparse
import sys
import tempfile
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Intelligent RAG System with Automatic Model Selection"
    )
    parser.add_argument(
        "--documents",
        nargs="+",
        help="Document paths to index (markdown, PDF, or URLs)"
    )
    parser.add_argument(
        "--query",
        type=str,
        help="Query to test after setup"
    )
    parser.add_argument(
        "--force-model",
        type=str,
        choices=["bge_m3", "embedqa_5"],
        help="Force specific model (skip auto-selection)"
    )
    parser.add_argument(
        "--no-auto-select",
        action="store_true",
        help="Disable automatic model selection (use default BGE-M3)"
    )
    parser.add_argument(
        "--benchmark-queries",
        type=int,
        default=20,
        help="Number of queries for benchmark (default: 20)"
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=10,
        help="Number of results to retrieve (default: 10)"
    )
    parser.add_argument(
        "--use-supabase",
        action="store_true",
        help="Use Supabase pgvector (requires configuration)"
    )
    
    args = parser.parse_args()
    
    from intelligent_rag import IntelligentRAG
    from tradeoff_analyzer import TradeoffAnalyzer
    
    # Create intelligent RAG system
    print("Initializing Intelligent RAG System...")
    rag = IntelligentRAG(
        auto_select_model=not args.no_auto_select and not args.force_model,
        force_model=args.force_model,
        use_supabase=args.use_supabase
    )
    
    if args.documents:
        # Load documents
        documents = {}
        for doc in args.documents:
            doc_path = str(doc)
            
            if doc_path.endswith('.md') or doc_path.endswith('.markdown'):
                with open(doc_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                documents[doc_path] = content
            elif doc_path.endswith('.pdf'):
                # PDF handling would require pdfplumber or similar
                print(f"PDF support requires additional dependencies. Skipping {doc_path}")
            elif doc_path.startswith('http'):
                # Web scraping would require requests + beautifulsoup
                print(f"Web scraping requires additional dependencies. Skipping {doc_path}")
            else:
                with open(doc_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                documents[doc_path] = content
        
        if not documents:
            print("No valid documents provided. Using sample dataset.")
            documents = {
                "sample_doc_1": """
                Machine learning is a subset of artificial intelligence that enables systems to learn from data.
                Deep learning uses neural networks with multiple layers for complex pattern recognition.
                Natural language processing helps computers understand human language.
                Computer vision enables machines to interpret visual information.
                """,
                "sample_doc_2": """
                Reinforcement learning trains agents through rewards and penalties.
                Generative AI creates new content including text, images, and code.
                Transformer models have revolutionized natural language processing.
                Large language models like GPT can understand and generate human-like text.
                """
            }
    else:
        # Use sample documents
        print("No documents provided, using sample dataset...")
        documents = {
            "sample_doc_1": """
            Machine learning is a subset of artificial intelligence that enables systems to learn from data.
            Deep learning uses neural networks with multiple layers for complex pattern recognition.
            Natural language processing helps computers understand human language.
            Computer vision enables machines to interpret visual information.
            """,
            "sample_doc_2": """
            Reinforcement learning trains agents through rewards and penalties.
            Generative AI creates new content including text, images, and code.
            Transformer models have revolutionized natural language processing.
            Large language models like GPT can understand and generate human-like text.
            """
        }
    
    # Setup system and select model automatically
    setup_result = rag.setup_and_select_model(
        documents,
        num_benchmark_queries=args.benchmark_queries
    )
    
    print("\n" + "="*70)
    print("SYSTEM SETUP COMPLETE")
    print("="*70)
    print(f"\nSelected Model: {setup_result['selected_model'].upper()}")
    print(f"Number of Documents: {setup_result['num_documents']}")
    print(f"Number of Chunks: {setup_result['num_chunks']}")
    
    # Run comprehensive tradeoff analysis if benchmark was run
    if rag.benchmark_run:
        try:
            import json
            with open('benchmark_results.json', 'r') as f:
                benchmark_results = json.load(f)
            
            analyzer = TradeoffAnalyzer()
            analysis = analyzer.analyze_comprehensive_tradeoffs(benchmark_results)
            analyzer.print_summary(analysis)
        except Exception as e:
            print(f"\nWarning: Could not run comprehensive analysis: {e}")
    
    # Test query if provided
    if args.query:
        print("\n" + "="*70)
        print("QUERY TESTING")
        print("="*70)
        
        result = rag.query(
            args.query,
            top_k=args.top_k,
            use_reranking=True,
            use_hybrid=True
        )
        
        print(f"\nQuery: {args.query}")
        print(f"Model Used: {result['model_used']}")
        print(f"Total Time: {result['timing']['total_ms']:.1f}ms")
        print(f"Retrieved: {len(result['results'])} documents")
        
        # Print top results
        print("\nTop Results:")
        for i, doc in enumerate(result['results'][:3]):
            print(f"{i+1}. Score: {doc.get('rerank_score', doc.get('score', 0)):.4f}")
            print(f"   Content: {doc['content'][:100]}...")
            print(f"   Source: {doc.get('metadata', {}).get('source', 'unknown')}")
        
        # Generate answer
        answer = rag.generate_answer(args.query, result['results'])
        print(f"\n{answer}")
    
    print("\n" + "="*70)
    print("INTELLIGENT RAG SYSTEM READY")
    print("="*70)
    print("\nThe system is now ready for queries using the selected model.")
    print(f"Selected model: {rag.selected_model.upper()}")
    print(f"Selection reasoning: {rag.model_selection_info['reasoning']}")
    print("\nTo use programmatically:")
    print(f"  rag = IntelligentRAG(selected_model='{rag.selected_model}')")
    print(f"  result = rag.query('your query')")


if __name__ == "__main__":
    main()
