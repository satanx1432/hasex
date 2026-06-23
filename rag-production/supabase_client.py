"""
Supabase integration for metadata storage.
"""
from supabase import create_client
from typing import Dict, Any, List, Optional
from config import settings


class SupabaseClient:
    """Supabase client for metadata storage."""
    
    def __init__(
        self,
        url: str = None,
        key: str = None
    ):
        self.url = url or settings.supabase_url
        self.key = key or settings.supabase_service_key
        
        if not self.url or not self.key:
            raise ValueError("Supabase URL and key must be provided")
        
        self.client = create_client(self.url, self.key)
        print(f"Connected to Supabase: {self.url}")
    
    def initialize_tables(self) -> None:
        """Initialize database tables for RAG metadata."""
        # These would typically be created via Supabase SQL migrations
        # For now, we assume the tables exist
        print("Supabase tables initialization skipped - assume tables exist")
    
    def store_document_metadata(
        self,
        document_id: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Store document metadata in Supabase."""
        try:
            data = {
                "document_id": document_id,
                **metadata
            }
            
            result = self.client.table("document_metadata").insert(data).execute()
            print(f"Stored metadata for document {document_id} in Supabase")
            return {"success": True, "document_id": document_id}
        
        except Exception as e:
            print(f"Failed to store metadata in Supabase: {e}")
            return {"success": False, "error": str(e)}
    
    def store_chunk_metadata(
        self,
        chunk_id: str,
        document_id: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Store chunk metadata in Supabase."""
        try:
            data = {
                "chunk_id": chunk_id,
                "document_id": document_id,
                **metadata
            }
            
            result = self.client.table("chunk_metadata").insert(data).execute()
            print(f"Stored metadata for chunk {chunk_id} in Supabase")
            return {"success": True, "chunk_id": chunk_id}
        
        except Exception as e:
            print(f"Failed to store chunk metadata in Supabase: {e}")
            return {"success": False, "error": str(e)}
    
    def get_document_metadata(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve document metadata from Supabase."""
        try:
            result = self.client.table("document_metadata").select("*").eq("document_id", document_id).execute()
            
            if result.data:
                return result.data[0]
            return None
        
        except Exception as e:
            print(f"Failed to retrieve metadata from Supabase: {e}")
            return None
    
    def delete_document_metadata(self, document_id: str) -> bool:
        """Delete document metadata from Supabase."""
        try:
            self.client.table("document_metadata").delete().eq("document_id", document_id).execute()
            self.client.table("chunk_metadata").delete().eq("document_id", document_id).execute()
            print(f"Deleted metadata for document {document_id} from Supabase")
            return True
        
        except Exception as e:
            print(f"Failed to delete metadata from Supabase: {e}")
            return False
    
    def search_metadata(
        self,
        filters: Dict[str, Any] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search documents by metadata filters."""
        try:
            query = self.client.table("document_metadata").select("*").limit(limit)
            
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            
            result = query.execute()
            return result.data
        
        except Exception as e:
            print(f"Failed to search metadata in Supabase: {e}")
            return []