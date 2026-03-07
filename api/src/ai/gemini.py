"""Google Gemini AI provider using the ``google-genai`` SDK."""

import json
import logging
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from src.ai.provider import AIProvider

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(AIProvider):
    """AI provider backed by Google Gemini (``google-genai`` SDK).

    Uses the async client (``client.aio``) so it integrates naturally
    with the FastAPI async stack.
    """

    def __init__(self, *, api_key: str, model: str = "gemini-2.5-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def generate_structured(
        self,
        *,
        system: str,
        prompt: str,
        output_schema: type[T],
    ) -> T:
        """Call Gemini with structured JSON output and parse into *output_schema*."""
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_schema=output_schema,
            ),
        )

        raw_text = response.text
        if raw_text is None:
            raise RuntimeError("Gemini returned an empty response.")

        logger.debug("Gemini raw response: %s", raw_text)

        # Parse the JSON string into the Pydantic model
        parsed = json.loads(raw_text)
        return output_schema.model_validate(parsed)
