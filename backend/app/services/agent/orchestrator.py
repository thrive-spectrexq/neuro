import logging
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.agent.intent_parser import ParsedIntent, intent_parser
from app.services.agent.tools import ToolResult, agent_tools_registry

logger = logging.getLogger(__name__)
settings = get_settings()


class AgentExecutionResult(BaseModel):
    success: bool
    input_text: str
    tool_name: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    tool_result: ToolResult | None = None
    voice_response: str = ""
    display_text: str = ""
    is_offline_native: bool = True
    confidence: float = 1.0


class AgentOrchestrator:
    """
    JARVIS Agent Orchestrator.
    Manages dual-mode execution:
    1. Instant Zero-Key Deterministic OS Tool Calling (Fast Path)
    2. Hybrid LLM Reasoning & Function Calling (When LLM configured)
    """

    def __init__(self):
        self.registry = agent_tools_registry
        self.parser = intent_parser

    async def execute_command(
        self,
        command_text: str,
        context: dict[str, Any] | None = None,
    ) -> AgentExecutionResult:
        if not command_text or not command_text.strip():
            return AgentExecutionResult(
                success=False,
                input_text=command_text,
                voice_response="I'm listening, sir. How can I assist you?",
                display_text="I'm listening. How can I assist you?",
                is_offline_native=True,
            )

        context = context or {}

        # 1. Zero-API-Key Fast Path via Deterministic Intent Parser
        parsed: ParsedIntent = self.parser.parse(command_text)

        if parsed.is_matched and parsed.tool_name:
            logger.info(f"Deterministic intent matched: tool={parsed.tool_name}, args={parsed.parameters}")

            # Special wake acknowledgement
            if parsed.tool_name == "system_action" and parsed.parameters.get("action") == "wake_ack":
                return AgentExecutionResult(
                    success=True,
                    input_text=command_text,
                    tool_name="wake_word",
                    parameters={},
                    voice_response="Yes sir, I am online and listening.",
                    display_text="JARVIS is active and listening...",
                    is_offline_native=True,
                    confidence=1.0,
                )

            tool_res = await self.registry.execute(tool_name=parsed.tool_name, args=parsed.parameters, context=context)

            voice_msg = tool_res.voice_feedback or tool_res.message
            return AgentExecutionResult(
                success=tool_res.success,
                input_text=command_text,
                tool_name=parsed.tool_name,
                parameters=parsed.parameters,
                tool_result=tool_res,
                voice_response=voice_msg,
                display_text=tool_res.message,
                is_offline_native=True,
                confidence=parsed.confidence,
            )

        # 2. Try LLM Provider if available
        try:
            from app.services.ai.provider import get_ai_provider

            provider = get_ai_provider()
            provider_name = provider.__class__.__name__

            if provider_name != "MockAIProvider":
                # Stream or generate response with active LLM
                response_chunks = []
                async for chunk in provider.generate_response_stream(command_text, []):
                    response_chunks.append(chunk)
                full_reply = "".join(response_chunks).strip()

                return AgentExecutionResult(
                    success=True,
                    input_text=command_text,
                    voice_response=full_reply,
                    display_text=full_reply,
                    is_offline_native=False,
                    confidence=0.85,
                )
        except Exception as e:
            logger.warning(f"LLM fallback failed or unavailable: {e}")

        # 3. Default Native Fallback (No keys required)
        fallback_msg = f"I understood: '{command_text}'. You can ask me to open Brave, play songs on Spotify, launch VS Code, add notes, or set reminders."
        return AgentExecutionResult(
            success=True,
            input_text=command_text,
            voice_response="Command received. I can open applications, play Spotify, create notes, or search the web.",
            display_text=fallback_msg,
            is_offline_native=True,
            confidence=0.5,
        )


agent_orchestrator = AgentOrchestrator()
