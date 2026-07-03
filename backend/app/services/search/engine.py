from app.core.config import get_settings

settings = get_settings()

class SearchEngine:
    def __init__(self):
        # Stub for ChromaDB client and SQLite FTS connection setup
        pass
        
    async def hybrid_search(self, query: str, limit: int = 10):
        # Implementation would combine FTS and vector search
        return []

search_engine = SearchEngine()
