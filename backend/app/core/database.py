import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.config import DATABASE_PATH, DATA_DIR

SCHEMA_VERSION = "0.3.0"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT,
  role TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  location TEXT,
  memo TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT NOT NULL UNIQUE,
  published_at TEXT,
  summary TEXT,
  keyword TEXT,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rss_url TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

MIGRATED_COLUMNS = {
    "members": {
        "is_active": "INTEGER NOT NULL DEFAULT 1",
        "deleted_at": "TEXT",
    },
    "schedules": {
        "all_day": "INTEGER NOT NULL DEFAULT 0",
        "status": "TEXT NOT NULL DEFAULT 'confirmed'",
    },
    "news_articles": {
        "is_bookmarked": "INTEGER NOT NULL DEFAULT 0",
        "collected_at": "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
}

INDEX_SQL = (
    "CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active)",
    "CREATE INDEX IF NOT EXISTS idx_schedules_member_start ON schedules(member_id, start_at)",
    "CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at)",
    "CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at)",
    "CREATE INDEX IF NOT EXISTS idx_news_articles_keyword ON news_articles(keyword)",
    "CREATE INDEX IF NOT EXISTS idx_news_articles_bookmarked ON news_articles(is_bookmarked)",
)

DEFAULT_NEWS_KEYWORDS = ("공공행정", "지방자치", "민원", "복지행정", "정부정책")

DEFAULT_NEWS_SOURCES = (
    (
        "Google News 공공행정",
        "https://news.google.com/rss/search?q=%EA%B3%B5%EA%B3%B5%ED%96%89%EC%A0%95&hl=ko&gl=KR&ceid=KR:ko",
    ),
)


def _existing_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row[1] for row in rows}


def _ensure_columns(connection: sqlite3.Connection) -> None:
    for table_name, columns in MIGRATED_COLUMNS.items():
        existing_columns = _existing_columns(connection, table_name)
        for column_name, definition in columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"
                )


def _seed_news_defaults(connection: sqlite3.Connection) -> None:
    connection.executemany(
        "INSERT OR IGNORE INTO news_keywords (keyword) VALUES (?)",
        [(keyword,) for keyword in DEFAULT_NEWS_KEYWORDS],
    )
    connection.executemany(
        "INSERT OR IGNORE INTO news_sources (name, rss_url) VALUES (?, ?)",
        DEFAULT_NEWS_SOURCES,
    )


def initialize_database() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(SCHEMA_SQL)
        _ensure_columns(connection)

        for statement in INDEX_SQL:
            connection.execute(statement)

        _seed_news_defaults(connection)

        connection.execute(
            """
            INSERT INTO app_metadata (key, value)
            VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = CURRENT_TIMESTAMP
            """,
            (SCHEMA_VERSION,),
        )
        connection.commit()

    return DATABASE_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    initialize_database()
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
    finally:
        connection.close()


def get_database_health() -> dict[str, str]:
    with get_connection() as connection:
        sqlite_version = connection.execute("SELECT sqlite_version()").fetchone()[0]
        schema_version = connection.execute(
            "SELECT value FROM app_metadata WHERE key = 'schema_version'"
        ).fetchone()[0]

    return {
        "status": "ok",
        "path": str(DATABASE_PATH),
        "sqlite_version": sqlite_version,
        "schema_version": schema_version,
    }
