from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas import ChatRequest, ChatResponse, SuggestedPrompts
from app.routers.auth import get_current_user_optional, UserInfo
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.get("", response_model=SuggestedPrompts)
async def get_suggested_prompts():
    """Returns the suggested prompts shown on the chatbot widget."""
    return chat_service.suggested_prompts()


@router.post("", response_model=ChatResponse)
async def post_chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserInfo] = Depends(get_current_user_optional),
):
    """Answers a chatbot message from live DB facts (LLM only if a key is configured)."""
    return await chat_service.answer(
        db,
        message=request.message,
        history=request.history or [],
        user=current_user,
        session_id=request.session_id,
    )
