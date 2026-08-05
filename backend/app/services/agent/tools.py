import logging
import os
import platform
import subprocess
import urllib.parse
import webbrowser
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

CURRENT_OS = platform.system().lower()


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


class Tool(BaseModel):
    name: str
    description: str
    category: str  # "os", "media", "knowledge", "productivity", "system"
    parameters: List[ToolParameter] = Field(default_factory=list)


class ToolResult(BaseModel):
    success: bool
    tool_name: str
    message: str
    data: Optional[Dict[str, Any]] = None
    voice_feedback: Optional[str] = None


# Known Application executable commands per platform
APP_MAPPINGS: Dict[str, Dict[str, List[str]]] = {
    "brave": {
        "windows": ["brave.exe", "brave", r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe", r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"],
        "darwin": ["open -a 'Brave Browser'"],
        "linux": ["brave-browser", "brave"],
    },
    "vscode": {
        "windows": ["code.cmd", "code.exe", "code"],
        "darwin": ["code", "open -a 'Visual Studio Code'"],
        "linux": ["code"],
    },
    "spotify": {
        "windows": ["spotify.exe", "spotify"],
        "darwin": ["open -a Spotify"],
        "linux": ["spotify"],
    },
    "notepad": {
        "windows": ["notepad.exe"],
        "darwin": ["open -a TextEdit"],
        "linux": ["gedit", "nano"],
    },
    "terminal": {
        "windows": ["wt.exe", "powershell.exe", "cmd.exe"],
        "darwin": ["open -a Terminal"],
        "linux": ["gnome-terminal", "x-terminal-emulator"],
    },
    "explorer": {
        "windows": ["explorer.exe"],
        "darwin": ["open ."],
        "linux": ["xdg-open ."],
    },
    "calculator": {
        "windows": ["calc.exe"],
        "darwin": ["open -a Calculator"],
        "linux": ["gnome-calculator"],
    },
    "chrome": {
        "windows": ["chrome.exe", r"C:\Program Files\Google\Chrome\Application\chrome.exe"],
        "darwin": ["open -a 'Google Chrome'"],
        "linux": ["google-chrome", "chromium-browser"],
    },
    "firefox": {
        "windows": ["firefox.exe"],
        "darwin": ["open -a Firefox"],
        "linux": ["firefox"],
    },
    "cursor": {
        "windows": ["cursor.cmd", "cursor.exe", "cursor"],
        "darwin": ["cursor", "open -a Cursor"],
        "linux": ["cursor"],
    },
    "taskmgr": {
        "windows": ["taskmgr.exe"],
        "darwin": ["open -a 'Activity Monitor'"],
        "linux": ["gnome-system-monitor", "htop"],
    },
    "snipping": {
        "windows": ["snippingtool.exe"],
        "darwin": ["open -a Screenshot"],
        "linux": ["flameshot", "gnome-screenshot"],
    },
    "settings": {
        "windows": ["ms-settings:"],
        "darwin": ["open 'x-apple.systempreferences:'"],
        "linux": ["gnome-control-center"],
    },
    "discord": {
        "windows": ["discord.exe"],
        "darwin": ["open -a Discord"],
        "linux": ["discord"],
    },
    "slack": {
        "windows": ["slack.exe"],
        "darwin": ["open -a Slack"],
        "linux": ["slack"],
    },
}


class AgentToolsRegistry:
    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._handlers: Dict[str, Callable] = {}
        self._register_default_tools()

    def register(self, tool: Tool, handler: Callable):
        self._tools[tool.name] = tool
        self._handlers[tool.name] = handler

    def get_tool(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Tool]:
        return list(self._tools.values())

    async def execute(self, tool_name: str, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        handler = self._handlers.get(tool_name)
        if not handler:
            return ToolResult(
                success=False,
                tool_name=tool_name,
                message=f"Unknown tool '{tool_name}'",
                voice_feedback=f"Sorry, I don't know how to execute {tool_name}."
            )
        try:
            res = await handler(args, context or {})
            return res
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
            return ToolResult(
                success=False,
                tool_name=tool_name,
                message=f"Execution error: {str(e)}",
                voice_feedback=f"Failed to execute {tool_name}: {str(e)}"
            )

    def _register_default_tools(self):
        # 1. Open Application
        self.register(
            Tool(
                name="open_app",
                description="Launch or switch to a desktop application (Brave, VS Code, Spotify, Terminal, Notepad, Cursor, etc.)",
                category="os",
                parameters=[
                    ToolParameter(name="app_name", type="string", description="Name of the application (e.g. brave, vscode, spotify, notepad, terminal, explorer)"),
                    ToolParameter(name="args", type="string", description="Optional argument or target path/url", required=False),
                ]
            ),
            self._handle_open_app
        )

        # 2. Spotify Play & Control
        self.register(
            Tool(
                name="play_spotify",
                description="Search and play a song, artist, album or playlist on Spotify",
                category="media",
                parameters=[
                    ToolParameter(name="query", type="string", description="Search term for track, artist, album or playlist"),
                    ToolParameter(name="action", type="string", description="Action: play, search, pause, next, previous", required=False, default="play"),
                ]
            ),
            self._handle_play_spotify
        )

        # 3. Web Search
        self.register(
            Tool(
                name="web_search",
                description="Search the web using Google, DuckDuckGo, YouTube, GitHub or Wikipedia",
                category="os",
                parameters=[
                    ToolParameter(name="query", type="string", description="Search query keywords"),
                    ToolParameter(name="engine", type="string", description="Search engine (google, youtube, github, duckduckgo)", required=False, default="google"),
                ]
            ),
            self._handle_web_search
        )

        # 4. Open URL / Browser
        self.register(
            Tool(
                name="open_url",
                description="Open any URL in the user's default browser or specified browser",
                category="os",
                parameters=[
                    ToolParameter(name="url", type="string", description="Web URL to open"),
                    ToolParameter(name="browser", type="string", description="Browser name (brave, chrome, default)", required=False, default="default"),
                ]
            ),
            self._handle_open_url
        )

        # 5. Create Quick Note
        self.register(
            Tool(
                name="create_quick_note",
                description="Capture a new note in Neuro knowledge base with title, content and tags",
                category="knowledge",
                parameters=[
                    ToolParameter(name="title", type="string", description="Title of the note"),
                    ToolParameter(name="content", type="string", description="Markdown content of the note"),
                    ToolParameter(name="tags", type="list", description="Tags for categorization", required=False, default=[]),
                ]
            ),
            self._handle_create_quick_note
        )

        # 6. Set Reminder / Task
        self.register(
            Tool(
                name="set_reminder",
                description="Set a task reminder or scheduled alert with time and priority",
                category="productivity",
                parameters=[
                    ToolParameter(name="title", type="string", description="Description or title of what to remember"),
                    ToolParameter(name="minutes", type="integer", description="Minutes from now to trigger the reminder", required=False, default=10),
                    ToolParameter(name="priority", type="string", description="Priority (low, medium, high)", required=False, default="medium"),
                ]
            ),
            self._handle_set_reminder
        )

        # 7. Search Knowledge Base
        self.register(
            Tool(
                name="search_knowledge_base",
                description="Search the user's Neuro second brain notes and knowledge base",
                category="knowledge",
                parameters=[
                    ToolParameter(name="query", type="string", description="Query to search across notes"),
                    ToolParameter(name="limit", type="integer", description="Max number of notes to return", required=False, default=5),
                ]
            ),
            self._handle_search_knowledge_base
        )

        # 8. System Action
        self.register(
            Tool(
                name="system_action",
                description="Perform system level utilities (get system status, copy to clipboard, screenshot)",
                category="system",
                parameters=[
                    ToolParameter(name="action", type="string", description="Action: status, screenshot, copy, time"),
                    ToolParameter(name="payload", type="string", description="Optional data payload", required=False),
                ]
            ),
            self._handle_system_action
        )

    # --- Tool Execution Handlers ---

    async def _handle_open_app(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        raw_name = args.get("app_name", "").strip().lower()
        extra_args = args.get("args", "")

        # Normalize app name
        app_key = raw_name
        if "brave" in raw_name:
            app_key = "brave"
        elif "code" in raw_name or "vs code" in raw_name or "vscode" in raw_name:
            app_key = "vscode"
        elif "spotify" in raw_name:
            app_key = "spotify"
        elif "notepad" in raw_name or "text" in raw_name:
            app_key = "notepad"
        elif "terminal" in raw_name or "powershell" in raw_name or "cmd" in raw_name or "bash" in raw_name:
            app_key = "terminal"
        elif "explorer" in raw_name or "files" in raw_name or "folder" in raw_name:
            app_key = "explorer"
        elif "calc" in raw_name:
            app_key = "calculator"
        elif "chrome" in raw_name:
            app_key = "chrome"
        elif "firefox" in raw_name:
            app_key = "firefox"
        elif "cursor" in raw_name:
            app_key = "cursor"

        candidates = APP_MAPPINGS.get(app_key, {}).get(
            "windows" if "windows" in CURRENT_OS else ("darwin" if "darwin" in CURRENT_OS else "linux"),
            [raw_name]
        )

        launched = False
        launched_cmd = ""
        for candidate in candidates:
            try:
                if "windows" in CURRENT_OS:
                    cmd = f'start "" "{candidate}"'
                    if extra_args:
                        cmd += f' "{extra_args}"'
                    # Use shell=True for windows start command
                    subprocess.Popen(cmd, shell=True)
                    launched = True
                    launched_cmd = candidate
                    break
                elif "darwin" in CURRENT_OS:
                    cmd = f"{candidate} {extra_args}".strip()
                    subprocess.Popen(cmd, shell=True)
                    launched = True
                    launched_cmd = candidate
                    break
                else:
                    cmd = f"{candidate} {extra_args}".strip()
                    subprocess.Popen(cmd, shell=True)
                    launched = True
                    launched_cmd = candidate
                    break
            except Exception as ex:
                logger.warning(f"Failed to launch candidate {candidate}: {ex}")

        display_name = app_key.replace("_", " ").capitalize()
        if launched:
            return ToolResult(
                success=True,
                tool_name="open_app",
                message=f"Launched {display_name} successfully",
                data={"app": app_key, "command": launched_cmd},
                voice_feedback=f"Opening {display_name} for you now, sir."
            )
        else:
            # Fallback to os.startfile or generic system open
            try:
                if "windows" in CURRENT_OS:
                    os.system(f"start {raw_name}")
                elif "darwin" in CURRENT_OS:
                    os.system(f"open -a {raw_name}")
                else:
                    os.system(f"{raw_name} &")
                return ToolResult(
                    success=True,
                    tool_name="open_app",
                    message=f"Dispatched launch command for {raw_name}",
                    data={"app": raw_name},
                    voice_feedback=f"Launching {raw_name}."
                )
            except Exception as e:
                return ToolResult(
                    success=False,
                    tool_name="open_app",
                    message=f"Could not open {raw_name}: {str(e)}",
                    voice_feedback=f"I wasn't able to launch {raw_name} on your system."
                )

    async def _handle_play_spotify(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        action = args.get("action", "play").lower()

        if query:
            # Spotify URI search format
            encoded_query = urllib.parse.quote(query)
            spotify_uri = f"spotify:search:{encoded_query}"
            web_fallback = f"https://open.spotify.com/search/{encoded_query}"

            opened = False
            if "windows" in CURRENT_OS:
                try:
                    # Windows URI protocol handler
                    os.startfile(spotify_uri)
                    opened = True
                except Exception:
                    webbrowser.open(web_fallback)
                    opened = True
            elif "darwin" in CURRENT_OS:
                try:
                    subprocess.Popen(["open", spotify_uri])
                    opened = True
                except Exception:
                    webbrowser.open(web_fallback)
                    opened = True
            else:
                try:
                    subprocess.Popen(["xdg-open", spotify_uri])
                    opened = True
                except Exception:
                    webbrowser.open(web_fallback)
                    opened = True

            return ToolResult(
                success=opened,
                tool_name="play_spotify",
                message=f"Playing '{query}' on Spotify",
                data={"query": query, "uri": spotify_uri, "action": action},
                voice_feedback=f"Playing {query} on Spotify."
            )
        else:
            # General Spotify app trigger
            return await self._handle_open_app({"app_name": "spotify"}, context)

    async def _handle_web_search(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        engine = args.get("engine", "google").lower()

        if not query:
            return ToolResult(
                success=False,
                tool_name="web_search",
                message="Search query is empty",
                voice_feedback="What would you like me to search for?"
            )

        encoded = urllib.parse.quote_plus(query)
        if "youtube" in engine or "yt" in engine:
            url = f"https://www.youtube.com/results?search_query={encoded}"
            engine_name = "YouTube"
        elif "github" in engine:
            url = f"https://github.com/search?q={encoded}"
            engine_name = "GitHub"
        elif "duckduckgo" in engine or "ddg" in engine:
            url = f"https://duckduckgo.com/?q={encoded}"
            engine_name = "DuckDuckGo"
        elif "wiki" in engine:
            url = f"https://en.wikipedia.org/wiki/Special:Search?search={encoded}"
            engine_name = "Wikipedia"
        else:
            url = f"https://www.google.com/search?q={encoded}"
            engine_name = "Google"

        webbrowser.open(url)

        return ToolResult(
            success=True,
            tool_name="web_search",
            message=f"Searched {engine_name} for '{query}'",
            data={"query": query, "engine": engine_name, "url": url},
            voice_feedback=f"Searching {engine_name} for {query}."
        )

    async def _handle_open_url(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        url = args.get("url", "").strip()
        if not url.startswith(("http://", "https://", "ftp://")):
            url = f"https://{url}"

        webbrowser.open(url)
        return ToolResult(
            success=True,
            tool_name="open_url",
            message=f"Opened URL: {url}",
            data={"url": url},
            voice_feedback="Opening web page."
        )

    async def _handle_create_quick_note(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        title = args.get("title", "Quick Voice Note").strip()
        content = args.get("content", "").strip()
        tags = args.get("tags", [])

        if not content and not title:
            return ToolResult(
                success=False,
                tool_name="create_quick_note",
                message="Note content and title cannot both be empty",
                voice_feedback="I didn't catch what you wanted to note down."
            )

        if not content:
            content = f"# {title}\n\n*Captured via JARVIS Agent*"

        session = context.get("session")
        user_id = context.get("user_id")

        if session and user_id:
            try:
                from app.schemas.note import NoteCreate
                from app.services.notes import note_service

                note_in = NoteCreate(title=title, content=content, tags=tags)
                note = await note_service.create_note(session=session, user_id=user_id, data=note_in)
                return ToolResult(
                    success=True,
                    tool_name="create_quick_note",
                    message=f"Created note: '{title}'",
                    data={"id": str(note.id), "title": note.title, "tags": tags},
                    voice_feedback=f"Added note '{title}' to your knowledge base."
                )
            except Exception as e:
                logger.error(f"Failed to create note in database: {e}")

        # In-memory/fallback representation
        return ToolResult(
            success=True,
            tool_name="create_quick_note",
            message=f"Note captured: '{title}'",
            data={"title": title, "content": content, "tags": tags},
            voice_feedback=f"Captured note '{title}'."
        )

    async def _handle_set_reminder(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        title = args.get("title", "Reminder").strip()
        minutes = int(args.get("minutes", 10))
        priority = args.get("priority", "medium")

        due_time = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        due_str = due_time.strftime("%I:%M %p")

        session = context.get("session")
        user_id = context.get("user_id")

        if session and user_id:
            try:
                from app.models.task import TaskCreate
                from app.services.tasks import task_service

                task_in = TaskCreate(
                    title=f"Reminder: {title}",
                    description=f"Set via JARVIS Agent. Due in {minutes} minutes ({due_str})",
                    priority=priority,
                    due_date=due_time,
                    user_id=user_id
                )
                task = await task_service.create_task(session=session, data=task_in, user_id=user_id)
                return ToolResult(
                    success=True,
                    tool_name="set_reminder",
                    message=f"Set reminder '{title}' for {due_str} ({minutes}m)",
                    data={"id": str(task.id), "title": title, "due_date": due_time.isoformat(), "minutes": minutes},
                    voice_feedback=f"Reminder set for {title} in {minutes} minutes."
                )
            except Exception as e:
                logger.error(f"Failed to create task in database: {e}")

        return ToolResult(
            success=True,
            tool_name="set_reminder",
            message=f"Reminder scheduled: '{title}' for {due_str} ({minutes}m)",
            data={"title": title, "due_date": due_time.isoformat(), "minutes": minutes},
            voice_feedback=f"Reminder set for {title} in {minutes} minutes."
        )

    async def _handle_search_knowledge_base(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        limit = int(args.get("limit", 5))

        session = context.get("session")
        user_id = context.get("user_id")

        if session and user_id:
            try:
                from app.services.search.engine import search_engine
                results = await search_engine.hybrid_search(
                    session=session,
                    query=query,
                    user_id=user_id,
                    limit=limit
                )
                count = len(results)
                titles = [r.get("title", "") for r in results]
                feedback = f"Found {count} matching notes in your knowledge base." if count > 0 else "No notes found matching that query."
                return ToolResult(
                    success=True,
                    tool_name="search_knowledge_base",
                    message=f"Found {count} notes for '{query}'",
                    data={"results": results, "titles": titles, "query": query},
                    voice_feedback=feedback
                )
            except Exception as e:
                logger.error(f"Failed knowledge base search: {e}")

        return ToolResult(
            success=True,
            tool_name="search_knowledge_base",
            message=f"Queried knowledge base for '{query}'",
            data={"results": [], "query": query},
            voice_feedback=f"Searched notes for {query}."
        )

    async def _handle_system_action(self, args: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        action = args.get("action", "status").lower()

        if "time" in action or "date" in action or "clock" in action:
            now_str = datetime.now().strftime("%A, %B %d at %I:%M %p")
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Current time: {now_str}",
                data={"time": now_str},
                voice_feedback=f"It is currently {now_str}."
            )
        elif "status" in action or "stats" in action:
            uname = platform.uname()
            status_data = {
                "os": f"{uname.system} {uname.release}",
                "node": uname.node,
                "architecture": uname.machine,
                "python_version": platform.python_version(),
            }
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"System running {uname.system} {uname.release}",
                data=status_data,
                voice_feedback=f"All systems operational on {uname.system}."
            )
        else:
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Executed system action: {action}",
                data={"action": action},
                voice_feedback=f"System action {action} completed."
            )


# Global singleton registry instance
agent_tools_registry = AgentToolsRegistry()
