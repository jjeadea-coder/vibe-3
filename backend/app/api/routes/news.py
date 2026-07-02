import sqlite3

from fastapi import APIRouter, HTTPException, Query, status

from app.api.schemas import NewsCollectRequest, NewsKeywordCreate, NewsSourceCreate
from app.core.database import get_connection
from app.services.news_collector import RssSource, fetch_rss_articles

router = APIRouter(prefix="/news", tags=["news"])


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _article_from_row(row) -> dict[str, object]:
    return {
        "id": row["id"],
        "title": row["title"],
        "source": row["source"],
        "url": row["url"],
        "published_at": row["published_at"],
        "summary": row["summary"],
        "keyword": row["keyword"],
        "is_bookmarked": bool(row["is_bookmarked"]),
        "collected_at": row["collected_at"],
        "created_at": row["created_at"],
    }


def _keyword_from_row(row) -> dict[str, object]:
    return {"id": row["id"], "keyword": row["keyword"], "created_at": row["created_at"]}


def _source_from_row(row) -> dict[str, object]:
    return {
        "id": row["id"],
        "name": row["name"],
        "rss_url": row["rss_url"],
        "created_at": row["created_at"],
    }


@router.get("")
def list_news(
    q: str | None = None,
    keyword: str | None = None,
    source: str | None = None,
    bookmarked: bool | None = Query(default=None),
) -> dict[str, list[dict[str, object]]]:
    conditions = ["1 = 1"]
    values: list[object] = []

    search = _normalize_text(q)
    if search:
        conditions.append("(title LIKE ? OR summary LIKE ? OR source LIKE ?)")
        like = f"%{search}%"
        values.extend([like, like, like])

    normalized_keyword = _normalize_text(keyword)
    if normalized_keyword:
        conditions.append("keyword LIKE ?")
        values.append(f"%{normalized_keyword}%")

    normalized_source = _normalize_text(source)
    if normalized_source:
        conditions.append("source = ?")
        values.append(normalized_source)

    if bookmarked is not None:
        conditions.append("is_bookmarked = ?")
        values.append(1 if bookmarked else 0)

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT id, title, source, url, published_at, summary, keyword,
                   is_bookmarked, collected_at, created_at
            FROM news_articles
            WHERE {' AND '.join(conditions)}
            ORDER BY COALESCE(published_at, collected_at) DESC, id DESC
            LIMIT 200
            """,
            tuple(values),
        ).fetchall()

    return {"items": [_article_from_row(row) for row in rows]}


@router.get("/keywords")
def list_keywords() -> dict[str, list[dict[str, object]]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, keyword, created_at
            FROM news_keywords
            ORDER BY keyword COLLATE NOCASE ASC
            """
        ).fetchall()

    return {"items": [_keyword_from_row(row) for row in rows]}


@router.post("/keywords", status_code=status.HTTP_201_CREATED)
def create_keyword(payload: NewsKeywordCreate) -> dict[str, object]:
    keyword = _normalize_text(payload.keyword)
    if keyword is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="keyword is required")

    with get_connection() as connection:
        try:
            cursor = connection.execute("INSERT INTO news_keywords (keyword) VALUES (?)", (keyword,))
            connection.commit()
        except sqlite3.IntegrityError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="keyword already exists") from error

        row = connection.execute(
            "SELECT id, keyword, created_at FROM news_keywords WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return _keyword_from_row(row)


@router.delete("/keywords/{keyword_id}")
def delete_keyword(keyword_id: int) -> dict[str, object]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, keyword, created_at FROM news_keywords WHERE id = ?",
            (keyword_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="keyword not found")

        connection.execute("DELETE FROM news_keywords WHERE id = ?", (keyword_id,))
        connection.commit()

    return _keyword_from_row(row)


@router.get("/sources")
def list_sources() -> dict[str, list[dict[str, object]]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, rss_url, created_at
            FROM news_sources
            ORDER BY name COLLATE NOCASE ASC
            """
        ).fetchall()

    return {"items": [_source_from_row(row) for row in rows]}


@router.post("/sources", status_code=status.HTTP_201_CREATED)
def create_source(payload: NewsSourceCreate) -> dict[str, object]:
    name = _normalize_text(payload.name)
    rss_url = _normalize_text(payload.rss_url)

    if name is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name is required")

    if rss_url is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rss_url is required")

    if not rss_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="rss_url must start with http:// or https://")

    with get_connection() as connection:
        try:
            cursor = connection.execute(
                "INSERT INTO news_sources (name, rss_url) VALUES (?, ?)",
                (name, rss_url),
            )
            connection.commit()
        except sqlite3.IntegrityError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="source already exists") from error

        row = connection.execute(
            "SELECT id, name, rss_url, created_at FROM news_sources WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return _source_from_row(row)


@router.delete("/sources/{source_id}")
def delete_source(source_id: int) -> dict[str, object]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, rss_url, created_at FROM news_sources WHERE id = ?",
            (source_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="source not found")

        connection.execute("DELETE FROM news_sources WHERE id = ?", (source_id,))
        connection.commit()

    return _source_from_row(row)


@router.post("/collect")
def collect_news(payload: NewsCollectRequest | None = None) -> dict[str, object]:
    source_ids = payload.source_ids if payload else None

    with get_connection() as connection:
        keyword_rows = connection.execute("SELECT keyword FROM news_keywords ORDER BY keyword ASC").fetchall()
        keywords = [row["keyword"] for row in keyword_rows]

        source_query = "SELECT id, name, rss_url FROM news_sources"
        source_values: tuple[object, ...] = ()
        if source_ids:
            placeholders = ", ".join("?" for _ in source_ids)
            source_query = f"{source_query} WHERE id IN ({placeholders})"
            source_values = tuple(source_ids)
        source_rows = connection.execute(source_query, source_values).fetchall()

    inserted = 0
    skipped = 0
    failed: list[dict[str, object]] = []

    for row in source_rows:
        source = RssSource(id=row["id"], name=row["name"], rss_url=row["rss_url"])
        try:
            articles = fetch_rss_articles(source, keywords)
        except RuntimeError as error:
            failed.append({"source_id": source.id, "source": source.name, "error": str(error)})
            continue

        with get_connection() as connection:
            for article in articles:
                cursor = connection.execute(
                    """
                    INSERT OR IGNORE INTO news_articles (
                      title, source, url, published_at, summary, keyword, collected_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        article.title,
                        article.source,
                        article.url,
                        article.published_at,
                        article.summary,
                        article.keyword,
                    ),
                )
                if cursor.rowcount == 0:
                    skipped += 1
                else:
                    inserted += 1
            connection.commit()

    return {"inserted": inserted, "skipped": skipped, "failed": failed}


@router.post("/{article_id}/bookmark")
def toggle_bookmark(article_id: int) -> dict[str, object]:
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id, title, source, url, published_at, summary, keyword,
                   is_bookmarked, collected_at, created_at
            FROM news_articles
            WHERE id = ?
            """,
            (article_id,),
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="article not found")

        next_value = 0 if bool(existing["is_bookmarked"]) else 1
        connection.execute(
            "UPDATE news_articles SET is_bookmarked = ? WHERE id = ?",
            (next_value, article_id),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, title, source, url, published_at, summary, keyword,
                   is_bookmarked, collected_at, created_at
            FROM news_articles
            WHERE id = ?
            """,
            (article_id,),
        ).fetchone()

    return _article_from_row(row)
