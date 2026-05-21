from app.core.config import settings
from app.services.ai.base import AIProviderError
from app.services.ai.groq import GroqProvider
from app.services.ai.openai import OpenAIProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.mock import MockProvider

class AIProviderOrchestrator:
    """
    Orchestrates the AI creative generation loop by sequentially trying active 
    live providers (Groq, OpenAI, Gemini) and using a procedural mock engine as a terminal fallback.
    """
    def __init__(self):
        # 1. Initialize Concrete Providers using configured environment variables
        self.groq = GroqProvider(settings.GROQ_API_KEY)
        self.openai = OpenAIProvider(settings.OPENAI_API_KEY)
        self.gemini = GeminiProvider(settings.GEMINI_API_KEY)
        self.mock = MockProvider()

        # Define priority execution cascade
        self.active_cascade = [self.groq, self.openai, self.gemini]
        self.force_mock = settings.FORCE_MOCK_AI

    async def generate_creative_campaign(self, theme: str, participant_prompt: str) -> dict:
        """
        Public endpoint used by the background worker. Checks for prompt safety rules 
        and runs the cascading fallback loop across all active providers.
        """
        # Pre-execution safety check
        if participant_prompt.strip().lower().startswith("fail"):
            raise AIProviderError("Simulated Generation Failure: Safety filters intercepted input.")

        # 1. If force mock is enabled, bypass external calls completely
        if self.force_mock:
            print("Orchestrator: Force Mock enabled. Routing to MockProvider...")
            return await self.mock.generate(theme, participant_prompt)

        # 2. Iterate sequentially over live providers in order of priority
        for provider in self.active_cascade:
            provider_name = provider.__class__.__name__
            try:
                print(f"Orchestrator: Attempting generation via {provider_name}...")
                return await provider.generate(theme, participant_prompt)
            except Exception as e:
                print(f"Orchestrator: {provider_name} failed: {e}. Cascading...")

        # 3. Terminal Safety Net
        print("Orchestrator: All configured live providers failed. Triggering procedural MockProvider backup...")
        return await self.mock.generate(theme, participant_prompt)


# Export standard singleton orchestrator instance
ai_provider = AIProviderOrchestrator()
