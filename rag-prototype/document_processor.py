"""
Document processor for chunking markdown, PDFs, and webpages.
"""

import os
import re
from typing import List, Dict, Any
from dataclasses import dataclass
import requests
from bs4 import BeautifulSoup
import pypdf
import markdown


@dataclass
class DocumentChunk:
    """Represents a chunk of text from a document."""
    text: str
    source: str
    chunk_id: int
    metadata: Dict[str, Any]


class DocumentProcessor:
    """Processes and chunks various document types."""
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", " ", ""]
    
    def process_markdown(self, file_path: str) -> List[DocumentChunk]:
        """Process a markdown file and return chunks."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert markdown to plain text for better chunking
        html = markdown.markdown(content)
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text()
        
        return self._chunk_text(text, source=file_path)
    
    def process_pdf(self, file_path: str) -> List[DocumentChunk]:
        """Process a PDF file and return chunks."""
        reader = pypdf.PdfReader(file_path)
        text = ""
        
        for page in reader.pages:
            text += page.extract_text()
        
        # Clean up PDF text
        text = re.sub(r'\s+', ' ', text)
        
        return self._chunk_text(text, source=file_path)
    
    def process_webpage(self, url: str) -> List[DocumentChunk]:
        """Process a webpage and return chunks."""
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text()
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return self._chunk_text(text, source=url)
    
    def process_text(self, text: str, source: str = "text_input") -> List[DocumentChunk]:
        """Process raw text and return chunks."""
        return self._chunk_text(text, source=source)
    
    def _chunk_text(self, text: str, source: str) -> List[DocumentChunk]:
        """Chunk text using recursive character splitting."""
        chunks = []
        text = text.strip()
        
        # Simple recursive chunking
        def recursive_chunk(text: str, separators: List[str]) -> List[str]:
            if not separators:
                # Last resort: split by character
                return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size - self.chunk_overlap)]
            
            separator = separators[0]
            remaining_separators = separators[1:]
            
            if separator not in text:
                return recursive_chunk(text, remaining_separators)
            
            splits = text.split(separator)
            chunks = []
            current_chunk = ""
            
            for split in splits:
                if len(current_chunk) + len(split) <= self.chunk_size:
                    current_chunk += split + separator
                else:
                    if current_chunk:
                        chunks.append(current_chunk.rstrip(separator))
                    current_chunk = split + separator
            
            if current_chunk:
                chunks.append(current_chunk.rstrip(separator))
            
            # If chunks are too large, recurse with different separator
            if any(len(chunk) > self.chunk_size for chunk in chunks):
                final_chunks = []
                for chunk in chunks:
                    final_chunks.extend(recursive_chunk(chunk, remaining_separators))
                return final_chunks
            
            return chunks
        
        raw_chunks = recursive_chunk(text, self.separators)
        
        # Filter out very short chunks and create DocumentChunk objects
        for i, chunk in enumerate(raw_chunks):
            if len(chunk.strip()) > 50:  # Minimum chunk length
                chunks.append(DocumentChunk(
                    text=chunk.strip(),
                    source=source,
                    chunk_id=i,
                    metadata={
                        "chunk_size": len(chunk),
                        "source_type": self._detect_source_type(source)
                    }
                ))
        
        return chunks
    
    def _detect_source_type(self, source: str) -> str:
        """Detect the type of document source."""
        if source.startswith("http"):
            return "webpage"
        elif source.endswith(".pdf"):
            return "pdf"
        elif source.endswith(".md") or source.endswith(".markdown"):
            return "markdown"
        else:
            return "text"


if __name__ == "__main__":
    # Test the processor
    processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
    
    # Test with sample text
    sample_text = """
    This is a sample document for testing the chunking functionality.
    It contains multiple sentences that should be split into chunks.
    The chunking algorithm is designed to handle various document types.
    Each chunk should be approximately 512 characters with some overlap.
    """
    
    chunks = processor.process_text(sample_text, source="test")
    print(f"Generated {len(chunks)} chunks")
    for i, chunk in enumerate(chunks):
        print(f"Chunk {i}: {chunk.text[:100]}...")
