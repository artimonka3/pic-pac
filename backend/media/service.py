from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from psycopg_pool import ConnectionPool
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from ..access import require_owner
from .quality import Prepared, UploadError, prepare
from .rules import MAX_ATTEMPTS, RULES

router = APIRouter()
Service = Literal["book", "print"]
Status = Literal["pending", "passed", "needs_replacement", "failed"]
PRIVATE_HEADERS = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}


class MediaResult(BaseModel):
    media_id: UUID
    status: Status
    width: int
    height: int
    rules_version: str
    reason_code: str | None
    warning_code: str | None
    can_retry: bool
    preview_url: str


def describe(row: dict) -> MediaResult:
    return MediaResult(
        media_id=row["id"], status=row["status"], width=row["width"], height=row["height"],
        rules_version=row["rules_version"], reason_code=row["reason_code"], warning_code=row["warning_code"],
        can_retry=row["status"] == "failed" and row["attempts"] < MAX_ATTEMPTS,
        preview_url=f"/api/media/{row['id']}/preview",
    )


def missing_media() -> HTTPException:
    return HTTPException(404, detail={"code": "MEDIA_NOT_FOUND"})


def own_media(db, owner: UUID, media_id: UUID) -> dict:
    row = db.execute(
        """SELECT media.* FROM media JOIN drafts ON drafts.id = media.draft_id
           WHERE media.id = %s AND drafts.owner_id = %s""",
        (media_id, owner),
    ).fetchone()
    if row is None:
        raise missing_media()
    return row


def write_atomic(path: Path, data: bytes) -> None:
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            temporary.write(data)
            temporary.close()
            temporary_path.replace(path)
        finally:
            temporary_path.unlink(missing_ok=True)


def persist_upload(pool: ConnectionPool, storage: Path, owner: UUID, draft_id: UUID, media_id: UUID,
                   service: Service, content: bytes, image: Prepared) -> MediaResult:
    digest = sha256(content).digest()
    with pool.connection() as db:
        db.execute(
            "INSERT INTO drafts VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING",
            (draft_id, owner, service),
        )
        draft = db.execute("SELECT owner_id, service FROM drafts WHERE id = %s", (draft_id,)).fetchone()
        if draft["owner_id"] != owner or draft["service"] != service:
            raise HTTPException(404, detail={"code": "DRAFT_NOT_FOUND"})

        row = db.execute(
            """INSERT INTO media (id, draft_id, digest, image_format, width, height, status, rules_version)
               VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s)
               ON CONFLICT (id) DO NOTHING RETURNING *""",
            (media_id, draft_id, digest, image.image_format, image.width, image.height, RULES.version),
        ).fetchone()
        if row is None:
            row = own_media(db, owner, media_id)
            if row["draft_id"] != draft_id or row["digest"] != digest:
                raise HTTPException(409, detail={"code": "MEDIA_ID_REUSED"})
            return describe(row)

        original = storage / f"{media_id}.original"
        preview = storage / f"{media_id}.jpg"
        try:
            write_atomic(original, content)
            write_atomic(preview, image.preview)
        except OSError:
            original.unlink(missing_ok=True)
            preview.unlink(missing_ok=True)
            raise
        return describe(row)


@router.put(
    "/drafts/{draft_id}/media/{media_id}", status_code=202, response_model=MediaResult,
    openapi_extra={"requestBody": {
        "required": True,
        "content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}},
    }},
)
async def upload(draft_id: UUID, media_id: UUID, service: Service, request: Request,
                 owner: UUID = Depends(require_owner)):
    async with request.app.state.upload_slots:
        data = bytearray()
        async for chunk in request.stream():
            if len(data) + len(chunk) > RULES.max_bytes:
                raise HTTPException(413, detail={"code": "FILE_TOO_LARGE"})
            data.extend(chunk)
        if not data:
            raise HTTPException(422, detail={"code": "INVALID_IMAGE"})
        content = bytes(data)
        try:
            image = await run_in_threadpool(prepare, content)
        except UploadError as exc:
            status = 415 if exc.code == "UNSUPPORTED_FORMAT" else 413 if exc.code == "TOO_MANY_PIXELS" else 422
            raise HTTPException(status, detail={"code": exc.code}) from exc
        return await run_in_threadpool(
            persist_upload, request.app.state.pool, request.app.state.storage,
            owner, draft_id, media_id, service, content, image,
        )


@router.get("/media/{media_id}", response_model=MediaResult)
def get_media(media_id: UUID, request: Request, owner: UUID = Depends(require_owner)):
    with request.app.state.pool.connection() as db:
        return describe(own_media(db, owner, media_id))


@router.post("/media/{media_id}/retry", response_model=MediaResult)
def retry_media(media_id: UUID, request: Request, owner: UUID = Depends(require_owner)):
    with request.app.state.pool.connection() as db:
        row = own_media(db, owner, media_id)
        if row["status"] == "failed":
            if row["attempts"] >= MAX_ATTEMPTS:
                raise HTTPException(409, detail={"code": "RETRY_LIMIT"})
            updated = db.execute(
                """UPDATE media SET status = 'pending', reason_code = NULL, warning_code = NULL, retry_at = now()
                   WHERE id = %s AND status = 'failed' AND attempts = %s RETURNING *""",
                (media_id, row["attempts"]),
            ).fetchone()
            row = updated or own_media(db, owner, media_id)
        return describe(row)


@router.get("/media/{media_id}/preview")
def get_preview(media_id: UUID, request: Request, owner: UUID = Depends(require_owner)):
    with request.app.state.pool.connection() as db:
        own_media(db, owner, media_id)
    path = request.app.state.storage / f"{media_id}.jpg"
    if not path.is_file():
        raise missing_media()
    return FileResponse(path, media_type="image/jpeg", headers=PRIVATE_HEADERS)
