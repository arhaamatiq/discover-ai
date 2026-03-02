from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.discover import router as discover_router
from app.api.research import router as research_router
from app.api.variations import router as variations_router

app = FastAPI(title="Discover AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(research_router, prefix="/api")
app.include_router(discover_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(variations_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
