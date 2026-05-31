import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from models import (
    EmbedRequest, EmbedResponse,
    GenerateRequest, GenerateResponse,
    RetrieveRequest,
    AskRequest, AskResponse,
)
from utils import (
    MODEL_PROVIDER,
    LLM_MODEL,
    EMBED_MODEL,
    call_ollama_embedding, call_ollama_llm,
    get_db_conn,
)

app = FastAPI(title="CloudNotes AI Service", version="0.2")
logging.basicConfig(level=logging.INFO)


def embed_texts(inputs: list[str]) -> list[list[float]]:
    return call_ollama_embedding(inputs)


def generate_text(req) -> tuple[str, str]:
    return call_ollama_llm(req)


@app.post("/v1/chat/completions")
def chat_completions(req: dict):
    """
    OpenAI-compatible passthrough with Intelligence Boosting.
    """
    try:
        messages = req.get("messages", [])
        
        from types import SimpleNamespace
        pseudo_req = SimpleNamespace(
            model=req.get("model"),
            messages=messages,
            temperature=req.get("temperature", 0.0),
            max_tokens=req.get("max_tokens", 4096)
        )
        
        content, model_used = generate_text(pseudo_req)
        
        return {
            "id": "chatcmpl-proxy",
            "object": "chat.completion",
            "created": 123456789,
            "model": model_used,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop"
            }]
        }
    except Exception as e:
        logging.error(f"LLM call failed: {str(e)}")
        raise HTTPException(500, f"LLM Proxy Error: {str(e)}")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "provider": MODEL_PROVIDER}


@app.post("/embed", response_model=EmbedResponse)
@app.post("/api/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    raw_input = req.input if req.input else req.prompt
    inputs = raw_input if isinstance(raw_input, list) else [raw_input]
    if not inputs or not inputs[0]:
        raise HTTPException(400, "Empty input")
    try:
        embeddings = embed_texts(inputs)
        return EmbedResponse(embeddings=embeddings, model=EMBED_MODEL)
    except Exception as e:
        logging.exception("embed failed")
        raise HTTPException(500, str(e))


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    try:
        text, model_used = generate_text(req)
        return GenerateResponse(text=text, provider=MODEL_PROVIDER, model=model_used)
    except Exception as e:
        logging.exception("generate failed")
        raise HTTPException(500, str(e))


@app.post("/v1/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """
    High-performance PDF text extraction (Red Flag #4).
    """
    try:
        from pypdf import PdfReader
        import io
        
        content = await file.read()
        reader = PdfReader(io.BytesIO(content))
        text = "".join([page.extract_text() + "\n" for page in reader.pages])
            
        return {"text": text.strip()}
    except Exception as e:
        logging.error(f"PDF extraction failed: {str(e)}")
        raise HTTPException(500, f"PDF Extraction Error: {str(e)}")


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
        q_embeddings = embed_texts([req.question])
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
