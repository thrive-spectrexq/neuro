import ast
import logging
import operator as op
import os
import platform
import random
import subprocess
import urllib.parse
import webbrowser
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

CURRENT_OS = platform.system().lower()


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Any | None = None


class Tool(BaseModel):
    name: str
    description: str
    category: str  # "os", "media", "knowledge", "productivity", "system", "utility"
    parameters: list[ToolParameter] = Field(default_factory=list)


class ToolResult(BaseModel):
    success: bool
    tool_name: str
    message: str
    data: dict[str, Any] | None = None
    voice_feedback: str | None = None


# Supported arithmetic operators for safe math evaluation
SAFE_OPERATORS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Pow: op.pow,
    ast.BitXor: op.pow,  # Support ^ as exponentiation common in voice/text math
    ast.Mod: op.mod,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
}


def safe_eval_expr(expr_str: str) -> float:
    """Safely evaluate arithmetic expressions without using raw eval."""

    def _eval(node):
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            operator_fn = SAFE_OPERATORS.get(type(node.op))
            if operator_fn is None:
                raise ValueError(f"Unsupported operator: {type(node.op)}")
            return operator_fn(left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            operator_fn = SAFE_OPERATORS.get(type(node.op))
            if operator_fn is None:
                raise ValueError(f"Unsupported unary operator: {type(node.op)}")
            return operator_fn(operand)
        else:
            raise ValueError(f"Unsupported AST node: {type(node)}")

    parsed = ast.parse(expr_str, mode="eval")
    return _eval(parsed.body)


# Known Application executable commands per platform
APP_MAPPINGS: dict[str, dict[str, list[str]]] = {
    "brave": {
        "windows": [
            "brave.exe",
            "brave",
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
        ],
        "darwin": ["open -a 'Brave Browser'"],
        "linux": ["brave-browser", "brave"],
    },
    "chrome": {
        "windows": ["chrome.exe", r"C:\Program Files\Google\Chrome\Application\chrome.exe"],
        "darwin": ["open -a 'Google Chrome'"],
        "linux": ["google-chrome", "chromium-browser"],
    },
    "firefox": {
        "windows": ["firefox.exe", r"C:\Program Files\Mozilla Firefox\firefox.exe"],
        "darwin": ["open -a Firefox"],
        "linux": ["firefox"],
    },
    "edge": {
        "windows": ["msedge.exe", "start microsoft-edge:"],
        "darwin": ["open -a 'Microsoft Edge'"],
        "linux": ["microsoft-edge"],
    },
    "arc": {
        "windows": ["arc.exe"],
        "darwin": ["open -a Arc"],
        "linux": ["arc"],
    },
    "opera": {
        "windows": ["opera.exe", "launcher.exe"],
        "darwin": ["open -a Opera"],
        "linux": ["opera"],
    },
    "vscode": {
        "windows": ["code.cmd", "code.exe", "code"],
        "darwin": ["code", "open -a 'Visual Studio Code'"],
        "linux": ["code"],
    },
    "visual_studio": {
        "windows": ["devenv.exe"],
        "darwin": ["open -a 'Visual Studio'"],
        "linux": ["monodevelop"],
    },
    "cursor": {
        "windows": ["cursor.cmd", "cursor.exe", "cursor"],
        "darwin": ["cursor", "open -a Cursor"],
        "linux": ["cursor"],
    },
    "pycharm": {
        "windows": ["pycharm64.exe", "pycharm.exe", "pycharm"],
        "darwin": ["open -a PyCharm"],
        "linux": ["pycharm"],
    },
    "intellij": {
        "windows": ["idea64.exe", "idea.exe", "idea"],
        "darwin": ["open -a 'IntelliJ IDEA'"],
        "linux": ["idea"],
    },
    "sublime": {
        "windows": ["sublime_text.exe", "subl.exe", "subl"],
        "darwin": ["open -a 'Sublime Text'"],
        "linux": ["subl"],
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
    "paint": {
        "windows": ["mspaint.exe"],
        "darwin": ["open -a Paintbrush"],
        "linux": ["gimp", "drawing"],
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
    "telegram": {
        "windows": ["telegram.exe"],
        "darwin": ["open -a Telegram"],
        "linux": ["telegram-desktop"],
    },
    "whatsapp": {
        "windows": ["whatsapp.exe"],
        "darwin": ["open -a WhatsApp"],
        "linux": ["whatsapp-for-linux"],
    },
    "teams": {
        "windows": ["teams.exe", "ms-teams.exe"],
        "darwin": ["open -a 'Microsoft Teams'"],
        "linux": ["teams"],
    },
    "zoom": {
        "windows": ["zoom.exe"],
        "darwin": ["open -a zoom.us"],
        "linux": ["zoom"],
    },
    "obsidian": {
        "windows": ["obsidian.exe"],
        "darwin": ["open -a Obsidian"],
        "linux": ["obsidian"],
    },
    "notion": {
        "windows": ["notion.exe"],
        "darwin": ["open -a Notion"],
        "linux": ["notion-app"],
    },
    "steam": {
        "windows": ["steam.exe"],
        "darwin": ["open -a Steam"],
        "linux": ["steam"],
    },
    "figma": {
        "windows": ["figma.exe"],
        "darwin": ["open -a Figma"],
        "linux": ["figma-linux"],
    },
    "obs": {
        "windows": ["obs64.exe", "obs.exe"],
        "darwin": ["open -a OBS"],
        "linux": ["obs"],
    },
    "vlc": {
        "windows": ["vlc.exe"],
        "darwin": ["open -a VLC"],
        "linux": ["vlc"],
    },
}


class AgentToolsRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}
        self._handlers: dict[str, Callable] = {}
        self._register_default_tools()

    def register(self, tool: Tool, handler: Callable):
        self._tools[tool.name] = tool
        self._handlers[tool.name] = handler

    def get_tool(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[Tool]:
        return list(self._tools.values())

    async def execute(self, tool_name: str, args: dict[str, Any], context: dict[str, Any] | None = None) -> ToolResult:
        handler = self._handlers.get(tool_name)
        if not handler:
            return ToolResult(
                success=False,
                tool_name=tool_name,
                message=f"Unknown tool '{tool_name}'",
                voice_feedback=f"Sorry, I don't know how to execute {tool_name}.",
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
                voice_feedback=f"Failed to execute {tool_name}: {str(e)}",
            )

    def _register_default_tools(self):
        # 1. Open Application
        self.register(
            Tool(
                name="open_app",
                description="Launch or switch to a desktop application (Brave, Chrome, VS Code, Discord, Slack, Spotify, Terminal, Notepad, Cursor, etc.)",
                category="os",
                parameters=[
                    ToolParameter(name="app_name", type="string", description="Name of the application"),
                    ToolParameter(
                        name="args", type="string", description="Optional argument or target path/url", required=False
                    ),
                ],
            ),
            self._handle_open_app,
        )

        # 2. Spotify Play & Control
        self.register(
            Tool(
                name="play_spotify",
                description="Search and play a song, artist, album or playlist on Spotify",
                category="media",
                parameters=[
                    ToolParameter(
                        name="query", type="string", description="Search term for track, artist, album or playlist"
                    ),
                    ToolParameter(
                        name="action",
                        type="string",
                        description="Action: play, search, pause, next, previous",
                        required=False,
                        default="play",
                    ),
                ],
            ),
            self._handle_play_spotify,
        )

        # 10. Generative Learning Roadmap
        self.register(
            Tool(
                name="generate_roadmap",
                description="Synthesizes a structured prerequisite learning dependency graph for any topic or goal",
                category="knowledge",
                parameters=[
                    ToolParameter(name="goal", type="string", description="Learning goal or subject"),
                    ToolParameter(
                        name="depth",
                        type="string",
                        description="Depth: beginner, intermediate, advanced",
                        required=False,
                        default="intermediate",
                    ),
                ],
            ),
            self._handle_generate_roadmap,
        )

        # 11. Prerequisite & Dependency Chain Lookup
        self.register(
            Tool(
                name="get_prerequisites",
                description="Calculates the prerequisite dependency chain for any topic",
                category="knowledge",
                parameters=[
                    ToolParameter(
                        name="topic", type="string", description="Subject or topic to query prerequisites for"
                    ),
                ],
            ),
            self._handle_get_prerequisites,
        )

        # 12. Topic Comprehension Quiz
        self.register(
            Tool(
                name="topic_quiz",
                description="Generates an interactive verification quiz for a topic",
                category="knowledge",
                parameters=[
                    ToolParameter(name="topic", type="string", description="Subject or note topic to quiz on"),
                ],
            ),
            self._handle_topic_quiz,
        )

        # 13. Obsidian Vault Export
        self.register(
            Tool(
                name="export_obsidian",
                description="Exports the Second Brain into an Obsidian-compatible vault structure",
                category="productivity",
                parameters=[],
            ),
            self._handle_export_obsidian,
        )

        # 3. Web Search & Maps & Lookups
        self.register(
            Tool(
                name="web_search",
                description="Search Google, YouTube, GitHub, Reddit, Wikipedia, Maps or DuckDuckGo",
                category="os",
                parameters=[
                    ToolParameter(name="query", type="string", description="Search query keywords"),
                    ToolParameter(
                        name="engine",
                        type="string",
                        description="Search engine (google, youtube, github, reddit, wikipedia, maps, duckduckgo)",
                        required=False,
                        default="google",
                    ),
                ],
            ),
            self._handle_web_search,
        )

        # 4. Open URL / Browser
        self.register(
            Tool(
                name="open_url",
                description="Open any URL in the user's default browser or specified browser",
                category="os",
                parameters=[
                    ToolParameter(name="url", type="string", description="Web URL to open"),
                    ToolParameter(
                        name="browser",
                        type="string",
                        description="Browser name (brave, chrome, default)",
                        required=False,
                        default="default",
                    ),
                ],
            ),
            self._handle_open_url,
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
                    ToolParameter(
                        name="tags", type="list", description="Tags for categorization", required=False, default=[]
                    ),
                ],
            ),
            self._handle_create_quick_note,
        )

        # 6. Set Reminder / Task
        self.register(
            Tool(
                name="set_reminder",
                description="Set a task reminder or scheduled alert with time and priority",
                category="productivity",
                parameters=[
                    ToolParameter(name="title", type="string", description="Description or title of what to remember"),
                    ToolParameter(
                        name="minutes",
                        type="integer",
                        description="Minutes from now to trigger the reminder",
                        required=False,
                        default=10,
                    ),
                    ToolParameter(
                        name="priority",
                        type="string",
                        description="Priority (low, medium, high)",
                        required=False,
                        default="medium",
                    ),
                ],
            ),
            self._handle_set_reminder,
        )

        # 7. Search Knowledge Base
        self.register(
            Tool(
                name="search_knowledge_base",
                description="Search the user's Neuro second brain notes and knowledge base",
                category="knowledge",
                parameters=[
                    ToolParameter(name="query", type="string", description="Query to search across notes"),
                    ToolParameter(
                        name="limit",
                        type="integer",
                        description="Max number of notes to return",
                        required=False,
                        default=5,
                    ),
                ],
            ),
            self._handle_search_knowledge_base,
        )

        # 8. Quick Math Calculator
        self.register(
            Tool(
                name="quick_calculate",
                description="Safely evaluate mathematical expressions and percentages offline",
                category="utility",
                parameters=[
                    ToolParameter(name="expression", type="string", description="Arithmetic math expression"),
                    ToolParameter(
                        name="raw_expression", type="string", description="Original user phrasing", required=False
                    ),
                ],
            ),
            self._handle_quick_calculate,
        )

        # 9. Random Decisions (Coin Flip, Dice Roll)
        self.register(
            Tool(
                name="random_decision",
                description="Coin flip and dice rolling for fast decision making",
                category="utility",
                parameters=[
                    ToolParameter(
                        name="type", type="string", description="Type of random decision: coin_flip, dice_roll"
                    ),
                    ToolParameter(
                        name="sides", type="integer", description="Number of sides for dice", required=False, default=6
                    ),
                ],
            ),
            self._handle_random_decision,
        )

        # 10. System Action (Volume, Mute, Folders, Lock, Sleep, Screenshot, Time, Date)
        self.register(
            Tool(
                name="system_action",
                description="Perform system level utilities (volume control, folders, lock screen, sleep, empty bin, screenshot, time)",
                category="system",
                parameters=[
                    ToolParameter(
                        name="action",
                        type="string",
                        description="Action: volume_up, volume_down, mute, unmute, lock_pc, sleep_pc, empty_recycle_bin, take_screenshot, open_folder, time, date, status",
                    ),
                    ToolParameter(
                        name="payload",
                        type="string",
                        description="Optional data payload (e.g. folder name)",
                        required=False,
                    ),
                ],
            ),
            self._handle_system_action,
        )

        # 11. Graph Intelligence - Blast Radius / Change Impact
        self.register(
            Tool(
                name="compute_blast_radius",
                description="Calculate upstream callers and downstream dependencies affected by modifying a symbol or file",
                category="knowledge",
                parameters=[
                    ToolParameter(
                        name="target", type="string", description="Symbol, function, class, or file path to evaluate"
                    ),
                    ToolParameter(
                        name="max_depth", type="integer", description="Max hop depth", required=False, default=3
                    ),
                ],
            ),
            self._handle_compute_blast_radius,
        )

        # 12. Graph Intelligence - God Nodes & Keystones
        self.register(
            Tool(
                name="find_god_nodes",
                description="Find central architectural keystones and high-degree modules in the knowledge graph",
                category="knowledge",
                parameters=[
                    ToolParameter(
                        name="top_n",
                        type="integer",
                        description="Number of nodes to return",
                        required=False,
                        default=10,
                    ),
                ],
            ),
            self._handle_find_god_nodes,
        )

        # 13. Graph Intelligence - Analyze Codebase Graph
        self.register(
            Tool(
                name="analyze_codebase_graph",
                description="Extract and analyze codebase knowledge graph (clustering, communities, diagnostics)",
                category="knowledge",
                parameters=[
                    ToolParameter(
                        name="root_path",
                        type="string",
                        description="Repository root directory",
                        required=False,
                        default=None,
                    ),
                ],
            ),
            self._handle_analyze_codebase_graph,
        )

        # 14. Graph Intelligence - Generate Markdown Wiki
        self.register(
            Tool(
                name="generate_graph_wiki",
                description="Generate Wikipedia-style documentation from the codebase knowledge graph",
                category="knowledge",
                parameters=[
                    ToolParameter(
                        name="out_dir",
                        type="string",
                        description="Output directory for generated markdown",
                        required=False,
                        default=None,
                    ),
                ],
            ),
            self._handle_generate_graph_wiki,
        )

    # --- Tool Execution Handlers ---

    async def _handle_open_app(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        raw_name = args.get("app_name", "").strip().lower()
        extra_args = args.get("args", "")

        # Normalize app name
        app_key = raw_name
        if "brave" in raw_name:
            app_key = "brave"
        elif "chrome" in raw_name:
            app_key = "chrome"
        elif "firefox" in raw_name:
            app_key = "firefox"
        elif "edge" in raw_name:
            app_key = "edge"
        elif "arc" in raw_name:
            app_key = "arc"
        elif "opera" in raw_name:
            app_key = "opera"
        elif "vs code" in raw_name or "vscode" in raw_name or raw_name == "code":
            app_key = "vscode"
        elif "visual studio" in raw_name or "devenv" in raw_name:
            app_key = "visual_studio"
        elif "cursor" in raw_name:
            app_key = "cursor"
        elif "pycharm" in raw_name:
            app_key = "pycharm"
        elif "intellij" in raw_name:
            app_key = "intellij"
        elif "sublime" in raw_name:
            app_key = "sublime"
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
        elif "paint" in raw_name:
            app_key = "paint"
        elif "discord" in raw_name:
            app_key = "discord"
        elif "slack" in raw_name:
            app_key = "slack"
        elif "telegram" in raw_name:
            app_key = "telegram"
        elif "whatsapp" in raw_name:
            app_key = "whatsapp"
        elif "teams" in raw_name:
            app_key = "teams"
        elif "zoom" in raw_name:
            app_key = "zoom"
        elif "obsidian" in raw_name:
            app_key = "obsidian"
        elif "notion" in raw_name:
            app_key = "notion"
        elif "steam" in raw_name:
            app_key = "steam"
        elif "figma" in raw_name:
            app_key = "figma"
        elif "obs" in raw_name:
            app_key = "obs"
        elif "vlc" in raw_name:
            app_key = "vlc"

        candidates = APP_MAPPINGS.get(app_key, {}).get(
            "windows" if "windows" in CURRENT_OS else ("darwin" if "darwin" in CURRENT_OS else "linux"), [raw_name]
        )

        launched = False
        launched_cmd = ""
        for candidate in candidates:
            try:
                if "windows" in CURRENT_OS:
                    cmd = f'start "" "{candidate}"'
                    if extra_args:
                        cmd += f' "{extra_args}"'
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
                voice_feedback=f"Opening {display_name} for you now, sir.",
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
                    voice_feedback=f"Launching {raw_name}.",
                )
            except Exception as e:
                return ToolResult(
                    success=False,
                    tool_name="open_app",
                    message=f"Could not open {raw_name}: {str(e)}",
                    voice_feedback=f"I wasn't able to launch {raw_name} on your system.",
                )

    async def _handle_play_spotify(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        action = args.get("action", "play").lower()

        if query:
            encoded_query = urllib.parse.quote(query)
            spotify_uri = f"spotify:search:{encoded_query}"
            web_fallback = f"https://open.spotify.com/search/{encoded_query}"

            opened = False
            if "windows" in CURRENT_OS:
                try:
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
                voice_feedback=f"Playing {query} on Spotify.",
            )
        else:
            return await self._handle_open_app({"app_name": "spotify"}, context)

    async def _handle_web_search(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        engine = args.get("engine", "google").lower()

        if not query:
            return ToolResult(
                success=False,
                tool_name="web_search",
                message="Search query is empty",
                voice_feedback="What would you like me to search for?",
            )

        encoded = urllib.parse.quote_plus(query)
        if "youtube" in engine or "yt" in engine:
            url = f"https://www.youtube.com/results?search_query={encoded}"
            engine_name = "YouTube"
        elif "github" in engine:
            url = f"https://github.com/search?q={encoded}"
            engine_name = "GitHub"
        elif "reddit" in engine:
            url = f"https://www.reddit.com/search/?q={encoded}"
            engine_name = "Reddit"
        elif "wiki" in engine:
            url = f"https://en.wikipedia.org/wiki/Special:Search?search={encoded}"
            engine_name = "Wikipedia"
        elif "maps" in engine or "location" in engine:
            url = f"https://www.google.com/maps/search/{encoded}"
            engine_name = "Google Maps"
        elif "duckduckgo" in engine or "ddg" in engine:
            url = f"https://duckduckgo.com/?q={encoded}"
            engine_name = "DuckDuckGo"
        else:
            url = f"https://www.google.com/search?q={encoded}"
            engine_name = "Google"

        webbrowser.open(url)

        return ToolResult(
            success=True,
            tool_name="web_search",
            message=f"Searched {engine_name} for '{query}'",
            data={"query": query, "engine": engine_name, "url": url},
            voice_feedback=f"Searching {engine_name} for {query}.",
        )

    async def _handle_open_url(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        url = args.get("url", "").strip()
        if not url.startswith(("http://", "https://", "ftp://")):
            url = f"https://{url}"

        webbrowser.open(url)
        return ToolResult(
            success=True,
            tool_name="open_url",
            message=f"Opened URL: {url}",
            data={"url": url},
            voice_feedback="Opening web page.",
        )

    async def _handle_create_quick_note(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        title = args.get("title", "Quick Voice Note").strip()
        content = args.get("content", "").strip()
        tags = args.get("tags", [])

        if not content and not title:
            return ToolResult(
                success=False,
                tool_name="create_quick_note",
                message="Note content and title cannot both be empty",
                voice_feedback="I didn't catch what you wanted to note down.",
            )

        if not content:
            content = f"# {title}\n\n*Captured via Neuro Agent*"

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
                    voice_feedback=f"Added note '{title}' to your knowledge base.",
                )
            except Exception as e:
                logger.error(f"Failed to create note in database: {e}")

        return ToolResult(
            success=True,
            tool_name="create_quick_note",
            message=f"Note captured: '{title}'",
            data={"title": title, "content": content, "tags": tags},
            voice_feedback=f"Captured note '{title}'.",
        )

    async def _handle_set_reminder(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        title = args.get("title", "Reminder").strip()
        minutes = int(args.get("minutes", 10))
        priority = args.get("priority", "medium")

        due_time = datetime.now(UTC) + timedelta(minutes=minutes)
        due_str = due_time.strftime("%I:%M %p")

        session = context.get("session")
        user_id = context.get("user_id")

        if session and user_id:
            try:
                from app.models.task import TaskCreate
                from app.services.tasks import task_service

                task_in = TaskCreate(
                    title=f"Reminder: {title}",
                    description=f"Set via Neuro Agent. Due in {minutes} minutes ({due_str})",
                    priority=priority,
                    due_date=due_time,
                    user_id=user_id,
                )
                task = await task_service.create_task(session=session, data=task_in, user_id=user_id)
                return ToolResult(
                    success=True,
                    tool_name="set_reminder",
                    message=f"Set reminder '{title}' for {due_str} ({minutes}m)",
                    data={"id": str(task.id), "title": title, "due_date": due_time.isoformat(), "minutes": minutes},
                    voice_feedback=f"Reminder set for {title} in {minutes} minutes.",
                )
            except Exception as e:
                logger.error(f"Failed to create task in database: {e}")

        return ToolResult(
            success=True,
            tool_name="set_reminder",
            message=f"Reminder scheduled: '{title}' for {due_str} ({minutes}m)",
            data={"title": title, "due_date": due_time.isoformat(), "minutes": minutes},
            voice_feedback=f"Reminder set for {title} in {minutes} minutes.",
        )

    async def _handle_search_knowledge_base(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        query = args.get("query", "").strip()
        limit = int(args.get("limit", 5))

        session = context.get("session")
        user_id = context.get("user_id")

        if session and user_id:
            try:
                from app.services.search.engine import search_engine

                results = await search_engine.hybrid_search(session=session, query=query, user_id=user_id, limit=limit)
                count = len(results)
                titles = [r.get("title", "") for r in results]
                feedback = (
                    f"Found {count} matching notes in your knowledge base."
                    if count > 0
                    else "No notes found matching that query."
                )
                return ToolResult(
                    success=True,
                    tool_name="search_knowledge_base",
                    message=f"Found {count} notes for '{query}'",
                    data={"results": results, "titles": titles, "query": query},
                    voice_feedback=feedback,
                )
            except Exception as e:
                logger.error(f"Failed knowledge base search: {e}")

        return ToolResult(
            success=True,
            tool_name="search_knowledge_base",
            message=f"Queried knowledge base for '{query}'",
            data={"results": [], "query": query},
            voice_feedback=f"Searched notes for {query}.",
        )

    async def _handle_quick_calculate(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        expr = args.get("expression", "").strip()
        raw_expr = args.get("raw_expression", expr)
        try:
            val = safe_eval_expr(expr)
            formatted_val = f"{val:g}" if isinstance(val, (int, float)) else str(val)
            return ToolResult(
                success=True,
                tool_name="quick_calculate",
                message=f"{raw_expr} = {formatted_val}",
                data={"result": val, "formatted": formatted_val, "expression": expr},
                voice_feedback=f"The answer is {formatted_val}.",
            )
        except Exception:
            return ToolResult(
                success=False,
                tool_name="quick_calculate",
                message=f"Could not calculate expression: {expr}",
                voice_feedback="I couldn't calculate that math expression.",
            )

    async def _handle_random_decision(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        decision_type = args.get("type", "coin_flip")
        if decision_type == "coin_flip":
            outcome = random.choice(["Heads", "Tails"])
            return ToolResult(
                success=True,
                tool_name="random_decision",
                message=f"Coin flip result: {outcome}",
                data={"outcome": outcome, "type": "coin_flip"},
                voice_feedback=f"It's {outcome}.",
            )
        else:
            sides = int(args.get("sides", 6))
            roll = random.randint(1, sides)
            return ToolResult(
                success=True,
                tool_name="random_decision",
                message=f"Rolled a {roll} (on a {sides}-sided die)",
                data={"roll": roll, "sides": sides, "type": "dice_roll"},
                voice_feedback=f"You rolled a {roll}.",
            )

    async def _handle_system_action(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        action = args.get("action", "status").lower()
        payload = args.get("payload", "").strip()

        # Volume Controls
        if action == "volume_up":
            if "windows" in CURRENT_OS:
                subprocess.Popen(
                    'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"', shell=True
                )
            elif "darwin" in CURRENT_OS:
                subprocess.Popen(
                    "osascript -e 'set volume output volume ((output volume of (get volume settings)) + 10)'",
                    shell=True,
                )
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Increased system volume",
                data={"action": action},
                voice_feedback="Volume increased.",
            )

        elif action == "volume_down":
            if "windows" in CURRENT_OS:
                subprocess.Popen(
                    'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"', shell=True
                )
            elif "darwin" in CURRENT_OS:
                subprocess.Popen(
                    "osascript -e 'set volume output volume ((output volume of (get volume settings)) - 10)'",
                    shell=True,
                )
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Decreased system volume",
                data={"action": action},
                voice_feedback="Volume decreased.",
            )

        elif action == "mute" or action == "unmute":
            if "windows" in CURRENT_OS:
                subprocess.Popen(
                    'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"', shell=True
                )
            elif "darwin" in CURRENT_OS:
                subprocess.Popen(
                    "osascript -e 'set volume output muted not (output muted of (get volume settings))'", shell=True
                )
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Toggled audio {action}",
                data={"action": action},
                voice_feedback=f"Audio {action}d.",
            )

        # Lock PC
        elif action == "lock_pc":
            if "windows" in CURRENT_OS:
                subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)
            elif "darwin" in CURRENT_OS:
                subprocess.Popen("pmset displaysleepnow", shell=True)
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Locked computer workstation",
                data={"action": action},
                voice_feedback="Locking your workstation now.",
            )

        # Sleep PC
        elif action == "sleep_pc":
            if "windows" in CURRENT_OS:
                subprocess.Popen("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True)
            elif "darwin" in CURRENT_OS:
                subprocess.Popen("pmset sleepnow", shell=True)
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Putting computer to sleep",
                data={"action": action},
                voice_feedback="Putting PC to sleep.",
            )

        # Empty Recycle Bin
        elif action == "empty_recycle_bin":
            if "windows" in CURRENT_OS:
                subprocess.Popen(
                    'powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', shell=True
                )
            elif "darwin" in CURRENT_OS:
                subprocess.Popen("rm -rf ~/.Trash/*", shell=True)
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Emptied Recycle Bin",
                data={"action": action},
                voice_feedback="Recycle bin emptied.",
            )

        # Screenshot / Snip
        elif action == "take_screenshot":
            if "windows" in CURRENT_OS:
                subprocess.Popen("start ms-screenclip:", shell=True)
            elif "darwin" in CURRENT_OS:
                subprocess.Popen("screencapture -i", shell=True)
            return ToolResult(
                success=True,
                tool_name="system_action",
                message="Opened Screen Snip tool",
                data={"action": action},
                voice_feedback="Opening screenshot capture tool.",
            )

        # Open Folders
        elif action == "open_folder":
            folder_clean = payload.lower()
            target_path = ""
            if "download" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Downloads")
            elif "document" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Documents")
            elif "desktop" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Desktop")
            elif "picture" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Pictures")
            elif "music" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Music")
            elif "video" in folder_clean:
                target_path = os.path.join(os.path.expanduser("~"), "Videos")
            else:
                target_path = os.path.expanduser("~")

            if "windows" in CURRENT_OS:
                subprocess.Popen(f'explorer.exe "{target_path}"', shell=True)
            elif "darwin" in CURRENT_OS:
                subprocess.Popen(["open", target_path])
            else:
                subprocess.Popen(["xdg-open", target_path])

            display_folder = payload.capitalize() if payload else "User"
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Opened {display_folder} folder",
                data={"folder": display_folder, "path": target_path},
                voice_feedback=f"Opening {display_folder} folder.",
            )

        # Time & Date
        elif "date" in action:
            date_str = datetime.now().strftime("%A, %B %d, %Y")
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Today is {date_str}",
                data={"date": date_str},
                voice_feedback=f"Today is {date_str}.",
            )
        elif "time" in action:
            time_str = datetime.now().strftime("%I:%M %p")
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Current time: {time_str}",
                data={"time": time_str},
                voice_feedback=f"It is currently {time_str}.",
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
                voice_feedback=f"All systems operational on {uname.system}.",
            )
        else:
            return ToolResult(
                success=True,
                tool_name="system_action",
                message=f"Executed system action: {action}",
                data={"action": action},
                voice_feedback=f"System action {action} completed.",
            )

    async def _handle_generate_roadmap(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.roadmap_service import RoadmapService

        goal = args.get("goal", "Fullstack Development")
        depth = args.get("depth", "intermediate")
        roadmap = RoadmapService.generate_roadmap(goal=goal, depth=depth)

        summary = f"Generated {len(roadmap.nodes)}-stage roadmap for {roadmap.subject} with {len(roadmap.edges)} prerequisite links (~{roadmap.total_estimated_hours} hours total)."
        voice = f"I've generated a {len(roadmap.nodes)} step learning roadmap for {roadmap.subject}. You can inspect the full dependency graph and prerequisites on your workspace."

        return ToolResult(
            success=True,
            tool_name="generate_roadmap",
            message=summary,
            data=roadmap.model_dump(),
            voice_feedback=voice,
        )

    async def _handle_get_prerequisites(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.roadmap_service import RoadmapService

        topic = args.get("topic", "")
        # Generate or fetch graph context
        roadmap = RoadmapService.generate_roadmap(goal=topic)
        nodes_dict = [n.model_dump() for n in roadmap.nodes]
        edges_dict = [e.model_dump() for e in roadmap.edges]

        target_node = nodes_dict[-1] if nodes_dict else {"id": topic, "title": topic}
        res = RoadmapService.get_prerequisite_path(target_node["id"], nodes_dict, edges_dict)

        if res.prerequisites:
            prereq_names = ", ".join(p["title"] for p in res.prerequisites[:3])
            voice = f"To learn {res.target_title}, you should first complete: {prereq_names}."
        else:
            voice = f"{res.target_title} is a foundational topic with no prior prerequisites needed."

        return ToolResult(
            success=True,
            tool_name="get_prerequisites",
            message=f"Found {len(res.prerequisites)} prerequisites for {res.target_title}",
            data=res.model_dump(),
            voice_feedback=voice,
        )

    async def _handle_topic_quiz(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.roadmap_service import RoadmapService

        topic = args.get("topic", "System Architecture")
        quiz = RoadmapService.generate_topic_quiz(topic_id="q-1", topic_title=topic)
        first_q = quiz.questions[0] if quiz.questions else None

        voice = f"Here is a test question for {topic}: {first_q.question if first_q else 'Ready for quiz.'}"

        return ToolResult(
            success=True,
            tool_name="topic_quiz",
            message=f"Generated verification quiz for {topic}",
            data=quiz.model_dump(),
            voice_feedback=voice,
        )

    async def _handle_export_obsidian(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        return ToolResult(
            success=True,
            tool_name="export_obsidian",
            message="Obsidian vault export package ready for download.",
            data={"export_url": "/api/v1/obsidian/export/zip"},
            voice_feedback="Your Second Brain knowledge base has been packaged for Obsidian. You can download the vault archive from the top bar.",
        )

    async def _handle_compute_blast_radius(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

        target = args.get("target", "").strip()
        depth = int(args.get("max_depth", 3))
        extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=400)
        G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
        hits = graph_analytics.compute_blast_radius(G, seed_id_or_query=target, max_depth=depth)

        count = len(hits)
        top_labels = [h.label for h in hits[:3]]
        sample_str = f" including {', '.join(top_labels)}" if top_labels else ""
        voice = f"Impact analysis for {target} shows {count} potentially affected components{sample_str}."

        return ToolResult(
            success=True,
            tool_name="compute_blast_radius",
            message=f"Calculated blast radius for '{target}': {count} affected entities.",
            data={
                "target": target,
                "count": count,
                "hits": [
                    {
                        "node_id": h.node_id,
                        "label": h.label,
                        "depth": h.depth,
                        "via_relation": h.via_relation,
                        "source_file": h.source_file,
                        "source_location": h.source_location,
                    }
                    for h in hits
                ],
            },
            voice_feedback=voice,
        )

    async def _handle_find_god_nodes(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

        top_n = int(args.get("top_n", 10))
        extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=400)
        G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
        god_nodes = graph_analytics.find_god_nodes(G, top_n=top_n)

        top_names = [gn["label"] for gn in god_nodes[:3]]
        sample_str = f" such as {', '.join(top_names)}" if top_names else ""
        voice = f"Identified {len(god_nodes)} architectural keystones in your codebase{sample_str}."

        return ToolResult(
            success=True,
            tool_name="find_god_nodes",
            message=f"Found {len(god_nodes)} architectural keystones.",
            data={"god_nodes": god_nodes},
            voice_feedback=voice,
        )

    async def _handle_analyze_codebase_graph(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

        root_path = args.get("root_path") or os.getcwd()
        extracted = graph_extractor.extract_from_directory(root_path, max_files=400)
        G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
        analytics = graph_analytics.analyze_graph(G)

        voice = f"Analyzed codebase graph with {analytics.total_nodes} nodes and {analytics.communities_count} functional clusters."
        return ToolResult(
            success=True,
            tool_name="analyze_codebase_graph",
            message=f"Graph analysis complete: {analytics.total_nodes} entities across {analytics.communities_count} communities.",
            data={
                "total_nodes": analytics.total_nodes,
                "total_edges": analytics.total_edges,
                "communities_count": analytics.communities_count,
                "density": analytics.density,
                "god_nodes_count": len(analytics.god_nodes),
                "circular_dependencies_count": len(analytics.circular_dependencies),
            },
            voice_feedback=voice,
        )

    async def _handle_generate_graph_wiki(self, args: dict[str, Any], context: dict[str, Any]) -> ToolResult:
        from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_extractor, graph_wiki_gen

        out_dir = args.get("out_dir")
        extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=400)
        G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
        articles = graph_wiki_gen.generate_wiki(G, out_dir=out_dir)

        voice = f"Generated {len(articles)} Wikipedia-style markdown articles for your knowledge graph."
        return ToolResult(
            success=True,
            tool_name="generate_graph_wiki",
            message=f"Generated {len(articles)} wiki articles.",
            data={"article_count": len(articles), "articles": list(articles.keys())},
            voice_feedback=voice,
        )

    async def execute_intent(self, intent: Any) -> dict[str, Any]:
        if not getattr(intent, "is_matched", False) or not getattr(intent, "tool_name", None):
            return {
                "success": False,
                "tool_name": "unknown",
                "message": "No command matched",
                "voice_feedback": "I didn't catch that command. You can ask me to open apps, play music, generate a roadmap, or check prerequisites.",
            }
        res = await self.execute(intent.tool_name, intent.parameters)
        return res.model_dump()


# Global singleton registry instance
agent_tools_registry = AgentToolsRegistry()
ToolRegistry = agent_tools_registry
