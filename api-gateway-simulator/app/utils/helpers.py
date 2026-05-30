"""
Utility helpers for the API Gateway Simulator.
Provides async delay utilities, structured terminal logging configurations, and clean random fail rate calculation structures.
"""

import asyncio
import logging
import random
from typing import Optional

# Setup unified backend logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logger = logging.getLogger("SimulatorCore")


async def simulate_delay_ms(milliseconds: int):
    """
    Cooperative sleep utility to replicate actual network latency in microservices chains.
    """
    if milliseconds <= 0:
        return
    await asyncio.sleep(milliseconds / 1000.0)


def evaluate_simulated_failure(failure_percentage: float) -> bool:
    """
    Determine if a simulated failure has been triggered based on probability percentages.
    """
    if failure_percentage <= 0.0:
        return False
    if failure_percentage >= 100.0:
        return True
    return random.uniform(0.0, 100.0) < failure_percentage


def generate_short_uuid(prefix: str = "TX") -> str:
    """
    Generate clean, standard correlation and transaction IDs for monitoring logs.
    """
    import uuid
    short_hash = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{short_hash}"
