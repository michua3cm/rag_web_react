import os
import httpx
import google.genai as genai
from openai import AsyncOpenAI
from .config import logger

gemini_client = None
openrouter_client = None
dms_client = None

try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        gemini_client = genai.Client(api_key=gemini_key)
        logger.info("✓ Gemini client initialized")
    else:
        logger.warning("⚠ GEMINI_API_KEY not set")
except Exception as e:
    logger.error(f"Gemini init failed: {e}")

try:
    open_key = os.getenv("OPENROUTER_API_KEY")
    if open_key:
        openrouter_client = AsyncOpenAI(
            api_key=open_key,
            base_url="https://openrouter.ai/api/v1",
            http_client=httpx.AsyncClient(trust_env=False)
        )
        logger.info("✓ OpenRouter client initialized")
except Exception as e:
    logger.error(f"OpenRouter init failed: {e}")

try:
    dms_key = os.getenv("DMS_API_KEY")
    if dms_key:
        dms_client = AsyncOpenAI(
            api_key=dms_key,
            base_url="https://llmgateway.deltaww.com/v1/",
            http_client=httpx.AsyncClient(trust_env=False)
        )
        logger.info("✓ DMS client initialized")
except Exception as e:
    logger.error(f"DMS init failed: {e}")
