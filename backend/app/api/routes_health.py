from fastapi import APIRouter, Request
from ..core.clients import gemini_client, openrouter_client, dms_client
from ..core.config import get_custom_system_prompt

router = APIRouter(prefix="", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "providers": {
            "gemini": gemini_client is not None,
            "openrouter": openrouter_client is not None,
            "dms": dms_client is not None,
        },
    }


@router.post("/reload_prompt")
async def reload_prompt(request: Request):
    """
    Reload CUSTOM_PROMPT_* from environment and store in app.state.system_prompt,
    so all routers read the fresh value.
    """
    new_prompt = get_custom_system_prompt()
    request.app.state.system_prompt = new_prompt
    return {"status": "已重新載入", "new_prompt": new_prompt}
