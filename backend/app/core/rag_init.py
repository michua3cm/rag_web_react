from ..services.rag_core import setup_rag_system
from .config import logger

def initialize_rag():
    try:
        logger.info("🔧 Initializing RAG system...")
        PDF_PATH = "D:/Build_RAG_Locally/DIADesigner-ST-CODE.pdf"
        setup_rag_system(PDF_PATH, force_reload=False)
        logger.info("✓ RAG system initialized")
        return True
    except Exception as e:
        logger.error(f"✗ RAG initialization failed: {e}")
        return False
