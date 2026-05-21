import asyncio
import random
from app.services.ai.base import BaseAIProvider

class MockProvider(BaseAIProvider):
    async def generate(self, theme: str, prompt: str) -> dict:
        await asyncio.sleep(3.5)  # Simulate network latency

        clean_prompt = prompt.replace("'", "").replace('"', "")
        words = [w for w in clean_prompt.split() if len(w) > 3]
        seed_word = words[0].upper() if words else "CYBER"

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
