"""openmind GraphRAG — ontology + entity graph per vault cycle."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from config import settings
from . import extract as _extract
from . import graph as _graph
from . import ontology as _ontology
from . import prompts
from logging_util import get_logger
from reasoning import llm_client

log = get_logger(__name__)

EmitFn = Callable[[str, dict[str, Any]], None]


@dataclass
class GraphResult:
    ontology: dict[str, Any]
    graph: dict[str, Any]
    summary: str
    cost_usd: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


def build_market_graph(
    market: dict[str, Any],
    search_hits: list[dict[str, Any]],
    *,
    as_of: datetime,
    emit: EmitFn | None = None,
    llm: llm_client.LLMClient | None = None,
) -> GraphResult | None:
    def _emit(event: str, data: dict[str, Any]) -> None:
        if emit:
            try:
                emit(event, data)
            except Exception:
                log.warning("graphrag emit failed event=%s", event)

    llm = llm or llm_client.get_client()
    cost = 0.0
    in_tok = 0
    out_tok = 0

    ontology, oresp = _ontology.generate_ontology(market, search_hits, llm=llm)
    if oresp:
        cost += oresp.cost_usd
        in_tok += oresp.input_tokens
        out_tok += oresp.output_tokens
    if not ontology:
        return None
    _emit("ontology_generated", {
        "entity_types": ontology["entity_types"],
        "relation_types": ontology["relation_types"],
    })

    nodes, edges, eresp = _extract.extract_graph(
        market, ontology, search_hits, as_of=as_of, llm=llm
    )
    if eresp:
        cost += eresp.cost_usd
        in_tok += eresp.input_tokens
        out_tok += eresp.output_tokens
    if not nodes:
        log.warning("graphrag extract empty — using headline fallback market=%s", market.get("id"))
        nodes, edges = prompts.fallback_extract_from_hits(search_hits, ontology)

    graph = _graph.build_graph(ontology, nodes, edges, max_nodes=settings.graphrag_max_nodes)
    for n in graph["nodes"]:
        _emit("entity_extracted", {"node": n})
    for e in graph["edges"]:
        _emit("relation_extracted", {"edge": e})
    _emit("graph_complete", {"stats": graph["stats"]})

    summary = _graph.summarize_for_prompt(graph)
    return GraphResult(
        ontology=ontology,
        graph=graph,
        summary=summary,
        cost_usd=cost,
        input_tokens=in_tok,
        output_tokens=out_tok,
        nodes=graph["nodes"],
        edges=graph["edges"],
        stats=graph["stats"],
    )
