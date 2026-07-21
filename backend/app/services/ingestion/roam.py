import json
import re
from pathlib import Path
from typing import List, Dict, Any

class RoamImporter:
    def __init__(self, json_path: str):
        self.json_path = Path(json_path)
        self.block_map: Dict[str, str] = {}
        
    async def process(self) -> List[Dict[str, Any]]:
        return self.import_export()

    def import_export(self) -> List[Dict[str, Any]]:
        """
        Reads a Roam JSON export file, extracts content, and converts block/page references.
        """
        documents = []
        if not self.json_path.exists() or not self.json_path.is_file():
            raise ValueError(f"Invalid Roam JSON export path: {self.json_path}")

        with open(self.json_path, 'r', encoding='utf-8') as f:
            pages = json.load(f)

        self._build_block_map(pages)

        for page in pages:
            doc = self._process_page(page)
            if doc:
                documents.append(doc)

        return documents

    def _build_block_map(self, pages: List[Dict[str, Any]]):
        def traverse(blocks):
            for block in blocks:
                if 'uid' in block and 'string' in block:
                    self.block_map[block['uid']] = block['string']
                traverse(block.get('children', []))
        
        for page in pages:
            traverse(page.get('children', []))

    def _process_page(self, page: Dict[str, Any]) -> Dict[str, Any]:
        title = page.get('title', 'Untitled')
        
        children = page.get('children', [])
        content = f"# {title}\n\n"
        content += self._process_blocks(children, level=0)
        
        # Convert references
        content = self._convert_references(content)
        
        return {
            "content": content,
            "metadata": {
                "title": title,
                "source": "roam"
            }
        }

    def _process_blocks(self, blocks: List[Dict[str, Any]], level: int) -> str:
        content = ""
        indent = "  " * level
        for block in blocks:
            string = block.get('string', '')
            if string:
                content += f"{indent}- {string}\n"
            content += self._process_blocks(block.get('children', []), level + 1)
        return content

    def _convert_references(self, text: str) -> str:
        # Convert block refs: ((id)) -> resolved text (in italics) or original if not found
        def block_replacer(match):
            uid = match.group(1)
            resolved = self.block_map.get(uid)
            if resolved:
                return f"*{resolved}*"
            return match.group(0)

        text = re.sub(r'\(\((.*?)\)\)', block_replacer, text)
        
        # Convert page refs: [[Page]] -> [Page](Page)
        def page_replacer(match):
            inner = match.group(1)
            if "|" in inner:
                target, alias = inner.split("|", 1)
                return f"[{alias}]({target})"
            return f"[{inner}]({inner})"
            
        text = re.sub(r'\[\[(.*?)\]\]', page_replacer, text)
        return text
