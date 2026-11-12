from datetime import datetime
from hashlib import sha256
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import FileResponse
from psycopg.types.json import Jsonb
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from .access import require_owner
from .media.service import PRIVATE_HEADERS, missing_media

router = APIRouter()
PRINT_PRICES = {"p10": 49, "p15": 89, "p20": 159}
# Base price, sizes, page counts, default size index, default page count index.
BOOK_PRICES = {
    "lite": (2490, ("15×15", "20×20"), (16, 24), 1, 1),
    "classic": (5490, ("20×20", "28×28", "30×30"), (24, 36, 48), 1, 1),
    "premium": (9900, ("28×28", "30×30"), (36, 48, 64), 1, 1),
}
Quantity = Annotated[int, Field(strict=True, ge=1, le=999)]
Contact = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=254)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PrintPhoto(StrictModel):
    media_id: UUID
    qty: Quantity


class PrintLine(StrictModel):
    kind: Literal["print"]
    draft_id: UUID
    product_id: Literal["p10", "p15", "p20"]
    paper: Literal["Глянец", "Матовая"]
    photos: list[PrintPhoto] = Field(min_length=1, max_length=24)
    qty: Quantity


class BookLine(StrictModel):
    kind: Literal["book"]
    draft_id: UUID | None
    media_ids: list[UUID] = Field(max_length=24)
    product_id: Literal["lite", "classic", "premium"]
    size: str = Field(max_length=10)
    pages: int
    title: str = Field(min_length=1, max_length=280)
    qty: Quantity
    demo: bool


class OrderRequest(StrictModel):
    name: Contact
    phone: Contact
    email: Contact
    delivery: Literal["courier", "pickup", "post"]
    address: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
    items: list[Annotated[PrintLine | BookLine, Field(discriminator="kind")]] = Field(min_length=1, max_length=50)


class OrderResult(BaseModel):
    id: UUID
    number: str
    created_at: datetime
    total: int


class OrderDetails(OrderResult):
    details: OrderRequest


def order_result(row: dict) -> OrderResult:
    return OrderResult(
        id=row["id"], number=f"PP-{row['id'].hex[:12].upper()}",
        created_at=row["created_at"], total=row["total"],
    )


def verify_media(db, owner: UUID, draft_id: UUID, service: str, ids: list[UUID]) -> None:
    if not ids or len(ids) != len(set(ids)):
        raise HTTPException(422, detail={"code": "INVALID_MEDIA_SELECTION"})
    rows = db.execute(
        """SELECT media.id, media.status FROM media JOIN drafts ON drafts.id = media.draft_id
           WHERE drafts.owner_id = %s AND drafts.id = %s AND drafts.service = %s AND media.id = ANY(%s)""",
        (owner, draft_id, service, ids),
    ).fetchall()
    if len(rows) != len(ids):
        raise missing_media()
    pending = [str(row["id"]) for row in rows if row["status"] != "passed"]
    if pending:
        raise HTTPException(409, detail={"code": "MEDIA_NOT_PASSED", "media_ids": pending})


def quote(line: PrintLine | BookLine) -> int:
    if isinstance(line, PrintLine):
        return PRINT_PRICES[line.product_id] * sum(photo.qty for photo in line.photos) * line.qty

    price, sizes, pages, default_size, default_pages = BOOK_PRICES[line.product_id]
    if line.size not in sizes or line.pages not in pages:
        raise HTTPException(422, detail={"code": "INVALID_BOOK_OPTIONS"})
    size_delta = sizes.index(line.size) - default_size
    page_delta = pages.index(line.pages) - default_pages
    return (price + size_delta * 700 + page_delta * 900) * line.qty


@router.post("/orders", status_code=201, response_model=OrderResult)
def confirm_order(order: OrderRequest, request: Request,
                  idempotency_key: Annotated[UUID, Header()], owner: UUID = Depends(require_owner)):
    if order.delivery != "pickup" and not order.address:
        raise HTTPException(422, detail={"code": "ADDRESS_REQUIRED"})
    details = order.model_dump(mode="json")
    digest = sha256(order.model_dump_json().encode()).digest()
    total = sum(quote(line) for line in order.items)
    with request.app.state.pool.connection() as db:
        # Reserving the key inside the transaction makes concurrent confirmations atomic.
        row = db.execute(
            """INSERT INTO orders (id, owner_id, idempotency_key, request_hash, details, total)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (owner_id, idempotency_key) DO NOTHING RETURNING *""",
            (uuid4(), owner, idempotency_key, digest, Jsonb(details), total),
        ).fetchone()
        if row is None:
            prior = db.execute(
                "SELECT * FROM orders WHERE owner_id = %s AND idempotency_key = %s", (owner, idempotency_key),
            ).fetchone()
            if prior["request_hash"] != digest:
                raise HTTPException(409, detail={"code": "ORDER_KEY_REUSED"})
            return order_result(prior)

        media = set()
        for line in order.items:
            if isinstance(line, PrintLine):
                ids = [photo.media_id for photo in line.photos]
                verify_media(db, owner, line.draft_id, "print", ids)
            elif line.demo:
                if line.draft_id is not None or line.media_ids:
                    raise HTTPException(422, detail={"code": "INVALID_MEDIA_SELECTION"})
                continue
            else:
                ids = line.media_ids
                if line.draft_id is None:
                    raise HTTPException(422, detail={"code": "INVALID_MEDIA_SELECTION"})
                verify_media(db, owner, line.draft_id, "book", ids)
            media.update(ids)
        if media:
            with db.cursor() as cursor:
                cursor.executemany(
                    "INSERT INTO order_media (order_id, media_id) VALUES (%s, %s)",
                    [(row["id"], media_id) for media_id in media],
                )
        return order_result(row)


@router.get("/orders", response_model=list[OrderDetails])
def order_history(request: Request, owner: UUID = Depends(require_owner)):
    with request.app.state.pool.connection() as db:
        rows = db.execute("SELECT * FROM orders WHERE owner_id = %s ORDER BY created_at DESC", (owner,)).fetchall()
    return [OrderDetails(**order_result(row).model_dump(), details=row["details"]) for row in rows]


@router.get("/orders/{order_id}/media/{media_id}/original")
def original(order_id: UUID, media_id: UUID, request: Request, owner: UUID = Depends(require_owner)):
    with request.app.state.pool.connection() as db:
        row = db.execute(
            """SELECT media.image_format FROM orders
               JOIN order_media ON order_media.order_id = orders.id
               JOIN media ON media.id = order_media.media_id
               WHERE orders.id = %s AND orders.owner_id = %s AND media.id = %s""",
            (order_id, owner, media_id),
        ).fetchone()
    path = request.app.state.storage / f"{media_id}.original"
    if row is None or not path.is_file():
        raise missing_media()
    jpeg = row["image_format"] == "JPEG"
    return FileResponse(
        path, media_type="image/jpeg" if jpeg else "image/png", headers=PRIVATE_HEADERS,
        filename=f"{media_id}.{'jpg' if jpeg else 'png'}",
    )
