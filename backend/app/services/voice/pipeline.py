import os
import asyncio
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
try:
    from pipecat.processors.aggregators.llm_response import LLMUserContextAggregator, LLMAssistantContextAggregator
except ImportError:
    try:
        from pipecat.processors.aggregators.llm_response_universal import LLMUserAggregator as LLMUserContextAggregator, LLMAssistantAggregator as LLMAssistantContextAggregator
    except ImportError:
        class LLMUserContextAggregator:
            def __init__(self, *args, **kwargs): pass
        class LLMAssistantContextAggregator:
            def __init__(self, *args, **kwargs): pass
try:
    from pipecat.transports.network.websocket_server import WebsocketServerTransport, WebsocketServerParams
except ImportError:
    try:
        from pipecat.transports.websocket.fastapi import FastAPIWebsocketTransport as WebsocketServerTransport, FastAPIWebsocketParams as WebsocketServerParams
    except ImportError:
        try:
            from pipecat.transports.websocket.server import WebsocketServerTransport, WebsocketServerParams
        except ImportError:
            class WebsocketServerTransport: pass
            class WebsocketServerParams: pass

# From tools.py we get the tools 
from app.services.voice.tools import VOICE_TOOLS, VOICE_FUNCTIONS
from app.services.ai.provider import get_ai_provider

class GoogleSafeMessage(dict):
    def __init__(self, role, content):
        super().__init__(role=role, content=content)
        self.role = role
        self.content = content
    def to_json_dict(self):
        return {"role": self.role, "parts": [{"text": self.content}]}

class GoogleSafeContext:
    def __init__(self, messages=None):
        self.messages = [GoogleSafeMessage(m['role'], m['content']) for m in messages] if messages else []
        self.tools = VOICE_TOOLS
        self.tool_choice = "auto"
    def add_message(self, message):
        if isinstance(message, dict):
            self.messages.append(GoogleSafeMessage(message.get("role", "user"), message.get("content", "")))
        elif hasattr(message, "text"):
            self.messages.append(GoogleSafeMessage("user", message.text))
    def get_messages(self, *args, **kwargs): return self.messages
    def get_messages_for_token_count(self): return self.messages
    def clear(self): self.messages = []

async def run_voice_pipeline(websocket):
    """
    Run the Pipecat voice pipeline attached to a FastAPI websocket.
    """
    # Configure Transport using the existing websocket connection
    transport = WebsocketServerTransport(
        websocket=websocket,
        params=WebsocketServerParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
        )
    )

    # API Keys
    openai_key = os.getenv("OPENAI_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "")

    # STT
    stt = OpenAISTTService(
        api_key=openai_key,
        model="whisper-1",
    )

    # LLM
    llm = GoogleLLMService(
        api_key=google_key,
        model="gemini-2.5-flash",
    )
    
    # Register functions to the LLM
    for name, func in VOICE_FUNCTIONS.items():
        llm.register_function(name, func)

    # TTS
    tts = OpenAITTSService(
        api_key=openai_key,
        voice="nova",
        model="gpt-4o-mini-tts",
        sample_rate=24000,
    )

    # Personality
    system_prompt = (
        "You are Neuro, a tactical support AI built to manage the user's local knowledge base. "
        "Be concise, extremely sharp, and focus on situational awareness. "
        "You can search the knowledge base and create notes. "
        "Prioritize clear data over polite formalities. "
        "Do not offer to do something, just do it if you have the tool."
    )
    context = GoogleSafeContext([{"role": "system", "content": system_prompt}])
    user_agg = LLMUserContextAggregator(context)
    assistant_agg = LLMAssistantContextAggregator(context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        user_agg,
        llm,
        tts,
        transport.output(),
        assistant_agg,
    ])

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))
    runner = PipelineRunner()

    await runner.run(task)
