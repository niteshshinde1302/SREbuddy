from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, APIRouter

import uuid
import asyncio
from contextlib import asynccontextmanager
from pydantic import BaseModel

from ollama import ChatResponse, AsyncClient
from prompts import format_message

import os
import time

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL")
MODEL_NAME = os.environ.get("MODEL_NAME")

if not OLLAMA_BASE_URL or not MODEL_NAME:
    raise RuntimeError("OLLAMA_BASE_URL and MODEL_NAME must be set.")

conversations: dict[str, dict] = {}

class QueryRequest(BaseModel):
    session_id : str
    message: str

class QueryResponse(BaseModel):
    response: str

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    bg_task = asyncio.create_task(cleanup_expired_session())
    yield
    bg_task.cancel()
    try:
        await bg_task
    except asyncio.CancelledError:
        pass

async def cleanup_expired_session() -> None:
    try:
        while True:
            now = int(time.time())
            sessions_to_delete = []
            for session_id, session in conversations.items():
                age_in_seconds = now - session["last_activity_ts"]
                if age_in_seconds > 1800:
                    sessions_to_delete.append(session_id)
        
            for session in sessions_to_delete:
                del conversations[session]
            
            await asyncio.sleep(30)
    except asyncio.CancelledError:
        print("Task cancelled, expected behaviour")

app = FastAPI(lifespan=lifespan)
router = APIRouter(prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/session")
async def create_session() -> dict:
    random_id = uuid.uuid4()
    uuid_str = str(random_id)
    conversations[uuid_str]={
        "messages": [],
        "last_activity_ts": time.time(),
    }
    return {"session_id": uuid_str}

@router.get("/session")
async def get_session(session_id: str) -> dict:
    if session_id not in conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    return conversations[session_id]   # or a Pydantic model of it

@router.get("/sessions")
async def get_all_sessions() -> list[str]:
    return list(conversations.keys())

@router.post("/query")
async def post_question(request: QueryRequest) -> QueryResponse:
    sid = get_session_id(request.session_id)
    if sid is None:
        raise HTTPException(status_code=404, detail="Session not found")

    conversations[sid]["messages"].append({
        "role": "user",
        "content": request.message,
    })
    
    try:
        client = AsyncClient(host=OLLAMA_BASE_URL)
        response: ChatResponse = await client.chat(
            model = MODEL_NAME,
            messages = format_message(conversation_history=conversations[sid]["messages"])
        )
    except Exception as e:
        conversations[sid]["messages"].pop(-1)
        raise HTTPException(status_code=502, detail="LLM upstream error.")

    conversations[sid]["messages"].append({
        "role": "assistant",
        "content": response.message.content,
    })
    conversations[sid]["last_activity_ts"] = time.time()
    return QueryResponse(response=response.message.content)


def get_session_id(session_id: str) -> str | None:
    if session_id in conversations:
        return session_id
    else:
        return None

app.include_router(router)
