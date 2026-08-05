import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ParsedIntent(BaseModel):
    is_matched: bool
    tool_name: Optional[str] = None
    parameters: Dict[str, Any] = {}
    confidence: float = 0.0
    matched_pattern: Optional[str] = None
    raw_command: str = ""
    cleaned_command: str = ""


class IntentParser:
    """
    Zero-API-Key Deterministic Natural Language Parser.
    Extracts intents, entities, and parameters from user speech or text commands with zero latency.
    """

    WAKE_WORDS = [
        r"^hey\s+neuro[\s,]*",
        r"^hey[\s,]+neuro[\s,]*",
        r"^ok\s+neuro[\s,]*",
    ]

    def clean_command(self, text: str) -> str:
        cleaned = text.strip()
        # Strip wake-word prefixes
        for pattern in self.WAKE_WORDS:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
        # Remove trailing punctuation
        cleaned = re.sub(r"[.!?]+$", "", cleaned).strip()
        return cleaned

    def parse(self, text: str) -> ParsedIntent:
        cleaned = self.clean_command(text)
        if not cleaned:
            # Wake word only (e.g. "Hey Neuro")
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "wake_ack"},
                confidence=1.0,
                matched_pattern="wake_word_only",
                raw_command=text,
                cleaned_command=cleaned
            )

        lower = cleaned.lower()

        # 1. Spotify Playback Commands
        # e.g., "play bohemian rhapsody on spotify", "play drake spotify", "spotify play jazz"
        spotify_patterns = [
            r"^(?:play|listen\s+to)\s+(?P<query>.+?)\s+on\s+spotify$",
            r"^(?:play|listen\s+to)\s+(?P<query>.+?)\s+in\s+spotify$",
            r"^(?:play|listen\s+to)\s+spotify\s+(?P<query>.+)$",
            r"^spotify\s+(?:play|search)\s+(?P<query>.+)$",
            r"^(?:play|listen\s+to)\s+(?P<query>.+?)\s+spotify$",
            r"^play\s+this\s+song\s+(?P<query>.+?)(?:\s+on\s+spotify|\s+spotify)?$",
            r"^play\s+song\s+(?P<query>.+?)(?:\s+on\s+spotify|\s+spotify)?$",
        ]
        for pattern in spotify_patterns:
            match = re.match(pattern, lower)
            if match:
                query = match.group("query").strip()
                return ParsedIntent(
                    is_matched=True,
                    tool_name="play_spotify",
                    parameters={"query": query, "action": "play"},
                    confidence=0.98,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned
                )

        # Standalone Spotify open command
        if lower in ["open spotify", "launch spotify", "start spotify", "spotify"]:
            return ParsedIntent(
                is_matched=True,
                tool_name="open_app",
                parameters={"app_name": "spotify"},
                confidence=1.0,
                matched_pattern="open_spotify",
                raw_command=text,
                cleaned_command=cleaned
            )

        # 2. Application Launching Commands
        # e.g., "open brave", "open the brave browser", "launch vscode", "open code", "open terminal"
        app_patterns = [
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>brave|brave\s+browser)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>vs\s*code|visual\s+studio\s+code|code)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>terminal|powershell|cmd|command\s+prompt|bash)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>notepad|text\s+editor)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>file\s+explorer|explorer|files|folder)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>calculator|calc)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>task\s+manager|taskmgr)$",
            r"^(?:open|launch|start|run|take)\s+(?:the\s+)?(?P<app>snipping\s+tool|screenshot|snip)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>settings|system\s+settings)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>cursor|cursor\s+editor)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>chrome|google\s+chrome)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>firefox)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>discord)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>slack)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>[a-zA-Z0-9_\-\s]+?)(?:\s+app|\s+application)?$",
        ]
        for pattern in app_patterns:
            match = re.match(pattern, lower)
            if match:
                app_name = match.group("app").strip()
                # Exclude query searches that start with open
                if not app_name.startswith(("google", "youtube", "website", "url", "http")):
                    return ParsedIntent(
                        is_matched=True,
                        tool_name="open_app",
                        parameters={"app_name": app_name},
                        confidence=0.95,
                        matched_pattern=pattern,
                        raw_command=text,
                        cleaned_command=cleaned
                    )

        # 3. Web Search Commands
        # e.g., "search quantum computing on google", "google latest ai news", "search youtube for lofi music"
        search_patterns = [
            r"^(?:search|google|lookup)\s+(?:on\s+google\s+for\s+|for\s+)?(?P<query>.+?)\s+on\s+google$",
            r"^google\s+(?P<query>.+)$",
            r"^(?:search|lookup)\s+google\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+youtube$",
            r"^(?:search|lookup)\s+youtube\s+(?:for\s+)?(?P<query>.+)$",
            r"^youtube\s+(?:search\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+github$",
            r"^(?:search|lookup)\s+github\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+wikipedia$",
            r"^(?:search|lookup)\s+wikipedia\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+duckduckgo$",
            r"^search\s+(?:the\s+web\s+for\s+|for\s+)?(?P<query>.+)$",
        ]
        for pattern in search_patterns:
            match = re.match(pattern, lower)
            if match:
                query = match.group("query").strip()
                engine = "google"
                if "youtube" in pattern or "youtube" in lower:
                    engine = "youtube"
                elif "github" in pattern or "github" in lower:
                    engine = "github"
                elif "duckduckgo" in pattern or "duckduckgo" in lower:
                    engine = "duckduckgo"

                return ParsedIntent(
                    is_matched=True,
                    tool_name="web_search",
                    parameters={"query": query, "engine": engine},
                    confidence=0.95,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned
                )

        # 4. Note Taking & Second Brain Capture
        # e.g., "add this to note buy milk", "add to note idea for neuro", "take note: meeting at 3pm", "note down buy apples"
        note_patterns = [
            r"^add\s+(?:this\s+)?to\s+notes?[:\s]+(?P<content>.+)$",
            r"^take\s+(?:a\s+)?note[:\s]+(?P<content>.+)$",
            r"^create\s+(?:a\s+)?note[:\s]+(?P<content>.+)$",
            r"^note\s+down[:\s]+(?P<content>.+)$",
            r"^remember\s+(?:that\s+)?(?P<content>.+)$",
            r"^new\s+note[:\s]+(?P<content>.+)$",
        ]
        for pattern in note_patterns:
            match = re.match(pattern, lower)
            if match:
                content = match.group("content").strip()
                # Derive title from first few words
                words = content.split()
                title = " ".join(words[:5]).capitalize() if len(words) > 5 else content.capitalize()
                return ParsedIntent(
                    is_matched=True,
                    tool_name="create_quick_note",
                    parameters={"title": title, "content": content, "tags": ["quick-capture", "voice"]},
                    confidence=0.96,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned
                )

        # 5. Reminders & Scheduled Tasks
        # e.g., "set a reminder in 15 minutes to take a break", "remind me in 5 minutes to call mom", "remind me to check oven in 20 minutes"
        reminder_time_first = re.match(
            r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+in\s+(?P<mins>\d+)\s+(?:minutes|mins|m)\s+(?:to\s+|for\s+)?(?P<task>.+)$",
            lower
        )
        if reminder_time_first:
            mins = int(reminder_time_first.group("mins"))
            task = reminder_time_first.group("task").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="set_reminder",
                parameters={"title": task, "minutes": mins, "priority": "high"},
                confidence=0.98,
                matched_pattern="reminder_time_first",
                raw_command=text,
                cleaned_command=cleaned
            )

        reminder_task_first = re.match(
            r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+(?:to\s+|for\s+)?(?P<task>.+?)\s+in\s+(?P<mins>\d+)\s+(?:minutes|mins|m)$",
            lower
        )
        if reminder_task_first:
            mins = int(reminder_task_first.group("mins"))
            task = reminder_task_first.group("task").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="set_reminder",
                parameters={"title": task, "minutes": mins, "priority": "high"},
                confidence=0.98,
                matched_pattern="reminder_task_first",
                raw_command=text,
                cleaned_command=cleaned
            )

        reminder_generic = re.match(
            r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+(?:to\s+|for\s+)?(?P<task>.+)$",
            lower
        )
        if reminder_generic:
            task = reminder_generic.group("task").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="set_reminder",
                parameters={"title": task, "minutes": 10, "priority": "medium"},
                confidence=0.90,
                matched_pattern="reminder_generic",
                raw_command=text,
                cleaned_command=cleaned
            )

        # 6. Knowledge Base Search
        # e.g., "find in notes project roadmap", "search notes for authentication", "search knowledge base for rust"
        kb_patterns = [
            r"^(?:find|search)\s+in\s+notes?\s+(?:for\s+)?(?P<query>.+)$",
            r"^search\s+(?:my\s+)?notes?\s+(?:for\s+)?(?P<query>.+)$",
            r"^search\s+(?:my\s+)?knowledge\s+base\s+(?:for\s+)?(?P<query>.+)$",
            r"^what\s+did\s+i\s+write\s+about\s+(?P<query>.+)$",
        ]
        for pattern in kb_patterns:
            match = re.match(pattern, lower)
            if match:
                query = match.group("query").strip()
                return ParsedIntent(
                    is_matched=True,
                    tool_name="search_knowledge_base",
                    parameters={"query": query, "limit": 5},
                    confidence=0.95,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned
                )

        # 7. URL Navigation
        # e.g., "open website github.com", "go to youtube.com"
        url_match = re.match(r"^(?:open\s+website|go\s+to|open\s+url|browse)\s+(?P<url>[a-zA-Z0-9.\-_/:]+)$", lower)
        if url_match:
            url = url_match.group("url").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="open_url",
                parameters={"url": url},
                confidence=0.95,
                matched_pattern="open_url",
                raw_command=text,
                cleaned_command=cleaned
            )

        # 8. Time & System Status
        if lower in ["what time is it", "what's the time", "current time", "tell me the time", "time"]:
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "time"},
                confidence=1.0,
                matched_pattern="system_time",
                raw_command=text,
                cleaned_command=cleaned
            )

        if lower in ["system status", "system stats", "computer status", "specs", "how are you doing"]:
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "status"},
                confidence=0.95,
                matched_pattern="system_status",
                raw_command=text,
                cleaned_command=cleaned
            )

        # No deterministic intent matched
        return ParsedIntent(
            is_matched=False,
            confidence=0.0,
            raw_command=text,
            cleaned_command=cleaned
        )


intent_parser = IntentParser()
