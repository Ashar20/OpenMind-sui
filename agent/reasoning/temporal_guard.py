"""Drop search hits published after the agent's logical `as_of` time."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from logging_util import get_logger

log = get_logger(__name__)


def parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.strip()
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        pass
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(s)
        if dt is not None:
            return dt
    except (TypeError, ValueError):
        pass
    return None


def filter_results(
    results: list[dict[str, Any]],
    as_of: datetime,
    *,
    allow_undated: bool = False,
) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    dropped = 0
    for r in results:
        pub = parse_iso(r.get("published_date"))
        if pub is None:
            if allow_undated:
                kept.append(r)
            else:
                dropped += 1
            continue
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=timezone.utc)
        if pub <= as_of:
            kept.append(r)
        else:
            dropped += 1
    if dropped:
        log.debug("temporal_guard dropped=%s kept=%s", dropped, len(kept))
    return kept
