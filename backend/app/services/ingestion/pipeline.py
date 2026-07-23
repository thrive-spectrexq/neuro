import re

import fitz  # PyMuPDF
import yaml

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

    async def extract_entities(self, text: str) -> list[str]:
        prompt = f'Extract the most important entities (people, places, concepts, organizations) from the following text. Return ONLY a JSON list of strings, for example: ["Entity 1", "Entity 2"]. Text: \n\n{text[:5000]}'
        response = ""
        try:
            async for chunk in self.ai_provider.generate_response_stream(prompt, context=[]):
                response += chunk

            cleaned = response.strip()
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0)

            import json

            entities = json.loads(cleaned)
            if isinstance(entities, list):
                return [str(e).strip() for e in entities if str(e).strip()]
        except Exception:
            lines = [line.strip("- *•").strip() for line in response.splitlines() if line.strip()]
            valid = [
                line_item
                for line_item in lines
                if line_item and not line_item.startswith("```") and not line_item.startswith("{")
            ]
            if valid:
                return valid[:10]
        return []

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

        content = re.sub(r"\[\[(.*?)\]\]", replace_wikilink, content)

        return {"content": content, "metadata": metadata}

    async def process_url(self, url: str) -> dict:
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                html = response.text

                # Extract title
                title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                title = title_match.group(1).strip() if title_match else "Unknown Title"

                # Extract text by stripping HTML tags
                text = re.sub(
                    r"<style[^>]*>.*?</style>",
                    "",
                    html,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                text = re.sub(
                    r"<script[^>]*>.*?</script>",
                    "",
                    text,
                    flags=re.IGNORECASE | re.DOTALL,
                )
                text = re.sub(r"<[^>]+>", " ", text)
                text = re.sub(r"\s+", " ", text).strip()

                return {"content": text, "metadata": {"source": url, "title": title}}
        except Exception as e:
            return {
                "content": f"Failed to fetch content: {str(e)}",
                "metadata": {"source": url},
            }

    async def process_pdf(self, file_bytes: bytes) -> dict:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
        except Exception as e:
            text = f"Error extracting PDF: {str(e)}"

        summary = await self._summarize_text(text)
        return {"content": text, "metadata": {"summary": summary, "type": "pdf"}}

    async def process_vault_import(self, source_path: str, format: str) -> list[dict]:
        """Routes a vault import request to the appropriate importer."""
        if format == "obsidian":
            from app.services.ingestion.obsidian import ObsidianImporter

            importer = ObsidianImporter(source_path)
        elif format == "notion":
            from app.services.ingestion.notion import NotionImporter

            importer = NotionImporter(source_path)
        elif format == "roam":
            from app.services.ingestion.roam import RoamImporter

            importer = RoamImporter(source_path)
        else:
            raise ValueError(f"Unsupported import format: {format}")

        return await importer.process()


ingestion_pipeline = IngestionPipeline()
