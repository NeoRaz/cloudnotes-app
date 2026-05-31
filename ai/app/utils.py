# ai/app/utils.py
import os
import re
import json
import logging
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# ---------------------------------------------------------------------------
# Simple Configuration
# ---------------------------------------------------------------------------
MODEL_PROVIDER      = os.environ.get("AI_MODEL_PROVIDER", "ollama")
OLLAMA_HOST         = os.environ.get("AI_ENDPOINT_URL", "http://host.minikube.internal:11434").replace("/v1", "")
LLM_MODEL       = os.environ.get("AI_LLM_MODEL", "llama3.2:latest")
EMBED_MODEL     = os.environ.get("AI_EMBEDDING_MODEL", "nomic-embed-text")

# ---------------------------------------------------------------------------
# 1. The Brain: LLM (Text Generation)
# ---------------------------------------------------------------------------
def call_ollama_llm(req) -> tuple[str, str]:
    """
    Forwards prompt to Ollama and cleans the response.
    """
    # Extract the actual prompt
    messages = getattr(req, "messages", [])
    prompt = messages[-1]["content"] if messages else getattr(req, "prompt", "")
    
    # The Call
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": getattr(req, "model", None) or LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": getattr(req, "temperature", 0.0),
            "num_predict": getattr(req, "max_tokens", 4096)
        }
    }
    
    logging.info(f"Ollama payload: {payload}")
    resp = requests.post(url, json=payload, timeout=300)
    resp.raise_for_status()
    content = resp.json().get("response", "")

    # Strip thought blocks
    clean = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
    return clean, LLM_MODEL

# ---------------------------------------------------------------------------
# 2. The Sense: Embeddings (Vector Math)
# ---------------------------------------------------------------------------
def call_ollama_embedding(inputs: list[str]) -> list[list[float]]:
    """
    Processes embeddings one-by-one to prevent Ollama from crashing.
    """
    embeddings = []
    url = f"{OLLAMA_HOST}/api/embed"
    
    for text in inputs:
        payload = {"model": EMBED_MODEL, "input": str(text)[:20000]}
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        
        body = resp.json()
        embeddings.append(body.get("embedding") or body.get("embeddings", [[]])[0])

    return embeddings

# ---------------------------------------------------------------------------
# 3. Helpers (OpenAI Compatibility & DB)
# ---------------------------------------------------------------------------
def call_openai_embedding(inputs): return call_ollama_embedding(inputs)
def call_openai_llm(req): return call_ollama_llm(req)

def get_db_conn():
    return psycopg2.connect(
        host=os.environ.get("PG_HOST", "postgres"),
        port=int(os.environ.get("PG_PORT", 5432)),
        dbname=os.environ.get("PG_DATABASE", "cloudnotes_vector"),
        user=os.environ.get("PG_USERNAME", "cloudnotes"),
        password=os.environ.get("PG_PASSWORD", "cloudnotes_pass"),
        cursor_factory=RealDictCursor,
    )
