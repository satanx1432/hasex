"""
Document processing for PDF, Markdown, and Webpages.
"""
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import requests
from bs4 import BeautifulSoup
import pypdf
import markdown
from pypdf import PdfReader


@dataclass
class DocumentChunk:
    """Represents a chunk of text from a document."""
    text: str
    source: str
    chunk_id: int
    metadata: Dict[str, Any]


class DocumentProcessor:
    """Process various document types with smart chunking."""
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process_pdf(self, file_path: str, source: str = None) -> List[DocumentChunk]:
        """Process PDF file."""
        if source is None:
            source = str(file_path)
        
        reader = PdfReader(file_path)
        text = ""
        
        for page in reader.pages:
            text += page.extract_text()
        
        # Clean up PDF text
        text = re.sub(r'\s+', ' ', text)
        
        return self._chunk_text(text, source, "pdf")
    
    def process_markdown(self, file_path: str, source: str = None) -> List[DocumentChunk]:
        """Process Markdown file."""
        if source is None:
            source = str(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert markdown to plain text
        html = markdown.markdown(content)
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text()
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return self._chunk_text(text, source, "markdown")
    
    def process_webpage(self, url: str) -> List[DocumentChunk]:
        """Process webpage."""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()
            
            text = soup.get_text()
            
            # Clean up whitespace
            text = re.sub(r'\s+', ' ', text)
            
            return self._chunk_text(text, url, "webpage")
        
        except Exception as e:
            raise ValueError(f"Failed to process webpage {url}: {str(e)}")
    
    def process_text(self, text: str, source: str = "text_input", doc_type: str = "text") -> List[DocumentChunk]:
        """Process raw text."""
        return self._chunk_text(text, source, doc_type)
    
    def _chunk_text(self, text: str, source: str, doc_type: str) -> List[DocumentChunk]:
        """Smart text chunking with overlap."""
        text = text.strip()
        
        if not text:
            return []
        
        chunks = []
        separators = ["\n\n", "\n", ". ", " ", ""]
        
        def recursive_split(text: str, separators: List[str]) -> List[str]:
            if not separators:
                return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size - self.chunk_overlap)]
            
            separator = separators[0]
            remaining = separators[1:]
            
            if separator not in text:
                return recursive_split(text, remaining)
            
            splits = text.split(separator)
            chunks_list = []
            current_chunk = ""
            
            for split in splits:
                if len(current_chunk) + len(split) <= self.chunk_size:
                    current_chunk += split + separator
                else:
                    if current_chunk:
                        chunks_list.append(current_chunk.rstrip(separator))
                    current_chunk = split + separator
            
            if current_chunk:
                chunks_list.append(current_chunk.rstrip(separator))
            
            # If chunks are too large, recurse
            if any(len(chunk) > self.chunk_size for chunk in chunks_list):
                final_chunks = []
                for chunk in chunks_list:
                    final_chunks.extend(recursive_split(chunk, remaining))
                return final_chunks
            
            return chunks_list
        
        raw_chunks = recursive_split(text, separators)
        
        # Filter and create DocumentChunk objects
        for i, chunk in enumerate(raw_chunks):
            chunk = chunk.strip()
            if len(chunk) > 50:  # Minimum chunk length
                chunks.append(DocumentChunk(
                    text=chunk,
                    source=source,
                    chunk_id=i,
                    metadata={
                        "chunk_size": len(chunk),
                        "doc_type": doc_type,
                        "source": source
                    }
                ))
        
        return chunks
    
    def validate_document(self, file_path: str, max_size_mb: int = 10) -> bool:
        """Validate document size and type."""
        path = Path(file_path)
        
        # Check file size
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > max_size_mb:
            return False
        
        # Check file type
        valid_extensions = {'.pdf', '.md', '.markdown', '.txt'}
        return path.suffix.lower() in valid_extensions
