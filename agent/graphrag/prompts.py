"""Prompts + validators for the GraphRAG pipeline."""
from __future__ import annotations

import json
import re
from typing import Any

from config import settings

ONTOLOGY_SYSTEM = (
    "You are a knowledge-graph ontologist for prediction-market analysis. "
    "Given a market question and supporting evidence, you design a compact ontology: the "
    "entity types and relationship types most useful for reasoning about who and what drives "
    "this market's outcome. Entity types are real-world subjects (people, organisations, "
    "places, events, policies, indicators). You reply ONLY with valid JSON."
)

EXTRACT_SYSTEM = (
    "You are a knowledge-graph extractor. Given an ontology and numbered evidence snippets, "
    "you extract the entities and the relationships between them that are relevant to the "
    "market. Use ONLY information present in the evidence. Every entity and relationship must "
    "cite the evidence index [n] it came from. You reply ONLY with valid JSON."
)


def build_corpus(search_hits: list[dict[str, Any]], *, max_chars: int = 6000) -> str:
    if not search_hits:
        return "(no evidence)"
    lines: list[str] = []
    total = 0
    for i, r in enumerate(search_hits, start=1):
        date = r.get("published_date") or "undated"
        title = (r.get("title") or "")[:140]
        content = (r.get("content") or "")[:500].replace("\n", " ")
        block = f"[{i}] ({date}) {title} — {content}"
        if total + len(block) > max_chars:
            break
        lines.append(block)
        total += len(block)
    return "\n".join(lines)


def build_ontology_prompt(market: dict[str, Any], corpus: str) -> str:
    return f"""Market: {market["question"]}
Category: {market.get("category") or "unspecified"}

EVIDENCE:
{corpus}

Design an ontology for reasoning about this market. Choose 4-8 entity types and 4-8
relationship types that best capture the actors and forces at play. Be specific to THIS
market (e.g. for BTC downside: Asset, Exchange, Regulator, MacroIndicator, MarketEvent).

Rules:
- entity_types: PascalCase nouns (e.g. "Asset", "Organization", "EconomicIndicator").
- relation_types: UPPER_SNAKE_CASE verbs (e.g. "INFLUENCES", "CORRELATES_WITH", "DRIVES").

Respond in this exact JSON shape:
{{
  "entity_types": ["...", "..."],
  "relation_types": ["...", "..."]
}}"""


def build_extract_prompt(
    market: dict[str, Any], ontology: dict[str, Any], corpus: str, *, max_nodes: int
) -> str:
    ets = ", ".join(ontology["entity_types"])
    rts = ", ".join(ontology["relation_types"])
    return f"""Market: {market["question"]}

ONTOLOGY
  entity types:   {ets}
  relation types: {rts}

EVIDENCE (cite the [n] index for every entity and relationship):
{corpus}

Extract the knowledge graph. At most {max_nodes} entities. Prefer entities and relationships
that bear on whether BTC finishes below the strike (downside risk).

For each entity: a short stable id (lowercase, hyphenated), a display label, a type from
the entity types above, a one-line summary, and the evidence index it came from.

Respond in this exact JSON shape:
{{
  "nodes": [
    {{"id": "federal-reserve", "label": "Federal Reserve", "type": "Organization",
      "summary": "Sets rates affecting BTC", "evidence": 1}}
  ],
  "edges": [
    {{"source": "federal-reserve", "target": "btc-price", "type": "INFLUENCES",
      "rationale": "Rate decisions move risk assets", "evidence": 1}}
  ]
}}"""


def _pascal(s: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", str(s).strip())
    return "".join(p[:1].upper() + p[1:] for p in parts if p) or "Entity"


def _upper_snake(s: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", str(s).strip())
    return "_".join(p.upper() for p in parts if p) or "RELATED_TO"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(s).strip().lower()).strip("-") or "node"


def salvage_ontology(text: str) -> dict[str, Any] | None:
    """Recover entity/relation types from truncated LLM JSON."""
    if not text:
        return None
    body = text.strip()
    if body.startswith("```"):
        body = re.sub(r"^```(?:json)?\s*", "", body)
        body = re.sub(r"\s*```$", "", body)
    ent_match = re.search(r'"entity_types"\s*:\s*\[(.*?)\]', body, re.S)
    if not ent_match:
        return None
    try:
        entity_types = json.loads("[" + ent_match.group(1) + "]")
    except json.JSONDecodeError:
        return None
    rel_match = re.search(r'"relation_types"\s*:\s*\[(.*?)(?:\]|$)', body, re.S)
    relation_types: list[str] = []
    if rel_match:
        chunk = rel_match.group(1).strip().rstrip(",")
        if chunk:
            try:
                relation_types = json.loads("[" + chunk + "]")
            except json.JSONDecodeError:
                relation_types = [
                    re.sub(r'^"|"$', "", p.strip())
                    for p in chunk.split(",")
                    if p.strip()
                ]
    if not relation_types:
        relation_types = ["INFLUENCES", "DRIVES", "CORRELATES_WITH", "TRIGGERS", "RELATED_TO"]
    return validate_ontology({
        "entity_types": entity_types,
        "relation_types": relation_types,
    })


def fallback_ontology(market: dict[str, Any]) -> dict[str, Any] | None:
    """Deterministic BTC downside ontology when the LLM response is truncated."""
    q = str(market.get("question", "")).lower()
    cat = str(market.get("category", "")).lower()
    if "btc" in q or "bitcoin" in q or cat == "crypto":
        return {
            "entity_types": [
                "Asset",
                "Organization",
                "EconomicIndicator",
                "MarketEvent",
                "Regulator",
                "RiskFactor",
            ],
            "relation_types": [
                "INFLUENCES",
                "DRIVES",
                "CORRELATES_WITH",
                "TRIGGERS",
                "RELATED_TO",
            ],
        }
    return None


def validate_ontology(parsed: Any) -> dict[str, Any] | None:
    if not isinstance(parsed, dict):
        return None
    ents = parsed.get("entity_types")
    rels = parsed.get("relation_types")
    if not isinstance(ents, list) or not isinstance(rels, list) or not ents or not rels:
        return None
    entity_types = list(dict.fromkeys(_pascal(e) for e in ents if str(e).strip()))[:10]
    relation_types = list(dict.fromkeys(_upper_snake(r) for r in rels if str(r).strip()))[:12]
    if not entity_types or not relation_types:
        return None
    return {"entity_types": entity_types, "relation_types": relation_types}


def validate_graph(
    parsed: Any,
    ontology: dict[str, Any],
    search_hits: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not isinstance(parsed, dict):
        return [], []
    entity_types = ontology["entity_types"]
    relation_types = set(ontology["relation_types"])
    catchall = entity_types[-1]

    def _source(idx: Any) -> tuple[str | None, str | None]:
        try:
            hit = search_hits[int(idx) - 1]
            return hit.get("url"), hit.get("published_date")
        except (TypeError, ValueError, IndexError):
            return None, None

    nodes: list[dict[str, Any]] = []
    by_key: dict[str, dict[str, Any]] = {}
    for n in parsed.get("nodes", []) or []:
        if not isinstance(n, dict) or not n.get("label"):
            continue
        key = _slug(n.get("id") or n["label"])
        if key in by_key:
            continue
        ntype = _pascal(n.get("type") or catchall)
        if ntype not in entity_types:
            ntype = catchall
        url, date = _source(n.get("evidence"))
        node = {
            "id": key,
            "label": str(n["label"])[:80],
            "type": ntype,
            "summary": str(n.get("summary", ""))[:200],
            "source_url": url,
            "published_date": date,
            "degree": 0,
        }
        by_key[key] = node
        nodes.append(node)

    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for e in parsed.get("edges", []) or []:
        if not isinstance(e, dict):
            continue
        src = _slug(e.get("source") or "")
        tgt = _slug(e.get("target") or "")
        if src not in by_key or tgt not in by_key or src == tgt:
            continue
        etype = _upper_snake(e.get("type") or "RELATED_TO")
        if etype not in relation_types:
            etype = "RELATED_TO"
        sig = (src, tgt, etype)
        if sig in seen:
            continue
        seen.add(sig)
        url, date = _source(e.get("evidence"))
        edges.append({
            "source": src,
            "target": tgt,
            "type": etype,
            "rationale": str(e.get("rationale", ""))[:200],
            "source_url": url,
            "published_date": date,
        })
        by_key[src]["degree"] += 1
        by_key[tgt]["degree"] += 1

    return nodes, edges


def fallback_extract_from_hits(
    search_hits: list[dict[str, Any]],
    ontology: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Rule-based graph when the extract LLM call fails."""
    entity_types = ontology["entity_types"]
    asset_type = "Asset" if "Asset" in entity_types else entity_types[0]
    event_type = next(
        (t for t in entity_types if t in ("MarketEvent", "RiskFactor", "EconomicIndicator")),
        entity_types[-1],
    )
    nodes: list[dict[str, Any]] = [{
        "id": "bitcoin",
        "label": "Bitcoin",
        "type": asset_type,
        "summary": "Underlying asset for the downside hedge",
        "source_url": None,
        "published_date": None,
        "degree": 0,
    }]
    edges: list[dict[str, Any]] = []
    seen: set[str] = {"bitcoin"}
    for i, hit in enumerate(search_hits[: settings.graphrag_max_nodes - 1], start=1):
        title = str(hit.get("title") or f"Event {i}")[:80]
        key = _slug(title) or f"event-{i}"
        if key in seen:
            key = f"{key}-{i}"
        seen.add(key)
        nodes.append({
            "id": key,
            "label": title,
            "type": event_type,
            "summary": str(hit.get("content") or title)[:200],
            "source_url": hit.get("url"),
            "published_date": hit.get("published_date"),
            "degree": 0,
        })
        edges.append({
            "source": key,
            "target": "bitcoin",
            "type": "INFLUENCES" if "INFLUENCES" in ontology["relation_types"] else "RELATED_TO",
            "rationale": "Evidence-linked downside pressure on BTC",
            "source_url": hit.get("url"),
            "published_date": hit.get("published_date"),
        })
        nodes[0]["degree"] += 1
        nodes[-1]["degree"] += 1
    return nodes, edges
