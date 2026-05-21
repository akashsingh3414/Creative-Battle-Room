import httpx
import json
from app.services.ai.base import BaseAIProvider, AIProviderError

class GroqProvider(BaseAIProvider):
    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def generate(self, theme: str, prompt: str) -> dict:
        if not self.api_key:
            raise AIProviderError("Groq API key not configured.")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-specdec",
            "messages": [
                {"role": "system", "content": "You are a luxury cyberpunk marketing director. Create a campaign and return ONLY a valid JSON object matching this structure: {\"campaign_name\": \"\", \"tagline\": \"\", \"description\": \"\", \"sensory_notes\": \"\", \"visual_prompt\": \"\"}. Do not include any emojis, stickers, or special icons in any of the fields."},
                {"role": "user", "content": f"Theme: {theme}\nParticipant input: {prompt}"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.8
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
            if response.status_code != 200:
                raise AIProviderError(f"Groq API returned status {response.status_code}: {response.text}")
            
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            return json.loads(raw_content)
