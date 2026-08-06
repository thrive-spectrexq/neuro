import re
from typing import Any

from pydantic import BaseModel


class ParsedIntent(BaseModel):
    is_matched: bool
    tool_name: str | None = None
    parameters: dict[str, Any] = {}
    confidence: float = 0.0
    matched_pattern: str | None = None
    raw_command: str = ""
    cleaned_command: str = ""


class IntentParser:
    """
    Zero-API-Key Deterministic Natural Language Parser for Everyday PC Operations.
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
                cleaned_command=cleaned,
            )

        lower = cleaned.lower()

        # 1. System Hardware Controls (Volume, Mute, Lock, Sleep, Recycle Bin, Screenshot)
        # Volume Up / Down / Mute / Unmute
        if re.search(r"\b(volume\s+up|increase\s+(?:the\s+)?volume|turn\s+up\s+(?:the\s+)?volume|louder)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "volume_up"},
                confidence=0.98,
                matched_pattern="volume_up",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if re.search(
            r"\b(volume\s+down|decrease\s+(?:the\s+)?volume|turn\s+down\s+(?:the\s+)?volume|softer|quieter)\b", lower
        ):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "volume_down"},
                confidence=0.98,
                matched_pattern="volume_down",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if re.search(r"\b(mute\s+(?:the\s+)?(?:volume|sound|audio)|mute)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "mute"},
                confidence=0.98,
                matched_pattern="mute",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if re.search(r"\b(unmute\s+(?:the\s+)?(?:volume|sound|audio)|unmute)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "unmute"},
                confidence=0.98,
                matched_pattern="unmute",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # Lock PC
        if re.search(r"\b(lock\s+(?:the\s+|my\s+)?(?:pc|computer|screen|workstation)|lock\s+screen)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "lock_pc"},
                confidence=0.99,
                matched_pattern="lock_pc",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # Sleep PC
        if re.search(
            r"\b(put\s+(?:the\s+|my\s+)?(?:pc|computer)\s+to\s+sleep|sleep\s+(?:the\s+|my\s+)?(?:pc|computer))\b", lower
        ):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "sleep_pc"},
                confidence=0.98,
                matched_pattern="sleep_pc",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # Empty Recycle Bin
        if re.search(
            r"\b(empty\s+(?:the\s+)?recycle\s+bin|clear\s+(?:the\s+)?recycle\s+bin|clean\s+(?:the\s+)?trash|empty\s+(?:the\s+)?trash)\b",
            lower,
        ):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "empty_recycle_bin"},
                confidence=0.98,
                matched_pattern="empty_recycle_bin",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # Screenshot / Snip
        if re.search(
            r"\b(take\s+(?:a\s+)?screenshot|capture\s+(?:the\s+)?screen|take\s+(?:a\s+)?(?:screen\s*)?snip|screen\s*capture)\b",
            lower,
        ):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "take_screenshot"},
                confidence=0.98,
                matched_pattern="take_screenshot",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # Folders: Downloads, Documents, Desktop, Pictures, Music, Videos
        folder_match = re.match(
            r"^(?:open|show)\s+(?:the\s+|my\s+)?(?P<folder>downloads?|documents?|desktop|pictures?|music|videos?)\s*(?:folder)?$",
            lower,
        )
        if folder_match:
            folder_name = folder_match.group("folder").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "open_folder", "payload": folder_name},
                confidence=0.98,
                matched_pattern="open_folder",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 2. Math Calculations & Conversions
        # e.g., "calculate 25 * 40", "what is 15 percent of 850", "what is 500 / 4", "calculate (100 + 50) * 2"
        math_match = re.match(r"^(?:calculate|what\s+is|what's|solve|compute)\s+(?P<expr>.+?)$", lower)
        if math_match:
            raw_expr = math_match.group("expr").strip()
            # Check for percent of pattern (e.g. 15% of 850 or 15 percent of 850)
            percent_match = re.match(
                r"^(?P<pct>\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(?P<base>\d+(?:\.\d+)?)$", raw_expr
            )
            if percent_match:
                pct = float(percent_match.group("pct"))
                base = float(percent_match.group("base"))
                return ParsedIntent(
                    is_matched=True,
                    tool_name="quick_calculate",
                    parameters={"expression": f"({pct} / 100) * {base}", "raw_expression": raw_expr},
                    confidence=0.99,
                    matched_pattern="percent_calculation",
                    raw_command=text,
                    cleaned_command=cleaned,
                )

            # Check if it looks like a math expression (contains digits and math operators/words)
            cleaned_math = (
                raw_expr.replace("plus", "+")
                .replace("minus", "-")
                .replace("times", "*")
                .replace("multiplied by", "*")
                .replace("divided by", "/")
                .replace("over", "/")
                .replace("x", "*")
                .replace("^", "**")
                .strip()
            )
            # Only match if there are digits and valid arithmetic chars
            if re.search(r"\d", cleaned_math) and re.match(r"^[\d\s\+\-\*\/\.\(\)\^\%]+$", cleaned_math):
                return ParsedIntent(
                    is_matched=True,
                    tool_name="quick_calculate",
                    parameters={"expression": cleaned_math, "raw_expression": raw_expr},
                    confidence=0.98,
                    matched_pattern="quick_calculate",
                    raw_command=text,
                    cleaned_command=cleaned,
                )

        # 3. Coin Flip & Dice Roll (Everyday Quick Decision)
        if re.search(r"\b(flip\s+(?:a\s+)?coin|coin\s+flip|heads\s+or\s+tails)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="random_decision",
                parameters={"type": "coin_flip"},
                confidence=0.99,
                matched_pattern="coin_flip",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if re.search(r"\b(roll\s+(?:a\s+)?(?:die|dice)|roll\s+dice)\b", lower):
            return ParsedIntent(
                is_matched=True,
                tool_name="random_decision",
                parameters={"type": "dice_roll", "sides": 6},
                confidence=0.99,
                matched_pattern="dice_roll",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 4. Spotify Playback Commands
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
                    cleaned_command=cleaned,
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
                cleaned_command=cleaned,
            )

        # 5. Maps, Directions, and Weather
        maps_match = re.match(
            r"^(?:where\s+is|directions\s+to|show\s+on\s+maps?|show\s+map\s+of|maps?\s+for|show\s+me\s+directions\s+to)\s+(?P<location>.+?)(?:\s+on\s+(?:google\s+)?maps)?$",
            lower,
        )
        if maps_match:
            location = maps_match.group("location").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="web_search",
                parameters={"query": location, "engine": "maps"},
                confidence=0.97,
                matched_pattern="maps_lookup",
                raw_command=text,
                cleaned_command=cleaned,
            )

        weather_match = re.match(
            r"^(?:what's\s+the\s+weather|weather\s+in|weather\s+for|weather)\s*(?:in\s+|for\s+)?(?P<city>.*)$", lower
        )
        if weather_match and ("weather" in lower):
            city = weather_match.group("city").strip() or "current location"
            return ParsedIntent(
                is_matched=True,
                tool_name="web_search",
                parameters={"query": f"weather {city}".strip(), "engine": "google"},
                confidence=0.96,
                matched_pattern="weather_lookup",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 6. Web Search Commands (Google, YouTube, GitHub, Reddit, Wikipedia, DuckDuckGo)
        search_patterns = [
            r"^(?:search|google|lookup)\s+(?:on\s+google\s+for\s+|for\s+)?(?P<query>.+?)\s+on\s+google$",
            r"^google\s+(?P<query>.+)$",
            r"^(?:search|lookup)\s+google\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+youtube$",
            r"^(?:search|lookup)\s+youtube\s+(?:for\s+)?(?P<query>.+)$",
            r"^youtube\s+(?:search\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+github$",
            r"^(?:search|lookup)\s+github\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+reddit$",
            r"^(?:search|lookup)\s+reddit\s+(?:for\s+)?(?P<query>.+)$",
            r"^(?:search|lookup)\s+(?P<query>.+?)\s+on\s+wikipedia$",
            r"^(?:search|lookup)\s+wikipedia\s+(?:for\s+)?(?P<query>.+)$",
            r"^wikipedia\s+(?:search\s+|for\s+)?(?P<query>.+)$",
            r"^who\s+(?:is|was)\s+(?P<query>.+?)(?:\s+on\s+wikipedia)?$",
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
                elif "reddit" in pattern or "reddit" in lower:
                    engine = "reddit"
                elif "wikipedia" in pattern or "who" in pattern:
                    engine = "wikipedia"
                elif "duckduckgo" in pattern or "duckduckgo" in lower:
                    engine = "duckduckgo"

                return ParsedIntent(
                    is_matched=True,
                    tool_name="web_search",
                    parameters={"query": query, "engine": engine},
                    confidence=0.95,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned,
                )

        # 7. Note Taking & Second Brain Capture
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
                words = content.split()
                title = " ".join(words[:5]).capitalize() if len(words) > 5 else content.capitalize()
                return ParsedIntent(
                    is_matched=True,
                    tool_name="create_quick_note",
                    parameters={"title": title, "content": content, "tags": ["quick-capture", "voice"]},
                    confidence=0.96,
                    matched_pattern=pattern,
                    raw_command=text,
                    cleaned_command=cleaned,
                )

        # 8. Reminders & Scheduled Tasks
        reminder_time_first = re.match(
            r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+in\s+(?P<mins>\d+)\s+(?:minutes|mins|m)\s+(?:to\s+|for\s+)?(?P<task>.+)$",
            lower,
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
                cleaned_command=cleaned,
            )

        reminder_task_first = re.match(
            r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+(?:to\s+|for\s+)?(?P<task>.+?)\s+in\s+(?P<mins>\d+)\s+(?:minutes|mins|m)$",
            lower,
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
                cleaned_command=cleaned,
            )

        reminder_generic = re.match(r"^(?:set\s+(?:a\s+)?reminder|remind\s+me)\s+(?:to\s+|for\s+)?(?P<task>.+)$", lower)
        if reminder_generic:
            task = reminder_generic.group("task").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="set_reminder",
                parameters={"title": task, "minutes": 10, "priority": "medium"},
                confidence=0.90,
                matched_pattern="reminder_generic",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 9. Knowledge Base Search
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
                    cleaned_command=cleaned,
                )

        # 10. URL Navigation
        # e.g., "open website github.com", "go to youtube.com", "open reddit.com"
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
                cleaned_command=cleaned,
            )

        # Direct domain name (e.g. "open github.com", "open chatgpt.com")
        domain_match = re.match(
            r"^(?:open|launch)\s+(?P<url>[a-zA-Z0-9\-]+\.(?:com|org|net|io|dev|ai|app|co|me|edu|gov)(?:/[^\s]*)?)$",
            lower,
        )
        if domain_match:
            url = domain_match.group("url").strip()
            return ParsedIntent(
                is_matched=True,
                tool_name="open_url",
                parameters={"url": url},
                confidence=0.96,
                matched_pattern="direct_domain",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 11. Application Launching Commands (Comprehensive PC Apps)
        app_patterns = [
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>brave|brave\s+browser)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>chrome|google\s+chrome)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>firefox)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>edge|microsoft\s+edge)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>arc|arc\s+browser)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>opera|opera\s+gx)(?:\s+browser)?$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>vs\s*code|visual\s+studio\s+code|code)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>visual\s+studio|devenv)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>cursor|cursor\s+editor)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>pycharm|intellij|webstorm|android\s+studio)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>sublime|sublime\s+text)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>terminal|windows\s+terminal|powershell|cmd|command\s+prompt|bash|git\s+bash)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>notepad|text\s+editor)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>file\s+explorer|explorer|files|folder)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>calculator|calc)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>paint|mspaint)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>task\s+manager|taskmgr)$",
            r"^(?:open|launch|start|run|take)\s+(?:the\s+)?(?P<app>snipping\s+tool|screenshot|snip)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>settings|system\s+settings|control\s+panel)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>discord)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>slack)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>telegram)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>whatsapp)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>teams|microsoft\s+teams)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>zoom)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>obsidian)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>notion)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>steam)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>figma)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>obs|obs\s+studio)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>vlc|vlc\s+media\s+player)$",
            r"^(?:open|launch|start|run)\s+(?:the\s+)?(?P<app>[a-zA-Z0-9_\-\s]+?)(?:\s+app|\s+application)?$",
        ]
        for pattern in app_patterns:
            match = re.match(pattern, lower)
            if match:
                app_name = match.group("app").strip()
                APP_ALIASES = {
                    "task manager": "taskmgr",
                    "calc": "calculator",
                    "mspaint": "paint",
                }
                normalized_app = APP_ALIASES.get(app_name, app_name)
                # Exclude phrases like "open website...", "open google...", "open url..." or generic queries
                if not re.match(r"^(google|youtube|website|url|http|what\s|how\s|search\s)", app_name):
                    return ParsedIntent(
                        is_matched=True,
                        tool_name="open_app",
                        parameters={"app_name": normalized_app},
                        confidence=0.95,
                        matched_pattern=pattern,
                        raw_command=text,
                        cleaned_command=cleaned,
                    )

        # 12. Time, Date & System Status
        if lower in ["what time is it", "what's the time", "current time", "tell me the time", "time"]:
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "time"},
                confidence=1.0,
                matched_pattern="system_time",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if re.search(
            r"\b(what('s| is) (today's |the )?date|what('s| is) today's date|today's date|current date|what day is today|date)\b",
            lower,
        ):
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "date"},
                confidence=1.0,
                matched_pattern="system_date",
                raw_command=text,
                cleaned_command=cleaned,
            )

        if lower in [
            "system status",
            "system stats",
            "computer status",
            "specs",
            "how are you doing",
            "battery",
            "battery status",
        ]:
            return ParsedIntent(
                is_matched=True,
                tool_name="system_action",
                parameters={"action": "status"},
                confidence=0.95,
                matched_pattern="system_status",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 13. Generative Roadmaps & Dependency Learning Path Intents
        roadmap_match = re.match(
            r"^(?:generate|create|build|make|show)(?:\s+me)?\s+(?:a\s+)?(?:learning\s+)?(?:roadmap|dependency\s+graph|study\s+plan)\s+(?:for|on|about)\s+(?P<goal>.+)$",
            lower,
        )
        if roadmap_match:
            return ParsedIntent(
                is_matched=True,
                tool_name="generate_roadmap",
                parameters={"goal": roadmap_match.group("goal").strip()},
                confidence=0.98,
                matched_pattern="generate_roadmap",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 14. Prerequisite & Dependency Chain Lookups
        prereq_match = re.match(
            r"^(?:what\s+are\s+the\s+)?prerequisites\s+(?:for|of)\s+(?P<topic>.+)$",
            lower,
        ) or re.match(
            r"^(?:what\s+do\s+i\s+need\s+to\s+learn\s+before|what\s+unlocks)\s+(?P<topic>.+)$",
            lower,
        )
        if prereq_match:
            return ParsedIntent(
                is_matched=True,
                tool_name="get_prerequisites",
                parameters={"topic": prereq_match.group("topic").strip()},
                confidence=0.96,
                matched_pattern="get_prerequisites",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 15. Topic Quizzes & Comprehension Verification
        quiz_match = re.match(
            r"^(?:quiz\s+me\s+on|take\s+quiz\s+on|test\s+my\s+knowledge\s+on|test\s+me\s+on)\s+(?P<topic>.+)$",
            lower,
        )
        if quiz_match:
            return ParsedIntent(
                is_matched=True,
                tool_name="topic_quiz",
                parameters={"topic": quiz_match.group("topic").strip()},
                confidence=0.96,
                matched_pattern="topic_quiz",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # 16. Obsidian Vault Export & Sync
        if re.search(r"\b(export\s+(?:(?:all\s+|my\s+)?(?:notes|graph|vault|second\s+brain|knowledge\s+base)\s+)?(?:to\s+)?obsidian|export\s+vault|sync\s+(?:notes\s+)?(?:to\s+)?obsidian|obsidian\s+export)\b", lower):
            return ParsedIntent(

                is_matched=True,
                tool_name="export_obsidian",
                parameters={},
                confidence=0.98,
                matched_pattern="export_obsidian",
                raw_command=text,
                cleaned_command=cleaned,
            )

        # No deterministic intent matched
        return ParsedIntent(is_matched=False, confidence=0.0, raw_command=text, cleaned_command=cleaned)


intent_parser = IntentParser()
