import os
import re
import zipfile
import tempfile
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any

class NotionImporter:
    """
    Importer for Notion exports (markdown & csv zip files or extracted directories).
    Handles cleaning up Notion's ID-based filenames and fixing internal links.
    """
    
    def __init__(self, export_path: str):
        self.export_path = Path(export_path)
        # Regex to match Notion's 32-character ID at the end of filenames/directories
        self.id_pattern = re.compile(r'\s+[a-f0-9]{32}$', re.IGNORECASE)
        # Notion internal links typically look like: [Some Title](Some%20Title%201234567890abcdef.md)
        self.link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+\.md)\)')
        
    def _extract_if_zip(self) -> Path:
        """Extract zip file to a temporary directory if needed."""
        if self.export_path.is_file() and self.export_path.suffix.lower() == '.zip':
            temp_dir = tempfile.mkdtemp(prefix="notion_export_")
            with zipfile.ZipFile(self.export_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            return Path(temp_dir)
        return self.export_path

    def _clean_name(self, name: str) -> str:
        """Remove the 32-character ID from a Notion filename or folder name."""
        base, ext = os.path.splitext(name)
        cleaned_base = self.id_pattern.sub('', base)
        return cleaned_base + ext

    def _build_file_map(self, base_dir: Path) -> Dict[str, str]:
        """
        Build a map of original encoded Notion filenames to their clean names.
        Useful for fixing internal links.
        """
        file_map = {}
        for root, _, files in os.walk(base_dir):
            for file in files:
                if file.endswith('.md'):
                    original_name = file
                    clean = self._clean_name(original_name)
                    encoded_original = urllib.parse.quote(original_name)
                    file_map[encoded_original] = clean
                    file_map[original_name] = clean
        return file_map

    def _process_markdown(self, filepath: Path, file_map: Dict[str, str]) -> str:
        """Read markdown and replace internal links with clean filenames."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                content = f.read()

        def link_replacer(match):
            text, url = match.groups()
            url_basename = urllib.parse.unquote(os.path.basename(url))
            if url_basename in file_map:
                clean_url = file_map[url_basename]
                return f'[{text}]({clean_url})'
            elif url in file_map:
                return f'[{text}]({file_map[url]})'
            return match.group(0)

        cleaned_content = self.link_pattern.sub(link_replacer, content)
        return cleaned_content

    def process(self) -> List[Dict[str, Any]]:
        """
        Process the export.
        Returns a list of dictionaries containing title, content, and metadata for each page.
        """
        base_dir = self._extract_if_zip()
        
        # Build map for link resolution
        file_map = self._build_file_map(base_dir)
        
        results = []
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                if file.endswith('.md'):
                    filepath = Path(root) / file
                    clean_title = self._clean_name(file).replace('.md', '')
                    cleaned_content = self._process_markdown(filepath, file_map)
                    
                    results.append({
                        "title": clean_title,
                        "original_filename": file,
                        "content": cleaned_content,
                        "source_path": str(filepath.relative_to(base_dir))
                    })
        return results
