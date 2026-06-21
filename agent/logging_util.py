"""Lightweight logging for agent modules."""
from __future__ import annotations

import logging
import sys

_configured = False


def get_logger(name: str | None = None) -> logging.Logger:
    global _configured
    if not _configured:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
            stream=sys.stderr,
        )
        for noisy in ("urllib3", "httpx"):
            logging.getLogger(noisy).setLevel(logging.WARNING)
        _configured = True
    return logging.getLogger(name or "openmind")
