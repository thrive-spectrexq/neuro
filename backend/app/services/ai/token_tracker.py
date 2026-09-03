"""
Token usage tracking and cost monitoring.

Records AI provider token consumption per user for budget tracking,
cost optimization, and usage analytics.
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

logger = logging.getLogger("neuro.ai.token_tracker")

# Approximate cost per 1M tokens (USD) — updated periodically
_COST_PER_MILLION_TOKENS: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    "gemini-pro": {"input": 0.50, "output": 1.50},
    "llama3": {"input": 0.0, "output": 0.0},  # Local — free
    "all-MiniLM-L6-v2": {"input": 0.0, "output": 0.0},  # Local — free
}


@dataclass
class TokenUsageRecord:
    """A single token usage record."""

    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    user_id: str | None = None
    request_type: str = "chat"  # chat, summarize, embed, extract


@dataclass
class UsageSummary:
    """Aggregated usage summary for a time period."""

    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    by_provider: dict[str, dict[str, int | float]] = field(default_factory=dict)
    by_model: dict[str, dict[str, int | float]] = field(default_factory=dict)
    record_count: int = 0
    period_start: str | None = None
    period_end: str | None = None


class TokenTracker:
    """
    Track token usage and costs across AI providers.

    Stores usage records and provides aggregated summaries
    for budget monitoring and cost optimization.
    """

    def __init__(self) -> None:
        self._records: list[TokenUsageRecord] = []

    @staticmethod
    def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate cost in USD for given token counts.

        Args:
            model: Model name/identifier.
            input_tokens: Number of input/prompt tokens.
            output_tokens: Number of output/completion tokens.

        Returns:
            Estimated cost in USD.
        """
        rates = _COST_PER_MILLION_TOKENS.get(model, {"input": 0.0, "output": 0.0})
        input_cost = (input_tokens / 1_000_000) * rates["input"]
        output_cost = (output_tokens / 1_000_000) * rates["output"]
        return round(input_cost + output_cost, 6)

    async def record_usage(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        user_id: str | None = None,
        request_type: str = "chat",
        cost_usd: float | None = None,
    ) -> TokenUsageRecord:
        """
        Record a token usage event.

        Args:
            provider: AI provider name (openai, anthropic, ollama, etc.).
            model: Model identifier.
            input_tokens: Input/prompt tokens consumed.
            output_tokens: Output/completion tokens consumed.
            user_id: Optional user identifier.
            request_type: Type of request (chat, summarize, embed, etc.).
            cost_usd: Explicit cost override; auto-calculated if None.

        Returns:
            The created TokenUsageRecord.
        """
        if cost_usd is None:
            cost_usd = self.estimate_cost(model, input_tokens, output_tokens)

        record = TokenUsageRecord(
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            user_id=user_id,
            request_type=request_type,
        )

        self._records.append(record)
        logger.debug(f"Token usage: {provider}/{model} in={input_tokens} out={output_tokens} cost=${cost_usd:.6f}")

        # Emit Prometheus metrics if available
        try:
            from app.core.metrics import AI_TOKEN_USAGE

            AI_TOKEN_USAGE.labels(provider=provider, model=model, type="input").inc(input_tokens)
            AI_TOKEN_USAGE.labels(provider=provider, model=model, type="output").inc(output_tokens)
        except ImportError:
            pass

        return record

    async def get_usage_summary(
        self,
        user_id: str | None = None,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
    ) -> UsageSummary:
        """
        Get aggregated usage summary, optionally filtered by user and time period.

        Args:
            user_id: Filter to a specific user.
            period_start: Start of the period (inclusive).
            period_end: End of the period (inclusive).

        Returns:
            UsageSummary with totals and per-provider/model breakdowns.
        """
        filtered = self._records

        if user_id:
            filtered = [r for r in filtered if r.user_id == user_id]

        if period_start:
            start_iso = period_start.isoformat()
            filtered = [r for r in filtered if r.timestamp >= start_iso]

        if period_end:
            end_iso = period_end.isoformat()
            filtered = [r for r in filtered if r.timestamp <= end_iso]

        summary = UsageSummary(
            period_start=period_start.isoformat() if period_start else None,
            period_end=period_end.isoformat() if period_end else None,
            record_count=len(filtered),
        )

        for record in filtered:
            summary.total_input_tokens += record.input_tokens
            summary.total_output_tokens += record.output_tokens
            summary.total_cost_usd += record.cost_usd

            # By provider
            if record.provider not in summary.by_provider:
                summary.by_provider[record.provider] = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
            summary.by_provider[record.provider]["input_tokens"] += record.input_tokens
            summary.by_provider[record.provider]["output_tokens"] += record.output_tokens
            summary.by_provider[record.provider]["cost_usd"] += record.cost_usd

            # By model
            if record.model not in summary.by_model:
                summary.by_model[record.model] = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
            summary.by_model[record.model]["input_tokens"] += record.input_tokens
            summary.by_model[record.model]["output_tokens"] += record.output_tokens
            summary.by_model[record.model]["cost_usd"] += record.cost_usd

        summary.total_cost_usd = round(summary.total_cost_usd, 6)
        return summary

    async def check_budget(
        self,
        user_id: str,
        monthly_budget_usd: float = 50.0,
    ) -> tuple[bool, float]:
        """
        Check if a user is within their monthly budget.

        Args:
            user_id: User to check.
            monthly_budget_usd: Monthly budget limit in USD.

        Returns:
            Tuple of (within_budget: bool, remaining_usd: float).
        """
        now = datetime.now(UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        summary = await self.get_usage_summary(user_id=user_id, period_start=month_start)
        remaining = monthly_budget_usd - summary.total_cost_usd

        if remaining <= 0:
            logger.warning(
                f"User {user_id} has exceeded monthly budget: ${summary.total_cost_usd:.2f} / ${monthly_budget_usd:.2f}"
            )

        return remaining > 0, round(remaining, 2)
