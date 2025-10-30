import os
import pickle
from pathlib import Path
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import warnings
warnings.filterwarnings("ignore")

from dotenv import load_dotenv
from docling.document_converter import DocumentConverter
from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_ollama import OllamaEmbeddings
import faiss
from langchain_community.docstore.in_memory import InMemoryDocstore
# from langchain import hub

import sys
import hashlib
import openai
from typing import List, Tuple

# 全局變量存儲 RAG 鏈
rag_chain = None
retriever = None

# Environment setup
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True' # 允許重複加載相同的庫文件
warnings.filterwarnings("ignore") # 忽略所有 Python 警告訊息
load_dotenv() # 從 .env 文件加載環境變數到系統環境中

# Terry .....................
def get_cache_path(file_path, suffix):
    print("get_cache_path ...... 生成基於文件內容的緩存路徑")
    # 使用文件路徑和內容生成唯一哈希值
    # file_hash = hashlib.md5(Path(file_path).read_bytes()).hexdigest()
    file_path_1 = "D:/Build_RAG_Locally/DIADesigner-ST-CODE.pdf"
    file_hash = hashlib.md5(Path(file_path_1).read_bytes()).hexdigest()
    return f"cache/{file_hash}_{suffix}.pkl"

def save_vector_store(vector_store, file_path):
    print("save_vector_store ...... 保存向量庫到文件")
    """
    cache_path = get_cache_path(file_path, "vector_store")
    Path("cache").mkdir(exist_ok=True)
    with open(cache_path, 'wb') as f:
        pickle.dump(vector_store, f)
    print(f"向量庫已保存到: {cache_path}")
    """
    cache_path = get_cache_path(file_path, "vector_store").replace('.pkl', '')
    Path("cache").mkdir(exist_ok=True)
    vector_store.save_local(cache_path)
    print(f"向量庫已保存到: {cache_path}")

def load_vector_store(file_path):
    print("load_vector_store ...... 從文件加載向量庫")
    """
    cache_path = get_cache_path(file_path, "vector_store")
    if Path(cache_path).exists():
        with open(cache_path, 'rb') as f:
            return pickle.load(f)
    return None
    """
    from langchain_community.vectorstores import FAISS
    from langchain_ollama import OllamaEmbeddings
   
    cache_path = get_cache_path(file_path, "vector_store").replace('.pkl', '')
   
    if Path(f"{cache_path}/index.faiss").exists():
        try:
            embeddings = OllamaEmbeddings(model='nomic-embed-text', base_url="http://localhost:11434")
            return FAISS.load_local(cache_path, embeddings, allow_dangerous_deserialization=True)
        except Exception as e:
            print(f"加載向量庫錯誤: {e}")
            return None
    return None

def save_retriever(retriever, file_path):
    print("save_retriever ...... 保存檢索器到文件")
    """
    cache_path = get_cache_path(file_path, "retriever")
    Path("cache").mkdir(exist_ok=True)
    with open(cache_path, 'wb') as f:
        pickle.dump(retriever, f)
    print(f"檢索器已保存到: {cache_path}")
    """
    """保存檢索器配置（只保存配置信息）"""
    cache_path = get_cache_path(file_path, "retriever_config")
    Path("cache").mkdir(exist_ok=True)
   
    # 只保存可序列化的配置信息
    config = {
        'search_type': retriever.search_type,
        'search_kwargs': retriever.search_kwargs
        # 注意：不保存整個retriever對象，只保存配置
    }
   
    with open(cache_path, 'wb') as f:
        pickle.dump(config, f)
    print(f"檢索器配置已保存到: {cache_path}")

def save_retriever_config(retriever, file_path):
    print("save_retriever_config ...... 保存檢索器配置信息")
    cache_path = get_cache_path(file_path, "retriever_config")
    Path("cache").mkdir(exist_ok=True)
   
    try:
        # 提取可序列化的配置參數
        config = {
            'search_type': str(retriever.search_type),  # 確保是字符串
            'search_kwargs': dict(retriever.search_kwargs) if retriever.search_kwargs else {'k': 3},
            'tags': list(retriever.tags) if hasattr(retriever, 'tags') else [],
            'metadata': dict(retriever.metadata) if hasattr(retriever, 'metadata') else {}
        }
       
        with open(cache_path, 'wb') as f:
            pickle.dump(config, f)
        print(f"✓ 檢索器配置已保存: {cache_path}")
        return True
       
    except Exception as e:
        print(f"✗ 保存檢索器配置失敗: {e}")
        return False
   
def load_retriever_config(vector_store, file_path):
    print("load_retriever_config ...... 加載檢索器配置並重新創建")
    cache_path = get_cache_path(file_path, "retriever_config")
   
    if not Path(cache_path).exists():
        print("ℹ️ 沒有找到保存的檢索器配置，使用默認設置")
        return vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={'k': 3}
        )
   
    try:
        with open(cache_path, 'rb') as f:
            config = pickle.load(f)
       
        # 重新創建檢索器
        retriever = vector_store.as_retriever(
            search_type=config.get('search_type', 'mmr'),
            search_kwargs=config.get('search_kwargs', {'k': 3})
        )
       
        # 恢復其他屬性（如果存在）
        if hasattr(retriever, 'tags') and 'tags' in config:
            retriever.tags = config['tags']
        if hasattr(retriever, 'metadata') and 'metadata' in config:
            retriever.metadata = config['metadata']
           
        print("✓ 檢索器配置加載成功")
        return retriever
       
    except Exception as e:
        print(f"✗ 加載檢索器配置失敗: {e}")
        # 失敗時返回默認檢索器
        return vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={'k': 3}
        )    

"""
def load_retriever(file_path):
    #從文件加載檢索器
    cache_path = get_cache_path(file_path, "retriever")
    if Path(cache_path).exists():
        with open(cache_path, 'rb') as f:
            return pickle.load(f)
    return None
"""
def load_retriever(vector_store, file_path):
    print("load_retriever ...... 從配置文件加載並重新創建檢索器")
    cache_path = get_cache_path(file_path, "retriever_config")
   
    if Path(cache_path).exists():
        try:
            with open(cache_path, 'rb') as f:
                config = pickle.load(f)
           
            # 使用保存的配置重新創建檢索器
            return vector_store.as_retriever(
                search_type=config.get('search_type', 'similarity'),
                search_kwargs=config.get('search_kwargs', {'k': 3})
            )
        except Exception as e:
            print(f"加載檢索器配置錯誤: {e}")
            # 返回默認檢索器
            return vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 3})
   
    # 如果沒有保存的配置，創建默認檢索器
    return vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 3})

def save_rag_chain(rag_chain, file_path):
    print("save_rag_chain ...... 保存RAG鏈到文件")
    cache_path = get_cache_path(file_path, "rag_chain")
    Path("cache").mkdir(exist_ok=True)
    with open(cache_path, 'wb') as f:
        pickle.dump(rag_chain, f)
    print(f"RAG鏈已保存到: {cache_path}")

def load_rag_chain(file_path):
    print("load_rag_chain ...... 從文件加載RAG鏈")
    cache_path = get_cache_path(file_path, "rag_chain")
    if Path(cache_path).exists():
        with open(cache_path, 'rb') as f:
            return pickle.load(f)
    return None

def setup_rag_system(file_path, force_reload=False):  # force_reload=False
    print("setup_rag_system ...... 設置或加載RAG系統")
    global rag_chain
    global retriever

    Path("cache").mkdir(exist_ok=True) # 創建緩存目錄（如果不存在）

    """
    # 嘗試加載現有的RAG鏈
    if not force_reload:
        rag_chain = load_rag_chain(file_path)
        if rag_chain:
            print("加載現有的RAG系統...")
            return rag_chain
    """
    # 嘗試加載向量庫
    if not force_reload:
        vector_store = load_vector_store(file_path)
        if vector_store:
            print("加載現有的向量庫...")
            # 直接創建檢索器和RAG鏈
            retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 3})
            # 加載檢索器配置並重新創建  # Terry 20250828
            # retriever = load_retriever_config(vector_store, file_path)

            # 創建RAG鏈
            rag_chain = create_rag_chain(retriever, streaming=True)
            print("RAG系統加載完成！")
            return rag_chain

    print("創建新的RAG系統...")
   
    # 加載和轉換文檔
    sourcePDF = "D:/Build_RAG_Locally/DIADesigner-ST-CODE.pdf"
    # markdown_content = load_and_convert_document(file_path)
    markdown_content = load_and_convert_document(sourcePDF)
    if not markdown_content:
        return None
   
    # 分割文檔
    chunks = get_markdown_splits(markdown_content)
   
    # 創建向量庫
    vector_store = setup_vector_store(chunks)
    save_vector_store(vector_store, file_path)
   
   
    # 設置檢索器
    retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 3})
    save_retriever(retriever, file_path)

    if retriever is None:
        print("retriever is None ...")
    else :
        print("retriever is done ...")
   
    # 設置並保存檢索器  # Terry 20250828
    # retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 3})
    # save_retriever_config(retriever, file_path)  # 使用修改後的函數
   
    # 創建RAG鏈
    rag_chain = create_rag_chain(retriever, streaming=True)
    # save_rag_chain(rag_chain, file_path)  # Terry 20250828
   
    print("RAG系統創建並保存完成！")
    return rag_chain
# Terry .....................


# Document conversion
def load_and_convert_document(file_path):
    print("load_and_convert_document ......")
    converter = DocumentConverter()
    sourcePDFfile = "D:/Build_RAG_Locally/DIADesigner-ST-CODE.pdf"
    # result = converter.convert(file_path)
    result = converter.convert(sourcePDFfile)
    return result.document.export_to_markdown()

# Splitting markdown content into chunks
def get_markdown_splits(markdown_content):
    print("get_markdown_splits ......")
    headers_to_split_on = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on, strip_headers=False)
    return markdown_splitter.split_text(markdown_content)

# Embedding and vector store setup
def setup_vector_store(chunks):
    print("setup_vector_store ......")
    embeddings = OllamaEmbeddings(model='nomic-embed-text', base_url="http://localhost:11434")
    single_vector = embeddings.embed_query("this is some text data")
    index = faiss.IndexFlatL2(len(single_vector))
    vector_store = FAISS(
        embedding_function=embeddings,
        index=index,
        docstore=InMemoryDocstore(),
        index_to_docstore_id={}
    )
    vector_store.add_documents(documents=chunks)
    return vector_store

# Formatting documents for RAG
def format_docs(docs):
    print("format_docs ......")
    return "\n\n".join([doc.page_content for doc in docs])

# Setting up the RAG chain
def create_rag_chain(retriever, streaming=False):
    print("create_rag_chain ...... 創建支持流式輸出的RAG鏈")
    #from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.runnables import RunnablePassthrough
    """使用Ollama創建支持流式的RAG鏈"""
    from langchain_community.llms import Ollama

    prompt = """
        You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question.
        If you don't know the answer, just say that you don't know.
        Answer in bullet points. Make sure your answer is relevant to the question and it is answered from the context only.
        Question: {question}
        Context: {context}
        Answer:
    """
    # prompt = "你是一個工業自動化以及撰寫PLC ST code的專家 , You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. Question: {question} Context: {context} Answer:"

    print("prompt : ")
    print(prompt)
   
    # model = ChatOllama(model="deepseek-r1:1.5b", base_url="http://localhost:11434")
    # model = ChatOllama(model="llama3.1:8b", base_url="http://localhost:11434")
    # model = ChatOllama(model="gpt-oss:20b", base_url="http://localhost:11434")
    # model = ChatOllama(model="qwen3:32b", base_url="http://localhost:11434", streaming=streaming)
    model = ChatOllama(model="deepseek-r1:1.5b", base_url="http://localhost:11434", streaming=streaming)
    prompt_template = ChatPromptTemplate.from_template(prompt)
    print("prompt_template : ")
    print(prompt_template)
    return (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt_template
        | model
        | StrOutputParser()
    )

def get_rag_chain():
    print("get_rag_chain ......")
    return rag_chain

def stream_answer(question: str):
    print("stream_answer ......")
    for chunk in rag_chain.stream(question):
        yield chunk

def DMS_stream_answer(question: str):
    print("DMS_stream_answer ......")
    client = openai.OpenAI(
        api_key="sk-_YvxI3ht3M5J3hIpvthbsw",  # "<<Your API Key>>",
        base_url="https://llmgateway.deltaww.com/v1/"
    )
    messages = [
        {
        "role":"user",
        "content":"What is LLM?"  # "1+1=?"
        }
    ]
    response = client.chat.completions.create(
        model="openai/Qwen/Qwen3-235B-A22B-FP8",
        messages=messages,
        temperature=0.7,
        max_tokens=8192,
        presence_penalty=1.5,
        stream=True
    )
    #for chunk in rag_chain.stream(question):
    #    yield chunk

def build_prompt(question: str, ctx: str, sources_label: str) -> str:
    print("build_prompt ......")
    # 將問題與本機 RAG 得到的 Context 組成送給 Gemini 的單一字串 Prompt。
    # 你也可以改成使用 parts 陣列（多段文字）呼叫 generate_content，效果相同。  
    return (
        "【任務】你是一個檢索增強助理，必須只根據下方 Context 回答。\n"
        "若資訊不足，請明確回覆「我不知道」。回答語言請使用「繁體中文」。\n"
        "輸出格式：\n"
        " - 使用條列式重點\n"
        " - 關鍵詞加粗\n"
        " - 必要時在句尾標註來源索引（例如【S1】）\n\n"
        f"【問題】\n{question}\n\n"
        f"【Context】（僅可依此回答）\n{ctx}\n\n"
        f"【可用來源清單】\n{sources_label}\n\n"
        "【開始回答】\n"
    )

def get_retriever():
    print("get_retriever ......")
    return retriever

def _set_retriever(r):
    print("_set_retriever ......")
    retriever = r

def _source_of(doc) -> str:
    print("_source_of ......")
    md = getattr(doc, "metadata", {}) or {}
    return (
        md.get("source")
        or md.get("file_path")
        or md.get("path")
        or md.get("title")
        or "unknown"
    )

def retrieve_context(question: str, k: int = 6, max_chars: int = 12000) -> Tuple[str, List[str]]:
    print("retrieve_context ......")
    """
    回傳 (ctx, sources)
    - ctx：Top-K 文件組合後的上下文文字（含 [S#] 前綴），並做字元級裁切
    - sources：來源清單（僅來源字串，給 UI 顯示或提示尾註）
    """  
    r = get_retriever()
    if r is None:
        raise RuntimeError("Retriever 尚未初始化（請在 setup_rag_system 中建立 retriever 並指派）")
    docs = r.get_relevant_documents(question)
    blocks = []
    srcs = []
    for i, d in enumerate(docs[:k], start=1):
        src = _source_of(d)
        txt = (d.page_content or "").strip().replace("\x00", "")
        blocks.append(f"[S{i}] {src}\n{txt}")
        srcs.append(src)

    ctx = "\n\n---\n\n".join(blocks)
    if len(ctx) > max_chars:
        ctx = ctx[:max_chars] + "\n\n...(已截斷以符合上下文限制)"
    return ctx, srcs


