# 整合後端API + 網頁
import os
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.genai as genai
from google.genai.types import GenerateContentConfig
from openai import AsyncOpenAI
from dotenv import load_dotenv
import httpx

from backend.app.services.rag_core import setup_rag_system, get_rag_chain, stream_answer, DMS_stream_answer, build_prompt, retrieve_context
from backend.app.utils.stream_utils import stream_content

# ==================== 初始化設定 ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv()

# 初始化 FastAPI
app = FastAPI(title="LLM Chatbot Web")

# ADD
try:
    from backend.app.services.st_code_parser_backend import add_st_parser_routes
    add_st_parser_routes(app)
except ImportError as e:
    logger.error(f"ST 解析器匯入失敗: {e}")

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模板設定:確保 templates 資料夾存在
# templates_dir = Path(__file__).parent / "templates"
# templates_dir.mkdir(exist_ok=True)
# templates = Jinja2Templates(directory=str(templates_dir))

# ==================== 全局變數 ====================
# custom_system_prompt = os.getenv("CUSTOM_SYSTEM_PROMPT", "You are a helpful AI assistant.")
prompt_parts = [
    value for key, value in sorted(os.environ.items())
    if key.startswith("CUSTOM_PROMPT_")
]
custom_system_prompt = (
    " ".join(p.strip() for p in prompt_parts if p)
    or "You are a helpful AI assistant that replies in Markdown."
)

# 初始化 Gemini
gemini_client = None
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        gemini_client = genai.Client(api_key=gemini_api_key)
        logger.info("✓ Gemini 客戶端初始化成功")
    else:
        logger.warning("⚠ GEMINI_API_KEY 未設定")
except Exception as e:
    logger.error(f"✗ Gemini 初始化失敗: {e}")

# 初始化 OpenRouter
openrouter_client = None
try:
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_api_key:
        openrouter_http_client = httpx.AsyncClient(trust_env=False)
        openrouter_client = AsyncOpenAI(
            api_key=openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            http_client=openrouter_http_client
        )
        logger.info("✓ OpenRouter 客戶端初始化成功")
    else:
        logger.warning("⚠ OPENROUTER_API_KEY 未設定")
except Exception as e:
    logger.error(f"✗ OpenRouter 初始化失敗: {e}")

# 初始化 DMS
dms_client = None
try:
    dms_api_key = os.getenv("DMS_API_KEY")
    if dms_api_key:
        dms_http_client = httpx.AsyncClient(trust_env=False)
        dms_client = AsyncOpenAI(
            api_key=dms_api_key,
            base_url="https://llmgateway.deltaww.com/v1/",
            http_client=dms_http_client
        )
        logger.info("✓ DMS 客戶端初始化成功")
except Exception as e:
    logger.error(f"✗ DMS 初始化失敗: {e}")

# ==================== 請求模型 ====================
class ChatRequest(BaseModel):
    message: str
    provider: str = "gemini"
    model: str = "gemini-2.0-flash"
    temperature: float = 0.7
    max_tokens: int = 2000

# ==================== 網頁路由 ====================
# @app.get("/", response_class=HTMLResponse)
# async def index(request: Request):
#     """主頁面"""
#     return templates.TemplateResponse("index.html", {"request": request})

# ==================== API 端點 ====================

# 1. Gemini 原生串流（不使用 RAG）
@app.get("/gemini_native_stream")
async def gemini_native_stream(question: str):
    """直接發送問題給 Gemini"""
    async def event_generator():
        if not gemini_client:
            yield "data: [錯誤] Gemini 服務未初始化\n\n"
            return
            
        try:
            logger.info(f"Gemini 原生問題: {question}")
           
            config = GenerateContentConfig(
                max_output_tokens=2000,
                temperature=0.7
            )
           
            contents = [custom_system_prompt, question]
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
   
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 第2段好像本來就沒有用RAG，所以我的第2段才是本來的Gemini_native
# FIXME: 重寫一段有加入RAG的 
# 初始化 RAG 系統
RAG_ENABLED = False
try:
    logger.info("🔧 初始化 RAG 檢索系統...")
    PDF_PATH = "D:/Build_RAG_Locally/DIADesigner-ST-CODE.pdf"
    setup_rag_system(PDF_PATH, force_reload=False)
    RAG_ENABLED = True
    logger.info("✓ RAG 檢索系統初始化成功")
except Exception as e:
    logger.error(f"✗ RAG 初始化失敗: {e}")
    
# 2. Gemini 串流（支援自訂提示）
@app.get("/gemini_stream")
async def gemini_stream(question: str, request: Request, use_rag: bool = True):
    """Gemini 串流（支援 RAG）"""
    async def event_generator():
        if not gemini_client:
            yield "data: [錯誤] Gemini 服務未初始化\n\n"
            return
       
        try:
            logger.info(f"Gemini 問題 (RAG={use_rag and RAG_ENABLED}): {question}")
           
            # RAG 檢索
            if use_rag and RAG_ENABLED:
                try:
                    ctx, sources = retrieve_context(question, k=5, max_chars=8000)
                    sources_label = "\n".join([f"[S{i+1}] {src}" for i, src in enumerate(sources)])
                    rag_prompt = build_prompt(question, ctx, sources_label)
                    contents = [custom_system_prompt, rag_prompt]
                    logger.info(f"✓ 使用 RAG，檢索到 {len(sources)} 個文件")
                except Exception as e:
                    logger.warning(f"RAG 檢索失敗: {e}，使用原始問題")
                    contents = [custom_system_prompt, question]
            else:
                contents = [custom_system_prompt, question]
            
            # Gemini 串流
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
   
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 3. OpenRouter 串流
@app.get("/openrouter_stream")
async def openrouter_stream(question: str):
    """OpenRouter 串流"""
    async def event_generator():
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
                    {"role": "system", "content": custom_system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=0.7,
                max_tokens=2000,
                stream=True
            )

            async for line in stream_content(response, "openrouter"):
                yield line

        except Exception as e:
            logger.error(f"OpenRouter 串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"
   
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 4. DMS 串流
@app.get("/dms_stream")
async def dms_stream(question: str):
    """DMS 串流"""
    async def event_generator():
        if not dms_client:
            yield "data: [錯誤] DMS 服務未初始化\n\n"
            return
        
        try:
            logger.info(f"DMS 問題: {question}")
           
            response = await dms_client.chat.completions.create(
                model="openai/Qwen/Qwen3-Next-80B-A3B-Instruct",
                messages=[
                    {"role": "system", "content": custom_system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=0.7,
                max_tokens=8192,
                presence_penalty=1.5,
                stream=True
            )

            async for line in stream_content(response, "dms"):
                yield line

        except Exception as e:
            logger.error(f"DMS 串流錯誤: {e}")
            yield f"data: [錯誤] {str(e)}\n\n"
   
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 5. 統一 POST 端點（支援 JSON 請求）
@app.post("/chat")
async def chat(request: ChatRequest):
    """統一聊天端點（POST）"""
    try:
        provider = request.provider.lower()
        
        if provider == "gemini":
            async def generate_gemini():
                if not gemini_client:
                    yield "錯誤: Gemini 未初始化".encode("utf-8")
                    return
               
                try:
                    config = GenerateContentConfig(
                        max_output_tokens=request.max_tokens,
                        temperature=request.temperature
                    )
                    contents = [custom_system_prompt, request.message]
                    response_stream = await gemini_client.aio.models.generate_content_stream(
                        model=request.model,
                        contents=contents,
                        config=config
                    )
                   
                    async for chunk in response_stream:
                        if chunk.text:
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
                        model=request.model,
                        messages=[
                            {"role": "system", "content": custom_system_prompt},
                            {"role": "user", "content": request.message}
                        ],
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        stream=True
                    )
                   
                    async for chunk in response:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content.encode("utf-8")
                except Exception as e:
                    yield f"錯誤: {str(e)}".encode("utf-8")
           
            return StreamingResponse(generate_openrouter(), media_type="text/plain")
       
        else:
            raise HTTPException(status_code=400, detail=f"不支援的提供者: {provider}")
   
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 工具端點 ====================
@app.get("/health")
async def health_check():
    """健康檢查"""
    return {
        "status": "ok",
        "providers": {
            "gemini": gemini_client is not None,
            "openrouter": openrouter_client is not None,
            "dms": dms_client is not None
        }
    }

@app.post("/reload_prompt")
async def reload_prompt():
    """重新載入系統提示"""
    global custom_system_prompt
    load_dotenv(override=True)
    # custom_system_prompt = os.getenv("CUSTOM_SYSTEM_PROMPT", "You are a helpful AI assistant.")
    prompt_parts = [
        value for key, value in sorted(os.environ.items())
        if key.startswith("CUSTOM_PROMPT_")
    ]
    custom_system_prompt = (
        " ".join(p.strip() for p in prompt_parts if p)
        or "You are a helpful AI assistant that replies in Markdown."
    )
    return {
        "status": "已重新載入",
        "new_prompt": custom_system_prompt
    }

# ==================== 啟動 ====================
if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("  LLM Chatbot 伺服器啟動中...")
    print("=" * 60)
    print(f"  網頁介面: http://localhost:8001")
    print(f"  API 文檔: http://localhost:8001/docs")
    print("=" * 60 + "\n")
   
    uvicorn.run(app, host="0.0.0.0", port=8888, log_level="info")

