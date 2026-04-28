# ai/app/models.py
from typing import List, Union, Optional
from pydantic import BaseModel


class EmbedRequest(BaseModel):
    input: Union[str, List[str]]
    batch_size: Optional[int] = 32


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.2
    model: Optional[str] = None


class GenerateResponse(BaseModel):
    text: str
    provider: str
    model: str


class RetrieveRequest(BaseModel):
    embedding: List[float]
    limit: Optional[int] = 5


class HistoryMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class AskRequest(BaseModel):
    """
    High-level RAG endpoint: embed the question, retrieve relevant chunks,
    then generate an answer – all in one call.
    """
    question: str
    limit: Optional[int] = 5
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.2
    model: Optional[str] = None
    # Optional: filter retrieved chunks to a specific user's notes
    user_id: Optional[int] = None
    # Optional: conversation history for multi-turn memory
    history: Optional[List[HistoryMessage]] = None
    # Optional: aggregate stats injected by Laravel (e.g. total note count)
    meta: Optional[dict] = None


class AskResponse(BaseModel):
    answer: str
    sources: List[dict]
    provider: str
    model: str
