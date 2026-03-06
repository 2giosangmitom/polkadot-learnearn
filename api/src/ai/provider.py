"""Abstract base for AI providers.

Every concrete provider must implement :meth:`generate_structured`, which
takes a system prompt, a user prompt, and a Pydantic model describing the
desired output shape, then returns a parsed instance of that model.

Adding a new AI backend (OpenAI, Anthropic, …) only requires subclassing
:class:`AIProvider` — the rest of the application is decoupled.
"""

from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AIProvider(ABC):
    """Protocol that every AI integration must satisfy."""

    @abstractmethod
    async def generate_structured(
        self,
        *,
        system: str,
        prompt: str,
        output_schema: type[T],
    ) -> T:
        """Generate content and parse it into *output_schema*.

        Args:
            system: System-level instruction for the model.
            prompt: User-level prompt describing what to generate.
            output_schema: A Pydantic model class. The provider must
                return a validated instance of this type.

        Returns:
            A parsed instance of *output_schema*.

        Raises:
            AIGenerationError: If the provider fails or returns
                unparseable content.
        """
        ...
