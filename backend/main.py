import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(generate_router, prefix="/api/v1")

app.get("/api/v1/health")(lambda: {"status": "ok", "version": config.VERSION})

static_dir = os.path.join(os.path.dirname(__file__), "../apps/web/dist")
static_assets = os.path.join(static_dir, "assets")

# Serve assets directly
if os.path.exists(static_assets):
    app.mount("/assets", StaticFiles(directory=static_assets), name="assets")

# Serve index.html for all non-API routes (SPA catch-all)
@app.get("/{path:path}")
async def serve_spa(path: str, request: Request):
    if path.startswith("assets/"):
        file_path = os.path.join(static_dir, path)
        if os.path.exists(file_path):
            return FileResponse(file_path)
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
