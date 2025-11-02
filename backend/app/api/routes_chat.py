from typing import AsyncIterator, Tuple
import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from google.genai.types import GenerateContentConfig

from .schemas import ChatRequest
from ..core.config import logger
from ..core.clients import gemini_client, openrouter_client, dms_client
from ..services.rag_core import build_prompt, retrieve_context
from ..utils.stream_utils import stream_content

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}

router = APIRouter(prefix="", tags=["chat"])  # keep same paths as before

# ---------- helpers ----------
def get_prompt_from_app(request: Request) -> str:
    # app.state.system_prompt is set in app/main.py at startup and can be reloaded
    return getattr(request.app.state, "system_prompt", "You are a helpful AI assistant that replies in Markdown.")

def is_rag_enabled(request: Request) -> bool:
    return bool(getattr(request.app.state, "RAG_ENABLED", False))


# ---------- 1) Gemini native stream (no RAG) ----------
@router.get("/gemini_native_stream")
async def gemini_native_stream(question: str, request: Request) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        if not gemini_client:
            yield "data: [錯誤] Gemini 服務未初始化\n\n"
            return

        try:
            logger.info(f"Gemini 原生問題: {question}")
            config = GenerateContentConfig(max_output_tokens=2000, temperature=0.7)
            contents = [get_prompt_from_app(request), question]

            response_stream = await gemini_client.aio.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=contents,
                config=config
            )

            async for line in stream_content(response_stream, "gemini"):
                yield line

        except Exception as e:
            logger.error(f"Gemini 原生串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS
    )


# ---------- 2) Gemini stream (optional RAG) ----------
@router.get("/gemini_stream")
async def gemini_stream(question: str, request: Request, use_rag: bool = True) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        if not gemini_client:
            yield "data: [錯誤] Gemini 服務未初始化\n\n"
            return

        try:
            use_rag_now = use_rag and is_rag_enabled(request)
            logger.info(f"Gemini 問題 (RAG={use_rag_now}): {question}")

            contents = [get_prompt_from_app(request), question]

            if use_rag_now:
                try:
                    ctx, sources = retrieve_context(question, k=5, max_chars=8000)
                    sources_label = "\n".join([f"[S{i+1}] {src}" for i, src in enumerate(sources)])
                    rag_prompt = build_prompt(question, ctx, sources_label)
                    contents = [get_prompt_from_app(request), rag_prompt]
                    logger.info(f"✓ 使用 RAG，檢索到 {len(sources)} 個文件")
                except Exception as e:
                    logger.warning(f"RAG 檢索失敗: {e}，使用原始問題")

            config = GenerateContentConfig(max_output_tokens=2000, temperature=0.7)
            response_stream = await gemini_client.aio.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=contents,
                config=config
            )

            async for line in stream_content(response_stream, "gemini"):
                yield line

        except Exception as e:
            logger.error(f"Gemini 串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS
    )


# ---------- 3) OpenRouter stream ----------
@router.get("/openrouter_stream")
async def openrouter_stream(question: str, request: Request) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        if not openrouter_client:
            yield "data: [錯誤] OpenRouter 服務未初始化\n\n"
            return

        try:
            logger.info(f"OpenRouter 問題: {question}")
            response = await openrouter_client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": os.getenv("REACT_APP_API_SERVER"),
                    "X-Title": "LLM Chatbot",
                },
                model="qwen/qwen3-235b-a22b:free",
                messages=[
                    {"role": "system", "content": get_prompt_from_app(request)},
                    {"role": "user", "content": question},
                ],
                temperature=0.7,
                max_tokens=2000,
                stream=True,
            )

            async for line in stream_content(response, "openrouter"):
                yield line

        except Exception as e:
            logger.error(f"OpenRouter 串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS
    )


# ---------- 4) DMS stream ----------
@router.get("/dms_stream")
async def dms_stream(question: str, request: Request) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        if not dms_client:
            yield "data: [錯誤] DMS 服務未初始化\n\n"
            return

        try:
            logger.info(f"DMS 問題: {question}")
            response = await dms_client.chat.completions.create(
                model="openai/Qwen/Qwen3-Next-80B-A3B-Instruct",
                messages=[
                    {"role": "system", "content": get_prompt_from_app(request)},
                    {"role": "user", "content": question},
                ],
                temperature=0.7,
                max_tokens=8192,
                presence_penalty=1.5,
                stream=True,
            )

            async for line in stream_content(response, "dms"):
                yield line

        except Exception as e:
            logger.error(f"DMS 串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS
    )


# ---------- 5) Unified POST /chat ----------
@router.post("/chat")
async def chat(request_body: ChatRequest, request: Request) -> StreamingResponse:
    provider = request_body.provider.lower()

    if provider == "gemini":
        async def generate_gemini():
            if not gemini_client:
                yield "錯誤: Gemini 未初始化".encode("utf-8")
                return
            try:
                config = GenerateContentConfig(
                    max_output_tokens=request_body.max_tokens,
                    temperature=request_body.temperature,
                )
                contents = [get_prompt_from_app(request), request_body.message]
                response_stream = await gemini_client.aio.models.generate_content_stream(
                    model=request_body.model,
                    contents=contents,
                    config=config,
                )
                async for chunk in response_stream:
                    if getattr(chunk, "text", None):
                        yield chunk.text.encode("utf-8")
            except Exception as e:
                yield f"錯誤: {str(e)}".encode("utf-8")

        return StreamingResponse(generate_gemini(), media_type="text/plain")

    elif provider == "openrouter":
        async def generate_openrouter():
            if not openrouter_client:
                yield "錯誤: OpenRouter 未初始化".encode("utf-8")
                return
            try:
                response = await openrouter_client.chat.completions.create(
                    extra_headers={
                        "HTTP-Referer": "http://localhost:8888",
                        "X-Title": "LLM Chatbot",
                    },
                    model=request_body.model,
                    messages=[
                        {"role": "system", "content": get_prompt_from_app(request)},
                        {"role": "user", "content": request_body.message},
                    ],
                    temperature=request_body.temperature,
                    max_tokens=request_body.max_tokens,
                    stream=True,
                )
                async for chunk in response:
                    delta = getattr(chunk.choices[0].delta, "content", None)
                    if delta:
                        yield delta.encode("utf-8")
            except Exception as e:
                yield f"錯誤: {str(e)}".encode("utf-8")

        return StreamingResponse(generate_openrouter(), media_type="text/plain")

    elif provider == "dms":
        async def generate_dms():
            if not dms_client:
                yield "錯誤: DMS 未初始化".encode("utf-8")
                return
            try:
                response = await dms_client.chat.completions.create(
                    model=request_body.model,
                    messages=[
                        {"role": "system", "content": get_prompt_from_app(request)},
                        {"role": "user", "content": request_body.message},
                    ],
                    temperature=request_body.temperature,
                    max_tokens=request_body.max_tokens,
                    stream=True,
                )
                async for chunk in response:
                    delta = getattr(chunk.choices[0].delta, "content", None)
                    if delta:
                        yield delta.encode("utf-8")
            except Exception as e:
                yield f"錯誤: {str(e)}".encode("utf-8")

        return StreamingResponse(generate_dms(), media_type="text/plain")

    else:
        raise HTTPException(status_code=400, detail=f"不支援的提供者: {provider}")
