from app.services.ai.base import BaseAIProvider, AIProviderError

class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def generate(self, theme: str, prompt: str) -> dict:
        raise AIProviderError("Gemini client endpoint not fully configured - using fallback path.")
