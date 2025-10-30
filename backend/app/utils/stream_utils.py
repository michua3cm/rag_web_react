# stream_utils.py
from typing import Callable, AsyncIterable, Any, Optional
import logging

logger = logging.getLogger(__name__)

TextExtractor = Callable[[Any], Optional[str]]

# Optional: built-in extractors by provider key
EXTRACTORS: dict[str, TextExtractor] = {
    # OpenRouter / OpenAI-compatible
    "openrouter": lambda c: getattr(getattr(c.choices[0], "delta", None), "content", None),
    "openai":     lambda c: getattr(getattr(c.choices[0], "delta", None), "content", None),
    # Gemini (google.generativeai/google.genai streaming chunk)
    "gemini":     lambda c: getattr(c, "text", None),
    # DMS (messages stream event; adjust if your client differs)
    "dms":        lambda c: (
                            getattr(getattr(c.choices[0], "delta", None), "content", None)
                            or getattr(getattr(c.choices[0], "delta", None), "reasoning_content", None)
                        )
}

def get_extractor(provider: str) -> TextExtractor:
    try:
        return EXTRACTORS[provider.lower()]
    except KeyError:
        raise ValueError(f"Unknown provider '{provider}'. Provide a custom extractor.")

async def stream_content(
    response: AsyncIterable[Any],
    provider: str
):
    """
    Convert an async LLM chunk stream to Server-Sent Events (SSE).
    Yields: 'data: <line>\\n' per line, blank line between events, and final [DONE].
    """
    get_text = get_extractor(provider)

    full_reply = ""
    async for chunk in response:
        try:
            text = get_text(chunk) or ""
        except Exception:
            text = ""  # ignore malformed chunks

        if not text: continue

        print(text, flush=True)

        # normalize newlines
        content = text.replace("\r\n", "\n").replace("\r", "\n")
        if content != "":
            for line in content.split("\n"):
                yield f"data: {line}\n"
            yield "\n"  # SSE event delimiter
            full_reply += text

    yield "data: [DONE]\n\n"
    print("[A] [DONE]", flush=True)
    logger.info("Streaming completed. Output length: %d", len(full_reply))


