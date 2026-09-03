"""
Centralized prompt and template management with versioning.

Provides a registry of versioned prompt templates loaded from YAML files,
with variable interpolation and A/B testing support.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from string import Template

import yaml

logger = logging.getLogger("neuro.ai.prompts")

_DEFAULT_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"


@dataclass
class PromptTemplate:
    """A versioned prompt template with metadata."""

    name: str
    version: str
    system_prompt: str
    user_prompt_template: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    max_context_tokens: int = 4096
    temperature: float = 0.7

    def render(self, **kwargs: str) -> tuple[str, str]:
        """
        Render the template with variables.

        Returns:
            Tuple of (system_prompt, user_prompt).
        """
        system = Template(self.system_prompt).safe_substitute(**kwargs)
        user = Template(self.user_prompt_template).safe_substitute(**kwargs)
        return system, user


class PromptManager:
    """
    Versioned prompt template registry.

    Loads templates from YAML files and provides retrieval by name
    and version for consistent, testable prompt management.
    """

    def __init__(self, prompts_dir: Path | None = None):
        self._templates: dict[str, dict[str, PromptTemplate]] = {}
        self._prompts_dir = prompts_dir or _DEFAULT_PROMPTS_DIR
        self._load_templates()

    def _load_templates(self) -> None:
        """Load all YAML templates from the prompts directory."""
        if not self._prompts_dir.exists():
            logger.warning(f"Prompts directory not found: {self._prompts_dir}")
            self._load_defaults()
            return

        for yaml_file in self._prompts_dir.glob("*.yaml"):
            try:
                with open(yaml_file) as f:
                    data = yaml.safe_load(f)

                if not data or not isinstance(data, dict):
                    continue

                template = PromptTemplate(
                    name=data.get("name", yaml_file.stem),
                    version=data.get("version", "v1"),
                    system_prompt=data.get("system_prompt", ""),
                    user_prompt_template=data.get("user_prompt_template", ""),
                    description=data.get("description", ""),
                    tags=data.get("tags", []),
                    max_context_tokens=data.get("max_context_tokens", 4096),
                    temperature=data.get("temperature", 0.7),
                )

                if template.name not in self._templates:
                    self._templates[template.name] = {}
                self._templates[template.name][template.version] = template
                logger.debug(f"Loaded prompt template: {template.name} v{template.version}")

            except Exception as e:
                logger.error(f"Failed to load prompt template {yaml_file}: {e}")

        if not self._templates:
            self._load_defaults()

    def _load_defaults(self) -> None:
        """Load built-in default prompt templates."""
        defaults = [
            PromptTemplate(
                name="chat",
                version="v1",
                description="General conversational chat with RAG context",
                system_prompt=(
                    "You are Neuro, a helpful AI assistant that is part of the user's "
                    "personal second brain. Use the provided context notes to give accurate, "
                    "well-sourced answers. When citing information from context, reference the "
                    "source note title. If you don't know something or it's not in the context, "
                    "say so honestly."
                ),
                user_prompt_template="$user_message",
                max_context_tokens=4096,
                temperature=0.7,
            ),
            PromptTemplate(
                name="summarize",
                version="v1",
                description="Summarize text content into concise overview",
                system_prompt=(
                    "You are a precise summarization assistant. Create clear, concise summaries "
                    "that capture the key points, main arguments, and important details. "
                    "Output 2-3 sentences unless instructed otherwise."
                ),
                user_prompt_template="Summarize the following text:\n\n$text",
                max_context_tokens=8192,
                temperature=0.3,
            ),
            PromptTemplate(
                name="extract_tags",
                version="v1",
                description="Extract taxonomy tags from content",
                system_prompt=(
                    "You are a taxonomy expert. Extract 3-5 relevant topic tags from the "
                    "given content. Return ONLY a comma-separated list of lowercase words. "
                    "No explanations, no hashtags, no numbering."
                ),
                user_prompt_template="Extract tags from:\n\n$text",
                max_context_tokens=4096,
                temperature=0.2,
            ),
            PromptTemplate(
                name="verification",
                version="v1",
                description="Verify factual claims against retrieved context",
                system_prompt=(
                    "You are a fact-checking assistant. Given a response and supporting context "
                    "documents, identify which claims in the response are:\n"
                    "1. SUPPORTED - directly backed by the context\n"
                    "2. UNSUPPORTED - not found in the context\n"
                    "3. CONTRADICTED - conflicts with the context\n\n"
                    "For each claim, cite the specific context passage that supports or "
                    "contradicts it. Output as a structured list."
                ),
                user_prompt_template=("Response to verify:\n$response\n\nContext documents:\n$context"),
                max_context_tokens=8192,
                temperature=0.1,
            ),
        ]

        for template in defaults:
            if template.name not in self._templates:
                self._templates[template.name] = {}
            self._templates[template.name][template.version] = template

    def get(self, name: str, version: str = "latest", **kwargs: str) -> tuple[str, str]:
        """
        Get and render a prompt template.

        Args:
            name: Template name.
            version: Template version ("latest" for most recent).
            **kwargs: Variables to interpolate into the template.

        Returns:
            Tuple of (system_prompt, user_prompt).

        Raises:
            KeyError: If the template name or version is not found.
        """
        if name not in self._templates:
            raise KeyError(f"Prompt template '{name}' not found. Available: {list(self._templates.keys())}")

        versions = self._templates[name]
        if version == "latest":
            template = list(versions.values())[-1]
        elif version in versions:
            template = versions[version]
        else:
            raise KeyError(f"Version '{version}' not found for template '{name}'. Available: {list(versions.keys())}")

        return template.render(**kwargs)

    def get_template(self, name: str, version: str = "latest") -> PromptTemplate:
        """Get the raw PromptTemplate object without rendering."""
        if name not in self._templates:
            raise KeyError(f"Prompt template '{name}' not found.")

        versions = self._templates[name]
        if version == "latest":
            return list(versions.values())[-1]
        if version in versions:
            return versions[version]
        raise KeyError(f"Version '{version}' not found for template '{name}'.")

    def list_templates(self) -> dict[str, list[str]]:
        """List all available templates and their versions."""
        return {name: list(versions.keys()) for name, versions in self._templates.items()}

    def register(self, template: PromptTemplate) -> None:
        """Register a new prompt template programmatically."""
        if template.name not in self._templates:
            self._templates[template.name] = {}
        self._templates[template.name][template.version] = template
        logger.info(f"Registered prompt template: {template.name} v{template.version}")
