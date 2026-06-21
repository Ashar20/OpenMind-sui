"""Minimal agent config — env vars for vault cycle pipeline."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    load_dotenv(_ROOT / "deploy" / "testnet.env")
    load_dotenv(_ROOT / "agent" / ".env")


class Settings:
    def __init__(self) -> None:
        self.predict_server = os.environ.get(
            "PREDICT_SERVER", "https://predict-server.testnet.mystenlabs.com"
        )
        self.tavily_api_key = os.environ.get("TAVILY_API_KEY")
        self.tavily_max_results = int(os.environ.get("TAVILY_MAX_RESULTS", "8"))
        self.polymarket_gamma_url = os.environ.get(
            "POLYMARKET_GAMMA_URL", "https://gamma-api.polymarket.com"
        )
        self.news_hours_back = int(os.environ.get("NEWS_HOURS_BACK", "2"))
        self.strike_spot_bps = int(os.environ.get("VAULT_STRIKE_SPOT_BPS", "9900"))

        # GraphRAG / LLM
        self.graphrag_enabled = os.environ.get("GRAPHRAG_ENABLED", "true").lower() in (
            "1", "true", "yes",
        )
        self.graphrag_max_nodes = int(os.environ.get("GRAPHRAG_MAX_NODES", "30"))
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY")
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.gemini_cheap_model = os.environ.get(
            "GEMINI_CHEAP_MODEL", self.gemini_model
        )
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.anthropic_model = os.environ.get(
            "ANTHROPIC_MODEL", "claude-sonnet-4-6"
        )
        self.anthropic_cheap_model = os.environ.get(
            "ANTHROPIC_CHEAP_MODEL", self.anthropic_model
        )
        default_input_mtok = "0.15" if self.gemini_api_key else "3.0"
        default_output_mtok = "0.60" if self.gemini_api_key else "15.0"
        self.llm_input_usd_per_mtok = float(
            os.environ.get("LLM_INPUT_USD_PER_MTOK", default_input_mtok)
        )
        self.llm_output_usd_per_mtok = float(
            os.environ.get("LLM_OUTPUT_USD_PER_MTOK", default_output_mtok)
        )

        # Optional Bedrock (openmind-main path)
        self.aws_region = os.environ.get("AWS_REGION", "us-east-1")
        self.aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        self.aws_session_token = os.environ.get("AWS_SESSION_TOKEN")
        self.bedrock_model_id = os.environ.get(
            "BEDROCK_MODEL_ID", "apac.amazon.nova-lite-v1:0"
        )
        self.bedrock_model_id_cheap = os.environ.get("BEDROCK_MODEL_ID_CHEAP")

    @property
    def primary_model(self) -> str:
        if self.gemini_api_key:
            return self.gemini_model
        if self.anthropic_api_key:
            return self.anthropic_model
        return self.bedrock_model_id

    @property
    def cheap_model(self) -> str:
        if self.gemini_api_key:
            return self.gemini_cheap_model or self.gemini_model
        if self.anthropic_api_key:
            return self.anthropic_cheap_model or self.anthropic_model
        return self.bedrock_model_id_cheap or self.bedrock_model_id

    def cost_usd(self, input_tokens: int, output_tokens: int) -> float:
        return (
            input_tokens * self.llm_input_usd_per_mtok / 1_000_000
            + output_tokens * self.llm_output_usd_per_mtok / 1_000_000
        )


load_env()
settings = Settings()
