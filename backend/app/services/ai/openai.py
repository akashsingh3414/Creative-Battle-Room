import httpx
import json
from app.services.ai.base import BaseAIProvider, AIProviderError

class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def generate(self, theme: str, prompt: str) -> dict:
        if not self.api_key:
            raise AIProviderError("OpenAI API key not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a creative advertising genius. Create a campaign. Return ONLY a valid JSON object: {\"campaign_name\": \"\", \"tagline\": \"\", \"description\": \"\", \"sensory_notes\": \"\", \"visual_prompt\": \"\"}. Do not include any emojis, stickers, or special icons in any of the fields."},
                {"role": "user", "content": f"Theme: {theme}\nParticipant input: {prompt}"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.8
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            if response.status_code != 200:
                raise AIProviderError(f"OpenAI API returned status {response.status_code}")
            
            result = response.json()
            raw_content = result["choices"][0]["message"]["content"]
            return json.loads(raw_content)
