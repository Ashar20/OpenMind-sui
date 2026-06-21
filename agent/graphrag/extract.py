"""Entity + relationship extraction."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from config import settings
from . import prompts
from logging_util import get_logger
from reasoning import llm_client
from reasoning.llm_client import LLMResponse
from reasoning.temporal_guard import filter_results

log = get_logger(__name__)


def extract_graph(
    market: dict[str, Any],
    ontology: dict[str, Any],
    search_hits: list[dict[str, Any]],
    *,
    as_of: datetime,
    llm: llm_client.LLMClient | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], llm_client.LLMResponse]:
    llm = llm or llm_client.get_client()
    corpus = prompts.build_corpus(search_hits)
    prompt = prompts.build_extract_prompt(
        market, ontology, corpus, max_nodes=settings.graphrag_max_nodes
    )
    try:
        resp = llm.complete_json(
            system=prompts.EXTRACT_SYSTEM,
            user=prompt,
            max_tokens=8192,
            temperature=0.1,
        )
    except Exception as exc:
        log.warning("graphrag extract llm failed market=%s err=%s", market.get("id"), exc)
        nodes, edges = prompts.fallback_extract_from_hits(search_hits, ontology)
        return nodes, edges, LLMResponse(
            text="", parsed=None, input_tokens=0, output_tokens=0,
            cost_usd=0.0, model_id=settings.cheap_model,
        )

    nodes, edges = prompts.validate_graph(resp.parsed, ontology, search_hits)
    if not nodes:
        log.warning("graphrag extract unparseable — headline fallback market=%s", market.get("id"))
        nodes, edges = prompts.fallback_extract_from_hits(search_hits, ontology)
    nodes = filter_results(nodes, as_of, allow_undated=True)
    edges = filter_results(edges, as_of, allow_undated=True)
    keep = {n["id"] for n in nodes}
    edges = [e for e in edges if e["source"] in keep and e["target"] in keep]
    log.info(
        "graphrag extracted market=%s nodes=%s edges=%s",
        market.get("id"), len(nodes), len(edges),
    )
    return nodes, edges, resp
