import logging

import httpx

logger = logging.getLogger(__name__)


class HTTPClient:
    _instance: httpx.AsyncClient | None = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._instance is None:
            raise RuntimeError("HTTPClient not initialized. Call init() first.")
        return cls._instance

    @classmethod
    def init(cls):
        if cls._instance is None:
            logger.info("Initializing Global HTTP Client with connection pooling")
            limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)
            timeout = httpx.Timeout(10.0, connect=10.0, read=30.0, write=10.0)
            cls._instance = httpx.AsyncClient(
                limits=limits, timeout=timeout, follow_redirects=True
            )

    @classmethod
    async def close(cls):
        if cls._instance:
            logger.info("Closing Global HTTP Client")
            await cls._instance.aclose()
            cls._instance = None
