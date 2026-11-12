from os import environ
from pathlib import Path

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


def open_pool() -> ConnectionPool:
    url = environ.get("DATABASE_URL", "postgresql://picpac:picpac@127.0.0.1:5432/picpac")
    pool = ConnectionPool(url, min_size=1, max_size=8, kwargs={"row_factory": dict_row}, open=False)
    try:
        pool.open(wait=True, timeout=10)
        with pool.connection() as db:
            db.execute("SELECT pg_advisory_xact_lock(901601103)")
            db.execute(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
    except BaseException:
        pool.close()
        raise
    return pool
