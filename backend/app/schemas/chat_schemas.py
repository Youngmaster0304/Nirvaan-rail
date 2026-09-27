from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    message: str = Field(description="User message")
    history: List[ChatMessage] = Field(default_factory=list, description="Previous turns of the conversation")
    session_id: Optional[str] = Field(default=None, description="Optional client-side session key")

class ChatResponse(BaseModel):
    reply: str
    source: Literal["db", "llm", "rules"]
    data: Optional[Dict] = None

class SuggestedPrompts(BaseModel):
    prompts: List[str]
    items: List[str]
