from fastapi import APIRouter
from ..services.rag_core import run_rag  # example import

router = APIRouter(prefix="/api")

@router.get("/ping")
def ping():
    return {"ok": True}

@router.get("/rag")
def rag_endpoint(q: str):
    # wire your service here
    return {"answer": run_rag(q)}
