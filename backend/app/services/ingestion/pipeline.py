
class IngestionPipeline:
    async def process_markdown(self, content: str) -> dict:
        # Stub for parsing markdown and extracting metadata
        return {"content": content, "metadata": {}}
        
    async def process_url(self, url: str) -> dict:
        # Stub for fetching URL and extracting content
        return {"content": f"Content from {url}", "metadata": {"source": url}}
        
    async def process_pdf(self, file_bytes: bytes) -> dict:
        # Stub for PDF extraction
        return {"content": "PDF extracted text", "metadata": {}}

ingestion_pipeline = IngestionPipeline()
