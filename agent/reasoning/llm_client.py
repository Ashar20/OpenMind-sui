"""LLM client for GraphRAG — Gemini primary, Anthropic/Bedrock fallbacks."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Protocol

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from config import settings
from logging_util import get_logger

log = get_logger(__name__)

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)
_JSON_OBJECT_RE = re.compile(r"(\{.*\}|\[.*\])", re.DOTALL)


class BudgetExceeded(RuntimeError):
    pass


@dataclass
class LLMResponse:
    text: str
    parsed: Any
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model_id: str
    stop_reason: str | None = None


class LLMClient(Protocol):
    def complete_json(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        per_call_usd_cap: float | None = None,
    ) -> LLMResponse: ...


def _safe_json_loads(text: str) -> Any:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = _JSON_BLOCK_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    m = _JSON_OBJECT_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            return None
    return None


class GeminiClient:
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        from google import genai

        self._client = genai.Client(api_key=settings.gemini_api_key)

    @retry(
        reraise=True,
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
    )
    def complete_json(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        per_call_usd_cap: float | None = None,
    ) -> LLMResponse:
        from google.genai import types

        model_id = model or settings.gemini_model
        resp = self._client.models.generate_content(
            model=model_id,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        text = (resp.text or "").strip()
        usage = getattr(resp, "usage_metadata", None)
        in_tok = int(getattr(usage, "prompt_token_count", 0) or 0)
        out_tok = int(getattr(usage, "candidates_token_count", 0) or 0)
        cost = settings.cost_usd(in_tok, out_tok)
        return LLMResponse(
            text=text,
            parsed=_safe_json_loads(text),
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=cost,
            model_id=model_id,
            stop_reason=None,
        )


class AnthropicClient:
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        import anthropic
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    @retry(
        reraise=True,
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
    )
    def complete_json(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        per_call_usd_cap: float | None = None,
    ) -> LLMResponse:
        model_id = model or settings.anthropic_model
        msg = self._client.messages.create(
            model=model_id,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            temperature=temperature,
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text"))
        in_tok = int(getattr(msg.usage, "input_tokens", 0) or 0)
        out_tok = int(getattr(msg.usage, "output_tokens", 0) or 0)
        cost = settings.cost_usd(in_tok, out_tok)
        return LLMResponse(
            text=text,
            parsed=_safe_json_loads(text),
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=cost,
            model_id=model_id,
            stop_reason=getattr(msg, "stop_reason", None),
        )


class BedrockClient:
    """Optional Bedrock path from openmind-main."""

    def __init__(self, *, region: str | None = None) -> None:
        import boto3
        from botocore.config import Config as BotoConfig

        cfg = BotoConfig(retries={"max_attempts": 3, "mode": "adaptive"}, read_timeout=120)
        kwargs: dict[str, Any] = {
            "region_name": region or settings.aws_region,
            "config": cfg,
        }
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            if settings.aws_session_token:
                kwargs["aws_session_token"] = settings.aws_session_token
        self._client = boto3.client("bedrock-runtime", **kwargs)

    @retry(
        reraise=True,
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
    )
    def complete_json(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        per_call_usd_cap: float | None = None,
    ) -> LLMResponse:
        model_id = model or settings.bedrock_model_id
        resp = self._client.converse(
            modelId=model_id,
            system=[{"text": system}],
            messages=[{"role": "user", "content": [{"text": user}]}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": temperature},
        )
        usage = resp.get("usage") or {}
        in_tok = int(usage.get("inputTokens", 0))
        out_tok = int(usage.get("outputTokens", 0))
        blocks = resp.get("output", {}).get("message", {}).get("content", [])
        text = "".join(b.get("text", "") for b in blocks if isinstance(b, dict))
        return LLMResponse(
            text=text.strip(),
            parsed=_safe_json_loads(text),
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=settings.cost_usd(in_tok, out_tok),
            model_id=model_id,
            stop_reason=resp.get("stopReason"),
        )


_client_singleton: LLMClient | None = None


def get_client() -> LLMClient:
    global _client_singleton
    if _client_singleton is not None:
        return _client_singleton
    if settings.gemini_api_key:
        _client_singleton = GeminiClient()
        log.info("llm provider=gemini model=%s", settings.gemini_model)
        return _client_singleton
    if settings.anthropic_api_key:
        _client_singleton = AnthropicClient()
        log.info("llm provider=anthropic")
        return _client_singleton
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        _client_singleton = BedrockClient()
        log.info("llm provider=bedrock")
        return _client_singleton
    raise RuntimeError(
        "GraphRAG requires GEMINI_API_KEY, ANTHROPIC_API_KEY, or AWS credentials for Bedrock"
    )
