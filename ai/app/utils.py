# ai/app/utils.py
import os
import json
import logging
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# ---------------------------------------------------------------------------
# Config from environment
# ---------------------------------------------------------------------------
MODEL_PROVIDER          = os.environ.get("MODEL_PROVIDER", "ollama")
OLLAMA_API_BASE         = os.environ.get("OLLAMA_API_BASE", "http://host.minikube.internal:11434")
OLLAMA_EMBEDDING_MODEL  = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
OLLAMA_LLM_MODEL        = os.environ.get("OLLAMA_LLM_MODEL", "gemma3:1b")

OPENAI_API_KEY          = os.environ.get("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL  = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
LLM_OPENAI_MODEL        = os.environ.get("LLM_OPENAI_MODEL", "gpt-4o-mini")

DB_HOST     = os.environ.get("PG_HOST", "postgres")
DB_PORT     = int(os.environ.get("PG_PORT", 5432))
DB_NAME     = os.environ.get("PG_DATABASE", "cloudnotes_vector")
DB_USER     = os.environ.get("PG_USERNAME", "cloudnotes")
DB_PASS     = os.environ.get("PG_PASSWORD", "cloudnotes_pass")
DB_CONN_STR = os.environ.get("DB_CONN_STR")

try:
    import openai
except Exception:
    openai = None

# ---------------------------------------------------------------------------
# Ollama helpers
# ---------------------------------------------------------------------------

def call_ollama_embedding(inputs: list[str]) -> list[list[float]]:
    """
    Calls the Ollama /api/embed endpoint with batch inputs.
    Returns a list of embedding vectors.
    """
    url = f"{OLLAMA_API_BASE}/api/embed"
    resp = requests.post(
        url,
        json={"model": OLLAMA_EMBEDDING_MODEL, "input": inputs},
        timeout=120,
    )
    resp.raise_for_status()
    body = resp.json()
    # Ollama returns {"embeddings": [[vec1], [vec2], ...], ...}
    return body["embeddings"]


def call_ollama_llm(req) -> tuple[str, str]:
    """
    Calls the Ollama /api/generate endpoint (non-streaming).
    Returns (generated_text, model_name).
    """
    model = req.model or OLLAMA_LLM_MODEL
    url   = f"{OLLAMA_API_BASE}/api/generate"
    resp  = requests.post(
        url,
        json={
            "model":  model,
            "prompt": req.prompt,
            "stream": False,
            "options": {
                "temperature": req.temperature,
                "num_predict": req.max_tokens,
            },
        },
        timeout=300,
    )
    resp.raise_for_status()
    body = resp.json()
    return body.get("response", "").strip(), model


# ---------------------------------------------------------------------------
# OpenAI helpers (kept for reference / easy switch-back)
# ---------------------------------------------------------------------------

def call_openai_embedding(inputs: list[str]) -> list[list[float]]:
    if openai is None:
        raise RuntimeError("openai package not installed")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")
    openai.api_key = OPENAI_API_KEY
    resp = openai.Embedding.create(input=inputs, model=OPENAI_EMBEDDING_MODEL)
    return [d["embedding"] for d in resp["data"]]


def call_openai_llm(req) -> tuple[str, str]:
    if openai is None:
        raise RuntimeError("openai package not installed")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")
    openai.api_key = OPENAI_API_KEY
    model = req.model or LLM_OPENAI_MODEL
    resp  = openai.ChatCompletion.create(
        model=model,
        messages=[{"role": "user", "content": req.prompt}],
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )
    return resp["choices"][0]["message"]["content"].strip(), model


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

def get_db_conn():
    if DB_CONN_STR:
        return psycopg2.connect(DB_CONN_STR, cursor_factory=RealDictCursor)
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        cursor_factory=RealDictCursor,
    )
