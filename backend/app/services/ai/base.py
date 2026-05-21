from abc import ABC, abstractmethod

class AIProviderError(Exception):
    """Unified exception class for all AI provider integration and validation failures."""
    pass

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate(self, theme: str, prompt: str) -> dict:
        """Enforces a clean contract for all creative copywriting campaign generators."""
        pass
