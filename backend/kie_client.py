import httpx
from typing import Optional, List
from urllib.parse import urljoin

import config

class KIEClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = config.KIE_BASE_URL

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate_video(self, prompt: str, model: str = "kling-2.5-turbo", aspect_ratio: str = "9:16", resolution: str = "720p", num_videos: int = 1):
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                urljoin(self.base_url, "/api/v1/video/generate"),
                headers=self._headers(),
                json={"prompts": [prompt], "model": model, "aspect_ratio": aspect_ratio, "resolution": resolution, "num_videos": num_videos},
            )
            return r.json()

    async def generate_image(self, prompt: str, model: str = "flux-kontext-pro", aspect_ratio: str = "9:16", num_images: int = 1):
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                urljoin(self.base_url, "/api/v1/image/generate"),
                headers=self._headers(),
                json={"prompt": prompt, "model": model, "aspect_ratio": aspect_ratio, "num_images": num_images},
            )
            return r.json()

    async def chat_completion(self, messages: list, model: str = "gpt-5.2"):
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                urljoin(self.base_url, "/api/v1/chat/completion"),
                headers=self._headers(),
                json={"model": model, "messages": messages, "stream": False},
            )
            return r.json()

    async def check_video_status(self, task_ids: List[str]):
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(urljoin(self.base_url, "/api/v1/video/status"), headers=self._headers(), json={"task_ids": task_ids})
            return r.json()

    async def check_image_status(self, task_ids: List[str]):
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(urljoin(self.base_url, "/api/v1/image/status"), headers=self._headers(), json={"task_ids": task_ids})
            return r.json()

    async def get_credits(self):
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(urljoin(self.base_url, "/api/v1/chat/credit"), headers=self._headers())
            return r.json()
