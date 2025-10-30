from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini"          # "gemini" | "openrouter" | "dms"
    model: str = "gemini-2.0-flash"
    temperature: float = 0.7
    max_tokens: int = 2000
