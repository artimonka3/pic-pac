from concurrent.futures import ThreadPoolExecutor
from os import environ
from threading import Event
from time import monotonic, sleep
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from backend.media import worker
from main import app
from test_quality import photo


@pytest.fixture
def database(monkeypatch, tmp_path):
    url = environ.get("PICPAC_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set PICPAC_TEST_DATABASE_URL to exercise PostgreSQL.")
    name = f"test_{uuid4().hex}"
    schema = sql.Identifier(name)
    with psycopg.connect(url, autocommit=True) as db:
        db.execute(sql.SQL("CREATE SCHEMA {}").format(schema))
        monkeypatch.setenv("DATABASE_URL", make_conninfo(url, options=f"-csearch_path={name}"))
        monkeypatch.setenv("PICPAC_MEDIA_DIR", str(tmp_path))
        try:
            yield
        finally:
            db.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(schema))


@pytest.fixture
def client(database):
    with TestClient(app) as client:
        assert client.post("/api/session").status_code == 204
        yield client


def upload(client, data, service="print", draft=None, media=None):
    draft, media = draft or str(uuid4()), media or str(uuid4())
    response = client.put(f"/api/drafts/{draft}/media/{media}?service={service}", content=data)
    assert response.status_code == 202, response.text
    assert response.json()["media_id"] == media
    return draft, media


def checked(client, media):
    deadline = monotonic() + 7
    while monotonic() < deadline:
        response = client.get(f"/api/media/{media}")
        assert response.status_code == 200
        if response.json()["status"] != "pending":
            return response.json()
        sleep(.03)
    pytest.fail("photo check did not complete")


def order(draft, media):
    return {
        "name": "Иван", "phone": "1234", "email": "ivan@example.com", "delivery": "pickup", "address": "",
        "items": [{
            "kind": "print", "draft_id": draft, "product_id": "p10", "paper": "Глянец",
            "photos": [{"media_id": media, "qty": 2}], "qty": 1,
        }],
    }


def post_order(client, data, key=None):
    return client.post("/api/orders", headers={"Idempotency-Key": key or str(uuid4())}, json=data)


def test_private_original_and_concurrent_order(client):
    content = photo(orientation=6)
    draft, media = upload(client, content)
    assert checked(client, media)["status"] == "passed"
    upload(client, content, draft=draft, media=media)
    assert client.put(f"/api/drafts/{draft}/media/{media}?service=print", content=photo(color="red")).status_code == 409
    assert client.get(f"/api/media/{media}/preview").content != content

    stranger = TestClient(app)
    assert stranger.post("/api/session").status_code == 204
    assert stranger.get(f"/api/media/{media}").status_code == 404
    assert stranger.get(f"/api/media/{media}/preview").status_code == 404
    assert stranger.post(f"/api/media/{media}/retry").status_code == 404
    assert post_order(stranger, order(draft, media)).status_code == 404

    payload = order(draft, media)
    assert post_order(client, order(str(uuid4()), media)).status_code == 404
    key = str(uuid4())
    with ThreadPoolExecutor(2) as executor:
        responses = list(executor.map(lambda _: post_order(client, payload, key), range(2)))
    assert all(response.status_code == 201 for response in responses)
    assert responses[0].json() == responses[1].json()
    confirmed = responses[0].json()
    assert confirmed["total"] == 98
    assert len(client.get("/api/orders").json()) == 1
    assert post_order(client, {**payload, "name": "Другое имя"}, key).status_code == 409

    path = f"/api/orders/{confirmed['id']}/media/{media}/original"
    original = client.get(path)
    assert original.content == content
    assert "attachment" in original.headers["content-disposition"]
    assert "no-store" in original.headers["cache-control"]
    assert stranger.get(path).status_code == 404
    stranger.close()


def test_pending_and_low_resolution_cannot_confirm(client, monkeypatch):
    release = Event()
    original_measure = worker.measure

    def delayed(*args):
        assert release.wait(5)
        return original_measure(*args)

    monkeypatch.setattr(worker, "measure", delayed)
    draft, bad = upload(client, photo((160, 90)))
    key = str(uuid4())
    try:
        assert client.get(f"/api/media/{bad}").json()["status"] == "pending"
        pending = post_order(client, order(draft, bad), key)
        assert pending.status_code == 409
        assert pending.json()["detail"]["code"] == "MEDIA_NOT_PASSED"
    finally:
        release.set()
    assert checked(client, bad)["status"] == "needs_replacement"
    assert post_order(client, order(draft, bad), key).status_code == 409
    _, replacement = upload(client, photo(color="black"), draft=draft)
    result = checked(client, replacement)
    assert (result["status"], result["warning_code"]) == ("passed", "TOO_DARK")
    assert post_order(client, order(draft, replacement), key).status_code == 201


def test_upload_errors_and_service_binding(client):
    draft, media = str(uuid4()), str(uuid4())
    url = f"/api/drafts/{draft}/media/{media}"
    invalid = client.put(f"{url}?service=print", content=b"\xff\xd8broken")
    assert invalid.status_code == 422
    assert invalid.json()["detail"]["code"] == "INVALID_IMAGE"
    assert client.get(f"/api/media/{media}").status_code == 404

    content = photo((1400, 1000))
    upload(client, content, "book", draft, media)
    assert checked(client, media)["status"] == "passed"
    assert post_order(client, order(draft, media)).status_code == 404
    book = order(draft, media)
    book["items"] = [{
        "kind": "book", "demo": False, "draft_id": draft, "media_ids": [media],
        "product_id": "lite", "size": "15×15", "pages": 16, "title": "Альбом", "qty": 2,
    }]
    confirmed = post_order(client, book)
    assert confirmed.status_code == 201
    assert confirmed.json()["total"] == (2490 - 700 - 900) * 2


def test_failed_media_retry_same_id(client, monkeypatch):
    original_measure = worker.measure
    count = 0

    def flaky(*args):
        nonlocal count
        count += 1
        if count == 1:
            raise OSError("temporary error")
        return original_measure(*args)

    monkeypatch.setattr(worker, "measure", flaky)
    _, media = upload(client, photo())
    failed = checked(client, media)
    assert (failed["status"], failed["can_retry"]) == ("failed", True)
    for _ in range(2):
        assert client.post(f"/api/media/{media}/retry").json()["media_id"] == media
    assert checked(client, media)["status"] == "passed"
    assert count == 2


def test_recover_job_after_restart(database, monkeypatch):
    original_check = worker.run_check
    monkeypatch.setattr(worker, "run_check", lambda *args: False)
    with TestClient(app) as before:
        before.post("/api/session")
        _, media = upload(before, photo())
        cookies = dict(before.cookies)
        with app.state.pool.connection() as db:
            db.execute("UPDATE media SET attempts = 1, retry_at = now() - interval '1 second' WHERE id = %s", (media,))

    monkeypatch.setattr(worker, "run_check", original_check)
    with TestClient(app, cookies=cookies) as after:
        assert checked(after, media)["status"] == "passed"
        with app.state.pool.connection() as db:
            assert db.execute("SELECT attempts FROM media WHERE id = %s", (media,)).fetchone()["attempts"] == 2
