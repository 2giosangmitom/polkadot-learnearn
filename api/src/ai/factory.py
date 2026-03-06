"""AI provider factory.

Call :func:`get_ai_provider` to obtain the singleton :class:`AIProvider`
configured by the application settings.  New providers are registered in
the ``_REGISTRY`` dict — add an entry there to support a new backend.
"""

import functools

from src.ai.provider import AIProvider
from src.config import settings


def _build_gemini() -> AIProvider:
    from src.ai.gemini import GeminiProvider

    return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.AI_MODEL)


# Map of provider name -> lazy builder.
# Add new entries here when integrating additional AI backends.
_REGISTRY: dict[str, callable] = {  # type: ignore[type-arg]
    "gemini": _build_gemini,
}


@functools.lru_cache(maxsize=1)
def get_ai_provider() -> AIProvider:
    """Return the singleton AI provider configured by ``settings.AI_PROVIDER``.

    Raises:
        ValueError: If the configured provider name is not in the registry.
    """
    name = settings.AI_PROVIDER.lower()
    builder = _REGISTRY.get(name)
    if builder is None:
        supported = ", ".join(sorted(_REGISTRY))
        raise ValueError(
            f"Unknown AI provider '{name}'. Supported providers: {supported}"
        )
    return builder()
