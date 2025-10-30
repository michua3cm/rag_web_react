from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

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
    print("\n" + "=" * 60)
    print("  LLM Chatbot 伺服器啟動中...")
    print("=" * 60)
    print("  API 文檔: http://localhost:8888/docs")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8888, log_level="info")
