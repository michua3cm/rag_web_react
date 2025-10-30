import os
import logging
from dotenv import load_dotenv

# ---- Logging ----
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ---- Env loading ----
load_dotenv()

def get_custom_system_prompt() -> str:
    parts = [v for k, v in sorted(os.environ.items()) if k.startswith("CUSTOM_PROMPT_")]
    return " ".join(p.strip() for p in parts if p) or \
        "You are a helpful AI assistant that replies in Markdown."
