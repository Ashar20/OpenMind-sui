"""Ontology generation — one LLM call per vault cycle market."""
from __future__ import annotations

from typing import Any

from config import settings
from . import prompts
from logging_util import get_logger
from reasoning import llm_client

log = get_logger(__name__)


def generate_ontology(
    market: dict[str, Any],
    search_hits: list[dict[str, Any]],
    *,
    llm: llm_client.LLMClient | None = None,
) -> tuple[dict[str, Any] | None, llm_client.LLMResponse | None]:
    llm = llm or llm_client.get_client()
    corpus = prompts.build_corpus(search_hits)
    prompt = prompts.build_ontology_prompt(market, corpus)
    cheap = settings.cheap_model
    try:
        resp = llm.complete_json(
            system=prompts.ONTOLOGY_SYSTEM,
            user=prompt,
            model=cheap,
            max_tokens=8192,
            temperature=0.1,
        )
    except Exception as exc:
        log.warning("graphrag ontology llm failed market=%s err=%s", market.get("id"), exc)
        ontology = prompts.fallback_ontology(market)
        if ontology:
            log.info("graphrag using fallback ontology after llm error market=%s", market.get("id"))
        return ontology, None

    ontology = prompts.validate_ontology(resp.parsed)
    if ontology is None:
        ontology = prompts.salvage_ontology(resp.text or "")
    if ontology is None:
        log.warning(
            "graphrag ontology unparseable market=%s out_tokens=%s text=%r",
            market.get("id"),
            resp.output_tokens,
            (resp.text or "")[:200],
        )
        ontology = prompts.fallback_ontology(market)
        if ontology:
            log.info("graphrag using fallback ontology for market=%s", market.get("id"))
    return ontology, resp
