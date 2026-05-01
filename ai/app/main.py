import logging
from fastapi import FastAPI, HTTPException, UploadFile, File
from models import (
    EmbedRequest,
    GenerateRequest, GenerateResponse,
    AskRequest, AskResponse,
)
from utils import (
    MODEL_PROVIDER,
    LLM_MODEL,
    EMBED_MODEL,
    call_ollama_embedding, call_ollama_llm,
)

app = FastAPI(title="CloudNotes AI Service", version="0.2")
logging.basicConfig(level=logging.INFO)

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
        
        content, model_used = call_ollama_llm(pseudo_req)
        
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


@app.post("/embed")
@app.post("/api/embed")
def embed(req: EmbedRequest):
    raw_input = req.input if req.input else req.prompt
    inputs = raw_input if isinstance(raw_input, list) else [raw_input]
    if not inputs or not inputs[0]:
        raise HTTPException(400, "Empty input")
    try:
        embeddings = call_ollama_embedding(inputs)
        return {"embeddings": embeddings}
    except Exception as e:
        logging.exception("embed failed")
        raise HTTPException(500, str(e))


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    try:
        text, model_used = call_ollama_llm(req)
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


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """
    Full RAG pipeline using Cognee's Graph context.
    """
    notes_context = req.context if req.context else "(No relevant graph context provided)"
    
    # Conversation history
    history_text = ""
    if req.history:
        history_lines = [f"{('User' if msg.role == 'user' else 'Assistant')}: {msg.content}" for msg in req.history[-2:]]
        history_text = "\n### Recent Conversation\n" + "\n".join(history_lines) + "\n"

    prompt = (
        "You are 'CloudNotes AI', a specialized reasoning assistant.\n\n"
        "### Operational Protocol:\n"
        "1. RELATIONAL SYNTHESIS: Treat the provided context as the absolute truth.\n"
        "2. PRECISION: Include specific metrics or identifiers from the context.\n"
        "3. BOUNDARIES: If the information is missing, state it. No hallucinations.\n\n"
        f"{history_text}\n"
        f"<context_sources>\n{notes_context}\n</context_sources>\n\n"
        f"Question: '{req.question}'\nAssistant:"
    )

    from models import GenerateRequest as GR
    gen_req = GR(prompt=prompt, max_tokens=req.max_tokens, temperature=req.temperature, model=req.model)
    
    try:
        answer, model_used = call_ollama_llm(gen_req)
        return AskResponse(answer=answer, sources=[], provider=MODEL_PROVIDER, model=model_used)
    except Exception as e:
        logging.exception("Ask failed")
        raise HTTPException(500, f"Ask failed: {e}")
