"""
Main script to run RAG prototype evaluation.
"""

import argparse
import sys
import tempfile
import shutil
from pathlib import Path

from rag_pipeline import RAGPipeline
from evaluation import Evaluator, EvaluationDataset


def main():
    parser = argparse.ArgumentParser(description="RAG Prototype Evaluation")
    parser.add_argument("--documents", nargs="+", help="Document paths to index")
    parser.add_argument("--query", type=str, help="Single query to test")
    parser.add_argument("--evaluate", action="store_true", help="Run full evaluation")
    parser.add_argument("--k", type=int, default=10, help="Number of results to retrieve")
    parser.add_argument("--model", type=str, choices=["bge_m3", "embedqa_5"], default="bge_m3", help="Model to use")
    
    args = parser.parse_args()
    
    # Initialize pipeline
    print("Initializing RAG pipeline...")
    pipeline = RAGPipeline()
    
    if args.documents:
        # Index provided documents
        print(f"Indexing {len(args.documents)} documents...")
        pipeline.index_documents(args.documents)
    elif not (args.query or args.evaluate):
        print("Please provide documents using --documents flag or use --query or --evaluate")
        sys.exit(1)
    
    # Use sample documents for testing if no documents provided
    if not args.documents:
        print("No documents provided, using sample dataset...")
        dataset = EvaluationDataset()
        documents = dataset.create_sample_documents()
        
        temp_dir = tempfile.mkdtemp()
        doc_paths = []
        
        try:
            for i, doc in enumerate(documents):
                doc_path = f"{temp_dir}/doc_{i}.txt"
                with open(doc_path, 'w') as f:
                    f.write(doc)
                doc_paths.append(doc_path)
            
            pipeline.index_documents(doc_paths)
            
            if args.query:
                # Single query test
                print(f"\nProcessing query: {args.query}")
                results = pipeline.retrieve(args.query, top_k=args.k, model=args.model)
                
                print(f"\nRetrieved {len(results)} results:")
                for i, result in enumerate(results):
                    print(f"\n{i+1}. Score: {result.get('rerank_score', result.get('score', 0)):.4f}")
                    print(f"   Document: {result['document'][:150]}...")
                    print(f"   Source: {result['metadata'].get('source', 'unknown')}")
                    print(f"   Timing: {result['timing']}")
                
                # Generate answer
                answer = pipeline.generate_answer(args.query, results)
                print(f"\nGenerated Answer:\n{answer}")
            
            elif args.evaluate:
                # Run full evaluation
                print("\nRunning full evaluation...")
                evaluator = Evaluator(pipeline)
                comparison = evaluator.compare_models(dataset.queries, k=args.k)
                evaluator.generate_report(comparison)
            else:
                print("\nNo query or evaluation requested. Use --query or --evaluate flag.")
        
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
