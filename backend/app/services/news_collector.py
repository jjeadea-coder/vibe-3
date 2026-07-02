from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
import re
from urllib.error import URLError
from urllib.request import ProxyHandler, Request, build_opener
import xml.etree.ElementTree as ET

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class RssArticle:
    title: str
    url: str
    source: str
    published_at: str | None
    summary: str | None
    keyword: str | None


@dataclass(frozen=True)
class RssSource:
    id: int
    name: str
    rss_url: str


@dataclass(frozen=True)
class CollectionFailure:
    source_id: int
    source: str
    error: str


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None

    text = unescape(value)
    text = TAG_RE.sub(" ", text)
    text = SPACE_RE.sub(" ", text).strip()
    return text or None


def _find_text(element: ET.Element, candidates: tuple[str, ...]) -> str | None:
    for candidate in candidates:
        found = element.find(candidate)
        if found is not None and found.text:
            return found.text
    return None


def _published_at(value: str | None) -> str | None:
    if not value:
        return None

    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return _clean_text(value)

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed.replace(microsecond=0).isoformat(timespec="seconds")


def _matching_keywords(title: str, summary: str | None, keywords: list[str]) -> list[str]:
    haystack = f"{title} {summary or ''}".casefold()
    return [keyword for keyword in keywords if keyword.casefold() in haystack]


def fetch_rss_articles(source: RssSource, keywords: list[str], timeout: int = 8) -> list[RssArticle]:
    request = Request(
        source.rss_url,
        headers={"User-Agent": "PublicAdminSuperapp/0.1 (+https://localhost)"},
    )

    try:
        opener = build_opener(ProxyHandler({}))
        with opener.open(request, timeout=timeout) as response:
            payload = response.read()
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error
    except OSError as error:
        raise RuntimeError(str(error)) from error

    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        raise RuntimeError(f"invalid rss xml: {error}") from error

    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    articles: list[RssArticle] = []

    for item in items:
        raw_title = _find_text(item, ("title", "{http://www.w3.org/2005/Atom}title"))
        title = _clean_text(raw_title)
        link = _find_text(item, ("link", "guid", "{http://www.w3.org/2005/Atom}link"))

        atom_link = item.find("{http://www.w3.org/2005/Atom}link")
        if atom_link is not None and atom_link.attrib.get("href"):
            link = atom_link.attrib["href"]

        url = _clean_text(link)
        if not title or not url:
            continue

        summary = _clean_text(
            _find_text(
                item,
                (
                    "description",
                    "summary",
                    "content",
                    "{http://www.w3.org/2005/Atom}summary",
                    "{http://www.w3.org/2005/Atom}content",
                ),
            )
        )
        published_at = _published_at(
            _find_text(
                item,
                (
                    "pubDate",
                    "published",
                    "updated",
                    "{http://www.w3.org/2005/Atom}published",
                    "{http://www.w3.org/2005/Atom}updated",
                ),
            )
        )
        matched = _matching_keywords(title, summary, keywords)

        if keywords and not matched:
            continue

        articles.append(
            RssArticle(
                title=title,
                url=url,
                source=source.name,
                published_at=published_at,
                summary=summary,
                keyword=", ".join(matched) if matched else None,
            )
        )

    return articles



