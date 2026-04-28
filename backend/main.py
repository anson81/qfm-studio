import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import init_db
import config
from api.v1.auth import router as auth_router
from api.v1.content import router as content_router
from api.v1.generate import router as generate_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title=config.APP_NAME, version=config.VERSION, lifespan=lifespan)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — explicit origins only (no wildcard + credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(generate_router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": config.VERSION}

static_dir = os.path.join(os.path.dirname(__file__), "../apps/web/dist")
static_assets = os.path.join(static_dir, "assets")

# Serve assets directly
if os.path.exists(static_assets):
    app.mount("/assets", StaticFiles(directory=static_assets), name="assets")

# SPA catch-all — return 404 for unknown routes, not 200
@app.get("/{path:path}")
async def serve_spa(path: str, request: Request):
    # Only serve index.html for non-API, non-asset routes
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": "not found"})
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"error": "not found"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)