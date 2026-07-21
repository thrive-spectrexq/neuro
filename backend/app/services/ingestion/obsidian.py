import os
import re
import yaml
from pathlib import Path
from typing import List, Dict, Any

class ObsidianImporter:
    def __init__(self, vault_path: str):
        self.vault_path = Path(vault_path)

    async def process(self) -> List[Dict[str, Any]]:
        return self.import_vault()

    def import_vault(self) -> List[Dict[str, Any]]:
        """
        Reads all markdown files in the vault, extracting content and metadata.
        """
        documents = []
        if not self.vault_path.exists() or not self.vault_path.is_dir():
            raise ValueError(f"Invalid vault path: {self.vault_path}")

        for filepath in self.vault_path.rglob("*.md"):
            try:
                doc = self._process_file(filepath)
                documents.append(doc)
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

        return documents

    def _process_file(self, filepath: Path) -> Dict[str, Any]:
        """
        Extracts YAML frontmatter, converts wikilinks, and maps folders to tags.
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

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

        # Map folders to tags
        rel_path = filepath.relative_to(self.vault_path)
        folders = list(rel_path.parent.parts)
        if folders:
            # Handle existing tags in metadata
            existing_tags = metadata.get("tags", [])
            if isinstance(existing_tags, str):
                # If tags is a single string (e.g. comma-separated or space-separated)
                existing_tags = [t.strip() for t in existing_tags.split(",") if t.strip()]
            elif not isinstance(existing_tags, list):
                existing_tags = []
                
            folder_tags = [f.replace(" ", "-").lower() for f in folders if f]
            existing_tags.extend(folder_tags)
            
            # Remove duplicates and save back
            metadata["tags"] = list(set(existing_tags))

        # Convert Obsidian wikilinks [[Link]] -> [Link](Link) and [[Link|Alias]] -> [Alias](Link)
        def replace_wikilink(match):
            inner = match.group(1)
            if "|" in inner:
                target, alias = inner.split("|", 1)
                return f"[{alias}]({target})"
            return f"[{inner}]({inner})"
            
        content = re.sub(r'\[\[(.*?)\]\]', replace_wikilink, content)

        # Include basic metadata
        metadata["source_path"] = str(rel_path)
        if "title" not in metadata:
            metadata["title"] = filepath.stem

        return {
            "content": content,
            "metadata": metadata
        }
