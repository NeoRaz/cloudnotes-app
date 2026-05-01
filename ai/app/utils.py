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
LLM_MODEL       = os.environ.get("AI_LLM_MODEL", "qwen2.5-coder:7b")
EMBED_MODEL     = os.environ.get("AI_EMBEDDING_MODEL", "nomic-embed-text")

# ---------------------------------------------------------------------------
# 1. The Brain: LLM (Text Generation)
# ---------------------------------------------------------------------------
def call_ollama_llm(req) -> tuple[str, str]:
    """
    Forwards prompt to Ollama, adds extraction instructions, and cleans the response.
    """
    # Extract the actual prompt
    messages = getattr(req, "messages", [])
    prompt = messages[-1]["content"] if messages else getattr(req, "prompt", "")
    
    # 1. Extraction Booster: Ensure the AI knows to speak JSON for Cognee
    # We trigger on extraction AND summarization requests
    booster_keywords = ["nodes", "edges", "extract", "summarize", "summary", "content"]
    is_data_request = any(word in prompt.lower() for word in booster_keywords)
    
    if is_data_request:
        prompt = (
            "### ROLE: YOU ARE A HIGH-PRECISION DATA EXTRACTION ENGINE FOR COGNEE. "
            "### INSTRUCTION: YOU MUST FOLLOW THE REQUESTED JSON SCHEMA EXACTLY. "
            "FILL ALL REQUIRED FIELDS (e.g., 'summary', 'description', 'nodes', 'edges'). "
            "OUTPUT ONLY THE RAW JSON OBJECT. NO PREAMBLE. NO CONVERSATION. NO EXPLANATION. "
            "ENSURE ALL SPECIAL CHARACTERS ARE PROPERLY JSON-ESCAPED.\n\n"
        ) + prompt

    # 2. The Call
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": getattr(req, "model", LLM_MODEL),
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": getattr(req, "temperature", 0.0),
            "num_predict": getattr(req, "max_tokens", 4096)
        }
    }

    # Only force JSON format for data extraction/summarization
    if is_data_request:
        payload["format"] = "json"
    
    resp = requests.post(url, json=payload, timeout=300)
    resp.raise_for_status()
    content = resp.json().get("response", "")

    # 3. The Clean: Strip thought blocks and extract only the JSON part
    clean = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
    if "{" in clean and "}" in clean:
        start, end = clean.find("{"), clean.rfind("}") + 1
        clean = clean[start:end]

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
