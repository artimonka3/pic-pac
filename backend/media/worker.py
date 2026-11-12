import asyncio
import logging
from pathlib import Path
from time import perf_counter

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool
from starlette.concurrency import run_in_threadpool

from .quality import Decision, measure
from .rules import MAX_ATTEMPTS, RULES

logger = logging.getLogger("uvicorn.error.picpac.media")


def run_check(pool: ConnectionPool, storage: Path) -> bool:
    with pool.connection() as db:
        job = db.execute(
            """SELECT media.*, drafts.service FROM media JOIN drafts ON drafts.id = media.draft_id
               WHERE status = 'pending' AND retry_at <= now()
               ORDER BY retry_at, created_at FOR UPDATE OF media SKIP LOCKED LIMIT 1"""
        ).fetchone()
        if job is None:
            return False
        if job["attempts"] >= MAX_ATTEMPTS:
            db.execute(
                "UPDATE media SET status = 'failed', reason_code = 'CHECK_FAILED', checked_at = now() WHERE id = %s",
                (job["id"],),
            )
            logger.info("status=failed code=CHECK_FAILED rules=%s", job["rules_version"])
            return True
        attempt = job["attempts"] + 1
        db.execute(
            """UPDATE media SET attempts = %s, retry_at = now() + interval '15 seconds'
               WHERE id = %s""",
            (attempt, job["id"]),
        )

    # The lease covers a crash before this transaction starts. Its row lock covers active work.
    with pool.connection() as db:
        active = db.execute(
            "SELECT id FROM media WHERE id = %s AND status = 'pending' AND attempts = %s FOR UPDATE",
            (job["id"], attempt),
        ).fetchone()
        if active is None:
            return True

        started = perf_counter()
        try:
            data = (storage / f"{job['id']}.original").read_bytes()
            result = measure(data, job["service"], job["width"], job["height"])
        except Exception:
            result = Decision("failed", reason_code="CHECK_FAILED")

        db.execute(
            """UPDATE media SET status = %s, reason_code = %s, warning_code = %s, metrics = %s,
               rules_version = %s, checked_at = now() WHERE id = %s""",
            (result.status, result.reason_code, result.warning_code, Jsonb(result.metrics),
             RULES.version, job["id"]),
        )
        logger.info("status=%s code=%s elapsed_ms=%.2f rules=%s", result.status,
                    result.reason_code or result.warning_code, (perf_counter() - started) * 1000, RULES.version)
    return True


async def work(pool: ConnectionPool, storage: Path, stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            if await run_in_threadpool(run_check, pool, storage):
                continue
        except Exception as exc:
            logger.error("queue error=%s", type(exc).__name__)
        try:
            await asyncio.wait_for(stop.wait(), timeout=0.25)
        except TimeoutError:
            pass
