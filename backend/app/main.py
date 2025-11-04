from pathlib import Path
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import logger
from .core.rag_init import initialize_rag
from .api.routes_chat import router as chat_router
from .api.routes_health import router as health_router
from .services.st_code_parser_backend import add_st_parser_routes

def create_app() -> FastAPI:
    app = FastAPI(title="LLM Chatbot Web")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
    CACHE_DIR = (BASE_DIR / "cache").resolve()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # templates/static
    app.mount("/cache", StaticFiles(directory=str(CACHE_DIR)), name="cache")
    # app.state.templates = Jinja2Templates(directory="backend/templates")

    # Routers
    app.include_router(chat_router)
    app.include_router(health_router)
    add_st_parser_routes(app)

    # Optional: init RAG
    initialize_rag()

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn

    # 讀 .env（預設讀當前工作目錄的 .env；你放根目錄就從那裡啟動，或自行指定路徑）
    load_dotenv()  # 如需指定路徑：load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8888"))

    print("\n" + "=" * 60)
    print("  LLM Chatbot 伺服器啟動中...")
    print("=" * 60)
    print(f"  API 文檔: http://localhost:{PORT}/docs")
    print("=" * 60 + "\n")

    # 用「字串模組路徑」啟動，reload 才會監聽檔案變更
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        log_level="info",
        reload=True,
    )
