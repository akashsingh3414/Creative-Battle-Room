import asyncio
import random
import httpx
from app.core.config import settings

class AIProviderError(Exception):
    pass

class AIProvider:
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.force_mock = settings.FORCE_MOCK_AI

    async def generate_creative_campaign(self, theme: str, participant_prompt: str) -> dict:
        """
        Attempts to generate creative copy using the available live APIs.
        Falls back to a highly engaging, procedural cyberpunk campaign generator if no keys are found
        or if an API fails, ensuring the room remains active and playable.
        """
        # Explicitly check for prompt injection or simulated error
        if participant_prompt.strip().lower().startswith("fail"):
            raise AIProviderError("Simulated Generation Failure: The prompt contains a system command that violated safety filters.")

        if self.force_mock:
            return await self._generate_mock_campaign(theme, participant_prompt)

        # 1. Try Groq
        if self.groq_key:
            try:
                return await self._call_groq(theme, participant_prompt)
            except Exception as e:
                print(f"Groq API call failed: {e}. Falling back...")
                
        # 2. Try OpenAI
        if self.openai_key:
            try:
                return await self._call_openai(theme, participant_prompt)
            except Exception as e:
                print(f"OpenAI API call failed: {e}. Falling back...")

        # 3. Try Gemini
        if self.gemini_key:
            try:
                return await self._call_gemini(theme, participant_prompt)
            except Exception as e:
                print(f"Gemini API call failed: {e}. Falling back...")

        # 4. Fallback to rich, procedurally generated mock campaign
        return await self._generate_mock_campaign(theme, participant_prompt)

    async def _call_groq(self, theme: str, prompt: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        system_prompt = self._get_system_prompt(theme, prompt)
        payload = {
            "model": "llama-3.3-70b-specdec",
            "messages": [
                {"role": "system", "content": "You are a luxury cyberpunk marketing director. Create a campaign and return ONLY a valid JSON object matching this structure: {\"campaign_name\": \"\", \"tagline\": \"\", \"description\": \"\", \"sensory_notes\": \"\", \"visual_prompt\": \"\"}"},
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
            import json
            return json.loads(raw_content)

    async def _call_openai(self, theme: str, prompt: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a creative advertising genius. Create a campaign. Return ONLY a valid JSON object: {\"campaign_name\": \"\", \"tagline\": \"\", \"description\": \"\", \"sensory_notes\": \"\", \"visual_prompt\": \"\"}"},
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
            import json
            return json.loads(raw_content)

    async def _call_gemini(self, theme: str, prompt: str) -> dict:
        # Standard fallback if user key setup isn't directly matching the schema
        raise AIProviderError("Gemini client endpoint not fully configured - using procedural mock engine.")

    def _get_system_prompt(self, theme: str, prompt: str) -> str:
        return f"Theme: {theme}\nParticipant Prompt: {prompt}"

    async def _generate_mock_campaign(self, theme: str, prompt: str) -> dict:
        """
        Procedural generator that creates high-fidelity cyberpunk/creative marketing campaigns
        so that local testing feels alive, engaging, and premium.
        """
        # Simulate Network Latency
        await asyncio.sleep(3.5)

        # Parse user prompt words to blend them in
        clean_prompt = prompt.replace("'", "").replace('"', "")
        words = [w for w in clean_prompt.split() if len(w) > 3]
        seed_word = words[0].upper() if words else "CYBER"
        secondary_word = words[1].upper() if len(words) > 1 else "CHROME"

        names = [
            f"LIQUID {seed_word}", f"GLITCH BY {seed_word}", f"{seed_word} X REBEL", 
            f"STATIC NOISE", f"NEON {seed_word}", f"CHROME {seed_word}", f"VOID OF {seed_word}"
        ]
        campaign_name = random.choice(names)

        taglines = [
            f"Breathe the future. Defy the network.",
            f"The ultimate scent for those who operate in the shadows.",
            f"An olfactory simulation of the digital underground.",
            f"When liquid chrome meets the sensory array.",
            f"Glitch your senses. Rewrite your code."
        ]
        tagline = random.choice(taglines)

        cyber_adjectives = ["anti-gravity", "liquid-lithium", "nano-infused", "neon-drenched", "neural-linked", "unmoderated", "holographic"]
        cyber_locations = ["Neo-Shibuya underbelly", "orbiting orbital mega-structures", "the high-density server vaults", "unregistered darknet servers"]
        cyber_scents = ["electric ozone", "synthetic rain", "digital musk", "liquid metal", "burnt solder", "wet pavement", "cyber-leather"]

        adj = random.choice(cyber_adjectives)
        loc = random.choice(cyber_locations)
        sc1, sc2 = random.sample(cyber_scents, 2)

        description = (
            f"Introducing {campaign_name}. A high-end luxury creative concept inspired by '{theme}' "
            f"and built around the concept of '{prompt}'. Designed exclusively for the post-physical generation "
            f"who inhabit the {loc}. Encased in a custom, {adj} glass vial that syncs with "
            f"your neural link, this campaign highlights the raw fusion of organic luxury and digital decay."
        )

        sensory_notes = f"Top notes of {sc1}, middle notes of {sc2}, and a deep, lingering base of warm plastic and digital encryption."

        visual_prompt = (
            f"A close-up shot of a luxurious {adj} perfume bottle emitting soft neon cyan lasers, "
            f"suspended in mid-air inside a dark, rain-soaked alleyway in a cyberpunk city. "
            f"Reflections of pink neon signs illuminate the wet glass. Hyper-detailed, 8k octane render."
        )

        return {
            "campaign_name": campaign_name,
            "tagline": tagline,
            "description": description,
            "sensory_notes": sensory_notes,
            "visual_prompt": visual_prompt
        }

ai_provider = AIProvider()
