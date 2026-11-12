import asyncio
from contextlib import asynccontextmanager
from os import environ
from pathlib import Path

import cv2
from fastapi import FastAPI, Request

from backend.access import router as access_router
from backend.db import open_pool
from backend.media.service import router as media_router
from backend.media.worker import work
from backend.orders import router as orders_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage = Path(environ.get("PICPAC_MEDIA_DIR", ".picpac/media")).resolve()
    storage.mkdir(mode=0o700, parents=True, exist_ok=True)
    cv2.setNumThreads(1)
    pool = open_pool()
    app.state.pool = pool
    app.state.storage = storage
    app.state.upload_slots = asyncio.Semaphore(2)
    stop = asyncio.Event()
    worker = asyncio.create_task(work(pool, storage, stop))
    try:
        yield
    finally:
        stop.set()
        await worker
        pool.close()


app = FastAPI(title="PicPac", lifespan=lifespan)
app.include_router(access_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(orders_router, prefix="/api")


@app.middleware("http")
async def private_api(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "private, no-store"
    return response


@app.get("/api/health")
def health():
    with app.state.pool.connection() as db:
        db.execute("SELECT 1")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
