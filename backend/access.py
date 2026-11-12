from hashlib import sha256
from os import environ
from secrets import token_urlsafe
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request, Response

router = APIRouter()
COOKIE = "picpac_session"


def find_owner(request: Request) -> UUID | None:
    token = request.cookies.get(COOKIE)
    if not token or len(token) != 43 or not token.isascii():
        return None
    with request.app.state.pool.connection() as db:
        row = db.execute("SELECT id FROM sessions WHERE token_hash = %s", (sha256(token.encode()).digest(),)).fetchone()
    return row["id"] if row else None


def require_owner(request: Request) -> UUID:
    owner = find_owner(request)
    if owner is None:
        raise HTTPException(401, detail={"code": "SESSION_REQUIRED"})
    return owner


@router.post("/session", status_code=204)
def start_session(request: Request, response: Response):
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, detail={"code": "SESSION_REQUIRED"})
    if find_owner(request) is None:
        token = token_urlsafe(32)
        with request.app.state.pool.connection() as db:
            db.execute("INSERT INTO sessions VALUES (%s, %s)", (uuid4(), sha256(token.encode()).digest()))
        response.set_cookie(
            COOKIE, token, httponly=True, samesite="strict", path="/api",
            secure=environ.get("PICPAC_SECURE_COOKIE") == "1", max_age=60 * 60 * 24 * 90,
        )
    response.headers["Cache-Control"] = "no-store"
