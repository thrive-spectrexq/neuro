
import re
import yaml
import fitz  # PyMuPDF
from app.services.ai.provider import get_ai_provider

class IngestionPipeline:
    def __init__(self):
        self.ai_provider = get_ai_provider()

    async def _summarize_text(self, text: str) -> str:
        prompt = f"Summarize the following text concisely:\n\n{text[:5000]}"
        # Collect the stream
        summary = ""
        try:
            async for chunk in self.ai_provider.generate_response_stream(prompt, context=[]):
                summary += chunk
        except Exception:
            return "Summary generation failed."
        return summary

    async def process_markdown(self, content: str) -> dict:
        """Parses Obsidian/Markdown file, extracts YAML frontmatter, and converts wikilinks."""
        metadata = {}
        # Parse YAML frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    metadata = yaml.safe_load(parts[1]) or {}
                    content = parts[2].strip()
                except Exception:
                    pass
        
        # Convert Obsidian wikilinks [[Link]] to standard markdown links [Link](Link)
        # Handle aliases: [[Link|Alias]] -> [Alias](Link)
        def replace_wikilink(match):
            inner = match.group(1)
            if "|" in inner:
                target, alias = inner.split("|", 1)
                return f"[{alias}]({target})"
            return f"[{inner}]({inner})"
            
        content = re.sub(r'\[\[(.*?)\]\]', replace_wikilink, content)
        
        return {"content": content, "metadata": metadata}
        
    async def process_url(self, url: str) -> dict:
        # Stub for fetching URL and extracting content
        return {"content": f"Content from {url}", "metadata": {"source": url}}
        
    async def process_pdf(self, file_bytes: bytes) -> dict:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
        except Exception as e:
            text = f"Error extracting PDF: {str(e)}"
            
        summary = await self._summarize_text(text)
        return {
            "content": text,
            "metadata": {"summary": summary, "type": "pdf"}
        }

ingestion_pipeline = IngestionPipeline()
