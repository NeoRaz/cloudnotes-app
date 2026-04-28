# ai/app/main.py
from fastapi import FastAPI, HTTPException
import logging

from models import (
    EmbedRequest, EmbedResponse,
    GenerateRequest, GenerateResponse,
    RetrieveRequest,
    AskRequest, AskResponse,
)
from utils import (
    MODEL_PROVIDER,
    OLLAMA_EMBEDDING_MODEL, OLLAMA_LLM_MODEL,
    OPENAI_EMBEDDING_MODEL, LLM_OPENAI_MODEL,
    call_ollama_embedding, call_ollama_llm,
    call_openai_embedding, call_openai_llm,
    get_db_conn,
)

app = FastAPI(title="CloudNotes AI Service", version="0.2")
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Helper: dispatch embedding / llm to the configured provider
# ---------------------------------------------------------------------------

def embed_texts(inputs: list[str]) -> tuple[list[list[float]], str]:
    """Returns (embeddings, model_name)."""
    if MODEL_PROVIDER == "ollama":
        return call_ollama_embedding(inputs), OLLAMA_EMBEDDING_MODEL
    elif MODEL_PROVIDER == "openai":
        return call_openai_embedding(inputs), OPENAI_EMBEDDING_MODEL
    else:
        raise HTTPException(400, f"Unknown MODEL_PROVIDER: {MODEL_PROVIDER}")


def generate_text(req) -> tuple[str, str]:
    """Returns (text, model_name)."""
    if MODEL_PROVIDER == "ollama":
        return call_ollama_llm(req)
    elif MODEL_PROVIDER == "openai":
        return call_openai_llm(req)
    else:
        raise HTTPException(400, f"Unknown MODEL_PROVIDER: {MODEL_PROVIDER}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/healthz")
def healthz():
    return {"status": "ok", "provider": MODEL_PROVIDER}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    inputs = req.input if isinstance(req.input, list) else [req.input]
    if not inputs:
        raise HTTPException(400, "Empty input")
    try:
        embeddings, model_used = embed_texts(inputs)
        return EmbedResponse(embeddings=embeddings, model=model_used)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("embed failed")
        raise HTTPException(500, str(e))


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    try:
        text, model_used = generate_text(req)
        return GenerateResponse(text=text, provider=MODEL_PROVIDER, model=model_used)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("generate failed")
        raise HTTPException(500, str(e))


@app.post("/retrieve")
def retrieve(req: RetrieveRequest):
    if not req.embedding:
        raise HTTPException(400, "Embedding must be a non-empty list")
    limit = req.limit or 5
    emb_literal = "ARRAY[" + ",".join(map(str, req.embedding)) + "]::vector"
    
    user_filter = ""
    params = [limit]
    if req.user_id is not None:
        user_filter = "WHERE (metadata->>'user_id')::int = %s"
        params = [req.user_id, limit]

    sql = f"""
        SELECT id, note_id, chunk_index, chunk_text, metadata
        FROM note_vectors
        {user_filter}
        ORDER BY embedding <-> {emb_literal}
        LIMIT %s;
    """
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"results": rows}
    except Exception as e:
        logging.exception("pg retrieve failed")
        raise HTTPException(500, str(e))


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """
    Full RAG pipeline:
      1. Embed the user's question.
      2. Retrieve the top-k most similar note chunks (filtered by user_id).
      3. Build a context + history-aware prompt and call the LLM.
      4. Return the answer + source chunks.
    """
    # --- 1. Embed question ---
    try:
        q_embeddings, _ = embed_texts([req.question])
    except Exception as e:
        logging.exception("embedding question failed")
        raise HTTPException(500, f"Embedding failed: {e}")

    q_vec = q_embeddings[0]

    # --- 2. Retrieve relevant chunks (scoped to user if provided) ---
    emb_literal = "ARRAY[" + ",".join(map(str, q_vec)) + "]::vector"

    user_filter = ""
    filter_params: list = [req.limit]
    if req.user_id is not None:
        user_filter = "WHERE (metadata->>'user_id')::int = %s"
        filter_params = [req.user_id, req.limit]

    sql = f"""
        SELECT note_id, chunk_index, chunk_text, metadata,
               embedding <-> {emb_literal} AS distance
        FROM note_vectors
        {user_filter}
        ORDER BY distance
        LIMIT %s;
    """
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
        cur.execute(sql, filter_params)
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        logging.exception("retrieve failed during /ask")
        raise HTTPException(500, f"Retrieval failed: {e}")

    # --- 3. Build prompt ---
    # System context: aggregate stats if provided
    stats_lines = []
    if req.meta:
        note_count = req.meta.get("total_notes")
        if note_count is not None:
            stats_lines.append(f"- The user currently has {note_count} note(s) in total.")

    stats_context = (
        "\n### User Stats\n" + "\n".join(stats_lines) + "\n"
        if stats_lines else ""
    )

    # Retrieved note chunks as context
    if rows:
        context_parts = []
        for i, row in enumerate(rows, 1):
            meta  = row.get("metadata") or {}
            title = meta.get("title", f"Note #{row['note_id']}")
            context_parts.append(f"[{i}] {title}\n{row['chunk_text']}")
        notes_context = "\n\n".join(context_parts)
    else:
        notes_context = "(No relevant notes found)"

    # Conversation history
    history_text = ""
    if req.history:
        history_lines = []
        for msg in req.history[-6:]:  # last 3 turns (6 messages)
            label = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{label}: {msg.content}")
        history_text = "\n### Conversation History\n" + "\n".join(history_lines) + "\n"

    prompt = (
        "You are a helpful assistant that answers questions based on the user's personal notes. "
        "IMPORTANT: The 'User Stats' section below contains aggregate facts directly from the database. "
        "Use them to answer general questions about the user's account (like total note counts). "
        "The 'Relevant Notes' section contains specific note content found by searching. "
        "If information is missing, say so. Do not hallucinate.\n"
        f"{stats_context}"
        f"{history_text}"
        f"\n### Relevant Notes\n{notes_context}\n\n"
        f"### Current Question\nUser: {req.question}\nAssistant:"
    )

    # --- 4. Generate answer ---
    from models import GenerateRequest as GR
    gen_req = GR(
        prompt=prompt,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        model=req.model,
    )
    try:
        answer, model_used = generate_text(gen_req)
    except Exception as e:
        logging.exception("LLM generation failed during /ask")
        raise HTTPException(500, f"Generation failed: {e}")

    sources = [{k: v for k, v in r.items() if k != "distance"} for r in rows]

    return AskResponse(
        answer=answer,
        sources=sources,
        provider=MODEL_PROVIDER,
        model=model_used,
    )
