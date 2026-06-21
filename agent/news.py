"""BTC news search — Tavily (openmind-main) or Gemini Google Search fallback."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from config import settings
from logging_util import get_logger
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

log = get_logger(__name__)

_BTC_QUERY = (
    "bitcoin BTC price volatility regulation ETF mining hashrate "
    "liquidation macro fed inflation"
)


def _classify_hit(title: str, content: str) -> dict[str, str]:
    text = f"{title} {content}".lower()
    impact = "low"
    if any(w in text for w in ("crash", "surge", "record", "etf", "fed", "hack", "ban")):
        impact = "high"
    elif any(w in text for w in ("rise", "fall", "volatil", "liquidat", "tariff", "inflation")):
        impact = "medium"
    # direction = volatility impact (will this move the market a lot), NOT
    # which way price goes. A crash and a surge can both spike volatility.
    direction = "neutral"
    if any(w in text for w in ("crash", "fall", "drop", "selloff", "fear", "liquidat")):
        direction = "vol_up"
    elif any(w in text for w in ("rally", "surge", "ath", "inflow", "adoption")):
        direction = "vol_down"
    # price_direction = actual bullish/bearish signal, kept separate from
    # `direction` above so the directional leg (estimate_p_up) never confuses
    # "this will be volatile" with "this pushes price up or down".
    price_direction = "neutral"
    if any(w in text for w in ("crash", "fall", "drop", "selloff", "ban", "hack", "liquidat", "outflow")):
        price_direction = "bearish"
    elif any(w in text for w in ("rally", "surge", "ath", "inflow", "adoption", "etf approv", "record high")):
        price_direction = "bullish"
    return {"impact": impact, "direction": direction, "price_direction": price_direction}


async def search_news(hours_back: int | None = None) -> list[dict]:
    """
    Search BTC-relevant news. Date-bounded — no future data used.
    Uses Tavily when TAVILY_API_KEY is set, else Gemini with Google Search.
    """
    hours = hours_back if hours_back is not None else settings.news_hours_back
    as_of = datetime.now(timezone.utc)

    if settings.tavily_api_key:
        return _search_tavily(as_of, hours)

    if settings.gemini_api_key:
        return await _search_gemini(hours)

    if settings.anthropic_api_key:
        return await _search_anthropic(hours)

    log.warning("No TAVILY_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY — news empty")
    return []


def _search_tavily(as_of: datetime, hours_back: int) -> list[dict]:
    from reasoning.search import get_client

    client = get_client()
    hits = client.search(
        _BTC_QUERY,
        as_of=as_of,
        topic="news",
    )
    articles: list[dict] = []
    for h in hits:
        meta = _classify_hit(h.title, h.content)
        articles.append({
            "headline": h.title[:200],
            "source": h.url,
            "impact": meta["impact"],
            "direction": meta["direction"],
            "price_direction": meta["price_direction"],
            "published_date": h.published_date,
            "snippet": h.content[:300],
        })
    return articles


def _parse_news_json(text: str) -> list[dict]:
    from reasoning.llm_client import _safe_json_loads

    parsed = _safe_json_loads(text)
    if isinstance(parsed, list):
        return [a for a in parsed if isinstance(a, dict) and a.get("headline")]

    articles: list[dict] = []
    for match in re.finditer(
        r'\{[^{}]*"headline"\s*:\s*"[^"]*"[^{}]*\}',
        text,
        re.DOTALL,
    ):
        try:
            obj = json.loads(match.group(0))
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("headline"):
            articles.append(obj)
    return articles


def _retryable_gemini_error(exc: BaseException) -> bool:
    if type(exc).__name__ in ("ServerError", "ClientError"):
        return True
    return "503" in str(exc) or "429" in str(exc)


@retry(
    reraise=True,
    retry=retry_if_exception(_retryable_gemini_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=20),
)
def _gemini_news_request(hours_back: int) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    result = client.models.generate_content(
        model=settings.gemini_model,
        contents=(
            f"Search for BTC bitcoin news from the last {hours_back} hours. "
            "Return a JSON array only with objects containing "
            "{headline, source, impact: high/medium/low, "
            "direction: vol_up/vol_down/neutral (will this news increase or decrease BTC volatility, "
            "regardless of which way price moves), "
            "price_direction: bullish/bearish/neutral (does this news push BTC price up or down)}. "
            "No markdown or other text."
        ),
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.2,
            max_output_tokens=2048,
        ),
    )
    return result.text or ""


async def _search_gemini(hours_back: int) -> list[dict]:
    try:
        return _parse_news_json(_gemini_news_request(hours_back))
    except Exception:
        log.exception("gemini news search failed")
        return []


async def _search_anthropic(hours_back: int) -> list[dict]:
    import anthropic

    client = anthropic.Anthropic()
    result = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": (
                f"Search for BTC bitcoin news from the last {hours_back} hours. "
                "Return JSON array of "
                "{headline, source, impact: high/medium/low, "
                "direction: vol_up/vol_down/neutral (will this news increase or decrease BTC volatility, "
                "regardless of which way price moves), "
                "price_direction: bullish/bearish/neutral (does this news push BTC price up or down)}. "
                "Only return JSON, no other text."
            ),
        }],
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
    )
    try:
        text = "".join(b.text for b in result.content if hasattr(b, "text"))
        return json.loads(text)
    except Exception:
        log.exception("anthropic news parse failed")
        return []
