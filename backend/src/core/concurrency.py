import asyncio
import logging
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor
from typing import Any

logger = logging.getLogger(__name__)


class ConcurrencyManager:
    _executor: ProcessPoolExecutor | None = None

    @classmethod
    def init(cls, max_workers: int = 4):
        if cls._executor is None:
            logger.info(f"Initializing ProcessPoolExecutor with {max_workers} workers")
            cls._executor = ProcessPoolExecutor(max_workers=max_workers)

    @classmethod
    def shutdown(cls):
        if cls._executor:
            logger.info("Shutting down ProcessPoolExecutor")
            cls._executor.shutdown(wait=True)
            cls._executor = None

    @classmethod
    async def run_cpu_bound(cls, func: Callable, *args: Any) -> Any:
        """
        Runs a CPU-bound function in the process pool to avoid blocking the event loop.
        """
        if cls._executor is None:
            # Fallback if not initialized (e.g., during tests without full app startup)
            logger.warning(
                "Executor not initialized, running blocking call in main thread (fallback)"
            )
            return func(*args)

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(cls._executor, func, *args)
