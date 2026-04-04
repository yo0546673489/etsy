"""
Circuit Breaker for Etsy API calls.

Three-state circuit breaker (closed / open / half-open) that tracks
consecutive failures per shop and prevents cascading API calls when
Etsy is returning errors.

    CLOSED  ──(N consecutive failures)──>  OPEN
    OPEN    ──(cooldown elapsed)──────>    HALF_OPEN
    HALF_OPEN ──(probe succeeds)──────>   CLOSED
    HALF_OPEN ──(probe fails)─────────>   OPEN

State is persisted in Redis so worker restarts do NOT reset the breaker.
"""
import time
import logging
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(Exception):
    """Raised when a request is rejected because the circuit is open."""

    def __init__(self, shop_id: int, retry_after: float):
        self.shop_id = shop_id
        self.retry_after = retry_after
        super().__init__(
            f"Circuit breaker OPEN for shop {shop_id}. "
            f"Retry after {retry_after:.0f}s."
        )


class _ShopCircuit:
    """Internal per-shop state."""

    __slots__ = (
        "state",
        "consecutive_failures",
        "last_failure_time",
        "last_success_time",
    )

    def __init__(self) -> None:
        self.state: CircuitState = CircuitState.CLOSED
        self.consecutive_failures: int = 0
        self.last_failure_time: float = 0.0
        self.last_success_time: float = 0.0


class CircuitBreaker:
    """
    In-process circuit breaker keyed by ``shop_id``.

    State is backed by Redis so it survives worker restarts.
    Falls back to in-memory if Redis is unavailable.

    Parameters
    ----------
    failure_threshold : int
        Number of consecutive 429 / 5xx errors before the circuit opens.
    cooldown_seconds : float
        How long the circuit stays open before moving to half-open.
    """

    REDIS_KEY_PREFIX = "cb:shop:"
    REDIS_TTL = 3600  # keep state for 1 hour max

    def __init__(
        self,
        failure_threshold: int = 5,
        cooldown_seconds: float = 300.0,  # 5 minutes (was 60s)
    ) -> None:
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._circuits: dict[int, _ShopCircuit] = {}
        self._redis = None

    def _get_redis(self):
        if self._redis is None:
            try:
                from app.core.redis import get_redis_client
                self._redis = get_redis_client()
            except Exception:
                pass
        return self._redis

    # ------------------------------------------------------------------
    # Redis persistence
    # ------------------------------------------------------------------

    def _redis_key(self, shop_id: int) -> str:
        return f"{self.REDIS_KEY_PREFIX}{shop_id}"

    def _load_from_redis(self, shop_id: int, circuit: _ShopCircuit) -> None:
        """Load circuit state from Redis into the in-memory circuit object."""
        redis = self._get_redis()
        if not redis:
            return
        try:
            import json
            raw = redis.get(self._redis_key(shop_id))
            if not raw:
                return
            data = json.loads(raw)
            circuit.state = CircuitState(data.get("state", CircuitState.CLOSED))
            circuit.consecutive_failures = data.get("consecutive_failures", 0)
            circuit.last_failure_time = data.get("last_failure_time", 0.0)
            circuit.last_success_time = data.get("last_success_time", 0.0)
        except Exception as _e:
            logger.debug(f"[circuit_breaker] Redis load failed for shop {shop_id}: {_e!r}")

    def _save_to_redis(self, shop_id: int, circuit: _ShopCircuit) -> None:
        """Persist circuit state to Redis."""
        redis = self._get_redis()
        if not redis:
            return
        try:
            import json
            data = {
                "state": circuit.state.value,
                "consecutive_failures": circuit.consecutive_failures,
                "last_failure_time": circuit.last_failure_time,
                "last_success_time": circuit.last_success_time,
            }
            redis.setex(self._redis_key(shop_id), self.REDIS_TTL, json.dumps(data))
        except Exception as _e:
            logger.debug(f"[circuit_breaker] Redis save failed for shop {shop_id}: {_e!r}")

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def _get(self, shop_id: int) -> _ShopCircuit:
        if shop_id not in self._circuits:
            circuit = _ShopCircuit()
            self._load_from_redis(shop_id, circuit)
            self._circuits[shop_id] = circuit
        return self._circuits[shop_id]

    def state(self, shop_id: int) -> CircuitState:
        """Return current state for a shop."""
        return self._get(shop_id).state

    # ------------------------------------------------------------------
    # Call-site API
    # ------------------------------------------------------------------

    def before_request(self, shop_id: int) -> None:
        """
        Call **before** making an Etsy API request.
        Raises ``CircuitOpenError`` if the circuit is open and cooldown
        has not elapsed.  Transitions OPEN -> HALF_OPEN when cooldown
        expires (allowing one probe request through).
        """
        circuit = self._get(shop_id)

        if circuit.state == CircuitState.CLOSED:
            return  # all good

        if circuit.state == CircuitState.OPEN:
            elapsed = time.monotonic() - circuit.last_failure_time
            if elapsed >= self.cooldown_seconds:
                # Transition to half-open — let one probe through
                circuit.state = CircuitState.HALF_OPEN
                self._save_to_redis(shop_id, circuit)
                logger.info(
                    "Circuit breaker HALF_OPEN for shop %s (cooldown elapsed)",
                    shop_id,
                )
                return
            raise CircuitOpenError(
                shop_id=shop_id,
                retry_after=self.cooldown_seconds - elapsed,
            )

        # HALF_OPEN — allow the probe request
        return

    def record_success(self, shop_id: int) -> None:
        """Call after a **successful** Etsy API response (2xx)."""
        circuit = self._get(shop_id)
        circuit.consecutive_failures = 0
        circuit.last_success_time = time.monotonic()

        if circuit.state != CircuitState.CLOSED:
            logger.info(
                "Circuit breaker CLOSED for shop %s (success)",
                shop_id,
            )
            circuit.state = CircuitState.CLOSED

        self._save_to_redis(shop_id, circuit)

    def record_failure(self, shop_id: int, status_code: Optional[int] = None) -> None:
        """
        Call after a **failed** Etsy API response (429 or 5xx).

        Only 429 and 5xx bump the failure counter.  4xx client errors
        (other than 429) are NOT counted — they indicate bad input,
        not an Etsy outage.
        """
        if status_code is not None and 400 <= status_code < 500 and status_code != 429:
            # Client error — don't trip the breaker
            return

        circuit = self._get(shop_id)
        circuit.consecutive_failures += 1
        circuit.last_failure_time = time.monotonic()

        if circuit.state == CircuitState.HALF_OPEN:
            # Probe failed — go back to open
            circuit.state = CircuitState.OPEN
            self._save_to_redis(shop_id, circuit)
            logger.warning(
                "Circuit breaker OPEN for shop %s (probe failed, status=%s)",
                shop_id,
                status_code,
            )
            return

        if circuit.consecutive_failures >= self.failure_threshold:
            circuit.state = CircuitState.OPEN
            self._save_to_redis(shop_id, circuit)
            logger.warning(
                "Circuit breaker OPEN for shop %s (%d consecutive failures)",
                shop_id,
                circuit.consecutive_failures,
            )

    def reset(self, shop_id: int) -> None:
        """Manually reset the circuit (e.g. admin override)."""
        if shop_id in self._circuits:
            del self._circuits[shop_id]
        redis = self._get_redis()
        if redis:
            try:
                redis.delete(self._redis_key(shop_id))
            except Exception as _e:
                logger.debug(f"[circuit_breaker] Redis delete failed for shop {shop_id}: {_e!r}")
        logger.info("Circuit breaker RESET for shop %s", shop_id)


# ── Module-level singleton ───────────────────────────────────────
_circuit_breaker: Optional[CircuitBreaker] = None


def get_circuit_breaker() -> CircuitBreaker:
    """Get or create the circuit breaker singleton."""
    global _circuit_breaker
    if _circuit_breaker is None:
        _circuit_breaker = CircuitBreaker()
    return _circuit_breaker
