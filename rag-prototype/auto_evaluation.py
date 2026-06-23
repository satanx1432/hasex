"""
Automatic evaluation dataset generation from documents.
"""

import re
from typing import List, Dict, Any, Set
import random
from collections import Counter
import numpy as np


class QuestionGenerator:
    """Generate evaluation questions from documents automatically."""
    
    def __init__(self, num_questions_per_doc: int = 3):
        self.num_questions_per_doc = num_questions_per_doc
        
        # Question templates
        self.templates = [
            "What is {topic}?",
            "How does {topic} work?",
            "Explain {topic}.",
            "What are the key features of {topic}?",
            "Describe {topic}.",
            "Why is {topic} important?",
            "What are the benefits of {topic}?"
        ]
    
    def extract_key_phrases(self, text: str, num_phrases: int = 5) -> List[str]:
        """Extract key phrases from text for question generation."""
        # Simple noun phrase extraction
        sentences = re.split(r'[.!?]+', text)
        
        phrases = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:
                # Extract noun phrases (capitalized words)
                words = sentence.split()
                current_phrase = []
                
                for i, word in enumerate(words):
                    # Check if word might be a noun phrase start
                    if word[0].isupper() or word.isalnum():
                        current_phrase.append(word)
                    elif current_phrase:
                        if len(current_phrase) >= 2:
                            phrases.append(' '.join(current_phrase))
                        current_phrase = []
                
                if current_phrase and len(current_phrase) >= 2:
                    phrases.append(' '.join(current_phrase))
        
        # Remove duplicates and return top phrases
        phrase_counts = Counter(phrases)
        top_phrases = [phrase for phrase, _ in phrase_counts.most_common(num_phrases * 2)]
        
        return top_phrases[:num_phrases]
    
    def generate_questions_from_text(self, text: str, doc_id: str) -> List[Dict[str, Any]]:
        """Generate questions from document text."""
        key_phrases = self.extract_key_phrases(text, self.num_questions_per_doc)
        questions = []
        
        for phrase in key_phrases[:self.num_questions_per_doc]:
            # Select random template
            template = random.choice(self.templates)
            
            # Clean up phrase for template
            topic = phrase.lower()
            if not topic.endswith('ing') and not topic.endswith('tion'):
                topic += ' concept'
            
            question_text = template.format(topic=topic.capitalize())
            
            # Find the sentence containing this phrase
            question_sentence = self._find_sentence_with_phrase(text, phrase)
            
            questions.append({
                "question": question_text,
                "document_id": doc_id,
                "source_sentence": question_sentence,
                "key_phrase": phrase,
                "question_type": self._classify_question(question_text)
            })
        
        return questions
    
    def _find_sentence_with_phrase(self, text: str, phrase: str) -> str:
        """Find the sentence containing a specific phrase."""
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            if phrase.lower() in sentence.lower():
                return sentence.strip()
        
        # Return first sentence if not found
        return sentences[0].strip() if sentences else text[:100]
    
    def _classify_question(self, question: str) -> str:
        """Classify the type of question."""
        question_lower = question.lower()
        
        if question_lower.startswith('what'):
            return 'factual'
        elif question_lower.startswith('how'):
            return 'procedural'
        elif question_lower.startswith('why'):
            return 'explanatory'
        elif question_lower.startswith('describe'):
            return 'descriptive'
        else:
            return 'general'
    
    def generate_extractive_questions(self, chunks: List[str], doc_id: str) -> List[Dict[str, Any]]:
        """Generate questions by extracting key sentences."""
        questions = []
        
        for i, chunk in enumerate(chunks):
            sentences = re.split(r'[.!?]+', chunk)
            
            # Select important sentences (longer ones)
            important_sentences = [
                s for s in sentences 
                if len(s.strip()) > 30 and len(s.strip()) < 150
            ]
            
            if important_sentences:
                # Convert sentence to question
                sentence = random.choice(important_sentences).strip()
                question_text = sentence + "?"
                
                questions.append({
                    "question": question_text,
                    "document_id": doc_id,
                    "chunk_id": i,
                    "source_sentence": sentence,
                    "question_type": 'extractive'
                })
        
        return questions[:self.num_questions_per_doc]


class EvaluationDatasetGenerator:
    """Generate complete evaluation datasets from documents."""
    
    def __init__(self, min_document_sections: int = 5):
        self.min_document_sections = min_document_sections
        self.question_generator = QuestionGenerator()
    
    def generate_from_documents(
        self,
        documents: Dict[str, str],
        questions_per_doc: int = 3
    ) -> List[Dict[str, Any]]:
        """Generate evaluation dataset from document collection."""
        all_queries = []
        
        print(f"Generating evaluation dataset from {len(documents)} documents...")
        
        for doc_id, content in documents.items():
            # Generate questions
            questions = self.question_generator.generate_questions_from_text(
                content, doc_id
            )
            
            # Create query-relevance pairs
            for question_data in questions:
                # For each question, the source document is relevant
                query = {
                    "query": question_data["question"],
                    "relevant_docs": {doc_id},
                    "document_id": doc_id,
                    "question_type": question_data["question_type"],
                    "key_phrase": question_data["key_phrase"],
                    "source_sentence": question_data["source_sentence"]
                }
                
                all_queries.append(query)
        
        print(f"Generated {len(all_queries)} evaluation queries")
        
        # Ensure diversity in question types
        self._ensure_diversity(all_queries)
        
        return all_queries
    
    def generate_synthetic_dataset(
        self,
        documents: Dict[str, str],
        num_queries: int = 20
    ) -> List[Dict[str, Any]]:
        """Generate synthetic evaluation dataset with controlled diversity."""
        all_queries = []
        question_types = ['factual', 'procedural', 'explanatory', 'descriptive']
        
        print(f"Generating synthetic evaluation dataset with {num_queries} queries...")
        
        # Distribute questions across documents and types
        doc_ids = list(documents.keys())
        
        for i in range(num_queries):
            doc_id = doc_ids[i % len(doc_ids)]
            content = documents[doc_id]
            q_type = question_types[i % len(question_types)]
            
            # Generate question based on type
            if q_type == 'factual':
                phrases = self.question_generator.extract_key_phrases(content, 3)
                if phrases:
                    query_text = f"What is {phrases[0]}?"
                else:
                    query_text = f"What is described in this document?"
            
            elif q_type == 'procedural':
                query_text = f"How do you work with the main concepts in this document?"
            
            elif q_type == 'explanatory':
                query_text = f"Why are the key topics in this document important?"
            
            else:  # descriptive
                query_text = f"Describe the main content of this document."
            
            # Find relevant chunks
            sentences = re.split(r'[.!?]+', content)
            relevant_sentence = sentences[i % len(sentences)].strip() if sentences else content[:100]
            
            query = {
                "query": query_text,
                "relevant_docs": {doc_id},
                "document_id": doc_id,
                "question_type": q_type,
                "source_sentence": relevant_sentence
            }
            
            all_queries.append(query)
        
        print(f"Generated {len(all_queries)} synthetic evaluation queries")
        return all_queries
    
    def _ensure_diversity(self, queries: List[Dict[str, Any]]) -> None:
        """Ensure diversity in question types."""
        type_counts = Counter(q.get('question_type', 'general') for q in queries)
        
        print(f"Question type distribution: {dict(type_counts)}")
        
        # Warn if too skewed
        max_count = max(type_counts.values()) if type_counts else 0
        total = sum(type_counts.values())
        
        if max_count > total * 0.7:
            print(f"Warning: Question types are skewed (max {max_count/total:.1%})")


class DatasetSplitter:
    """Split evaluation dataset into train/test sets."""
    
    def __init__(self, test_size: float = 0.2):
        self.test_size = test_size
    
    def split_dataset(
        self,
        queries: List[Dict[str, Any]],
        random_seed: int = 42
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Split dataset into train and test sets."""
        random.seed(random_seed)
        
        # Shuffle queries
        shuffled = queries.copy()
        random.shuffle(shuffled)
        
        # Split
        split_idx = int(len(shuffled) * (1 - self.test_size))
        train = shuffled[:split_idx]
        test = shuffled[split_idx:]
        
        print(f"Dataset split: {len(train)} train queries, {len(test)} test queries")
        
        return {
            "train": train,
            "test": test
        }


if __name__ == "__main__":
    # Test the dataset generator
    print("Testing Automatic Evaluation Dataset Generation...")
    
    generator = EvaluationDatasetGenerator()
    
    # Sample documents
    documents = {
        "doc_1": """
        Machine learning is a subset of artificial intelligence that enables systems to learn from data.
        It uses algorithms to find patterns and make predictions without explicit programming.
        Deep learning is a type of machine learning that uses neural networks with multiple layers.
        """,
        "doc_2": """
        Natural language processing helps computers understand human language.
        It includes tasks like translation, summarization, and sentiment analysis.
        Modern NLP uses transformer models for better performance.
        """
    }
    
    # Generate dataset
    dataset = generator.generate_from_documents(documents, questions_per_doc=2)
    
    print(f"\nGenerated dataset with {len(dataset)} queries:")
    for i, query in enumerate(dataset):
        print(f"{i+1}. {query['query']}")
        print(f"   Type: {query['question_type']}, Relevant: {query['relevant_docs']}")
