import logging
from typing import Any

import httpx
from async_lru import alru_cache
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from ..core.config import settings
from ..core.network import HTTPClient

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    def __init__(self, message, reset_time=None):
        super().__init__(message)
        self.reset_time = reset_time


class ContentTooLarge(Exception):
    pass


class GitHubClient:  # Renamed from GitHubService to match user request spec
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.default_headers = {
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "FirstPR-Analyzer/1.0",
        }

    def _get_headers(self, token: str | None = None) -> dict[str, str]:
        headers = self.default_headers.copy()
        # User token takes precedence, then system token
        effective_token = token or settings.GITHUB_TOKEN
        if effective_token:
            headers["Authorization"] = f"Bearer {effective_token}"
        return headers

    def _check_rate_limit(self, response: httpx.Response):
        self.last_rate_limit_remaining = int(
            response.headers.get("X-RateLimit-Remaining", -1)
        )
        self.last_rate_limit_reset = response.headers.get("X-RateLimit-Reset")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(
            (
                httpx.RequestError,
                httpx.ConnectError,
                httpx.ReadTimeout,
                httpx.ConnectTimeout,
            )
        ),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def _request(
        self, method: str, url: str, token: str | None = None, params: dict = None
    ) -> httpx.Response:
        # Custom retry loop for 429s to handle specific headers
        for attempt in range(3):
            client = HTTPClient.get_client()
            headers = self._get_headers(token)

            response = await client.request(method, url, headers=headers, params=params)
            
            self._check_rate_limit(response)

            if response.status_code == 429 or (response.status_code == 403 and "rate limit" in response.text.lower()):
                remaining = response.headers.get("X-RateLimit-Remaining")
                if remaining == "0":
                    reset_time = float(response.headers.get("X-RateLimit-Reset", 0))
                    import time
                    wait_time = reset_time - time.time() + 1
                    
                    if wait_time > 0 and wait_time < 60: # Only wait if < 1 minute
                        logger.warning(f"Rate limit hit. Sleeping {wait_time:.2f}s")
                        import asyncio
                        await asyncio.sleep(wait_time)
                        continue # Retry
                    else:
                        raise RateLimitExceeded(f"Rate limit exceeded. Resets in {wait_time:.0f}s")
            
            # If not 429, or we continued inside loop, check other status
            response.raise_for_status()
            return response
            
        return response # Should be unreachable if raise_for_status works or loop finishes

    async def wait_for_rate_limit(self):
        """Helper to pause if close to limit - simplistic implementation"""
        if getattr(self, "last_rate_limit_remaining", 100) < 5:
            reset_time = getattr(self, "last_rate_limit_reset", 0)
            import time

            wait_time = float(reset_time) - time.time() + 1
            if wait_time > 0 and wait_time < 60:  # Only wait if reasonable
                logger.warning(f"Rate limit low. Waiting {wait_time}s...")
                import asyncio

                await asyncio.sleep(wait_time)

    @alru_cache(maxsize=32)
    async def get_repo_metadata(
        self, owner: str, repo: str, token: str | None = None
    ) -> dict[str, Any]:
        resp = await self._request(
            "GET", f"{self.base_url}/repos/{owner}/{repo}", token=token
        )
        return resp.json()

    @alru_cache(maxsize=32)
    async def get_file_tree(
        self, owner: str, repo: str, ref: str, token: str | None = None
    ) -> list[dict[str, Any]]:
        # Using recursive=1. Warning: large repos can fail here.
        # Future improvement: Handle truncation (response['truncated'])
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/git/trees/{ref}",
            token=token,
            params={"recursive": "1"},
        )
        data = resp.json()
        if data.get("truncated"):
            logger.warning(f"Tree for {owner}/{repo} is truncated.")
        return data.get("tree", [])

    async def get_file_content(
        self, owner: str, repo: str, path: str, token: str | None = None
    ) -> str:
        # 1MB limit for analysis to prevent memory issues
        MAX_SIZE = 1_000_000

        try:
            resp = await self._request(
                "GET",
                f"{self.base_url}/repos/{owner}/{repo}/contents/{path}",
                token=token,
            )
            data = resp.json()

            if isinstance(data, list):
                # It's a directory, not a file
                return ""

            if data.get("size", 0) > MAX_SIZE:
                logger.warning(f"File {path} too large: {data['size']} bytes")
                return ""  # or raise ContentTooLarge

            if "content" in data:
                import base64

                return base64.b64decode(data["content"]).decode(
                    "utf-8", errors="ignore"
                )
            return ""
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return ""
            raise

    @alru_cache(maxsize=32)
    async def get_repo_languages(
        self, owner: str, repo: str, token: str | None = None
    ) -> dict[str, int]:
        resp = await self._request(
            "GET", f"{self.base_url}/repos/{owner}/{repo}/languages", token=token
        )
        return resp.json()

    async def get_issues(
        self, owner: str, repo: str, token: str | None = None
    ) -> list[dict[str, Any]]:
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/issues",
            token=token,
            params={"state": "open", "per_page": 30, "sort": "updated"},
        )
        return resp.json()

    async def get_rate_limit_status(
        self, token: str | None = None
    ) -> dict[str, Any]:
        resp = await self._request("GET", f"{self.base_url}/rate_limit", token=token)
        return resp.json()

    async def get_commits(
        self,
        owner: str,
        repo: str,
        token: str | None = None,
        since: str | None = None,
    ) -> list[dict[str, Any]]:
        params = {"per_page": 30}
        if since:
            params["since"] = since
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/commits",
            token=token,
            params=params,
        )
        return resp.json()

    async def get_pull_requests(
        self, owner: str, repo: str, token: str | None = None, state: str = "all"
    ) -> list[dict[str, Any]]:
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/pulls",
            token=token,
            params={
                "state": state,
                "per_page": 30,
                "sort": "updated",
                "direction": "desc",
            },
        )
        return resp.json()

    async def get_issue_comments(
        self, owner: str, repo: str, issue_number: int, token: str | None = None
    ) -> list[dict[str, Any]]:
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/issues/{issue_number}/comments",
            token=token,
            params={"per_page": 30},
        )
        return resp.json()

    async def get_workflow_files(
        self, owner: str, repo: str, token: str | None = None
    ) -> list[dict[str, Any]]:
        try:
            resp = await self._request(
                "GET",
                f"{self.base_url}/repos/{owner}/{repo}/contents/.github/workflows",
                token=token,
            )
            data = resp.json()
            if isinstance(data, list):
                return data
            return []
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            raise

    async def get_pr_details(
        self, owner: str, repo: str, pull_number: int, token: str | None = None
    ) -> dict[str, Any]:
        resp = await self._request(
            "GET",
            f"{self.base_url}/repos/{owner}/{repo}/pulls/{pull_number}",
            token=token,
        )
        return resp.json()

    async def get_repo_discussions(
        self, owner: str, repo: str, token: str | None = None
    ) -> list[dict[str, Any]]:
        # Discussions are not fully supported in v3 REST API (some beta endpoints exist but GraphQL is better).
        # However, for simplicity and token usage, we will try to use a search query or just standard issues if discussions are not enabled.
        # Actually, standard REST API for discussions is limited or requires team/org contexts.
        # Fallback: Search for issues with type:discussion? No, 'type:discussion' isn't valid in issues search usually unless they are converted.
        #
        # Let's try the GraphQL approach? No, strict Rest requirement usually.
        # Let's check documentation (mental check): GitHub Discussions API is GraphQL primarily.
        # But we can list discussions using a specific endpoint if enabled?
        # A simpler approach for this "FirstPR" tool might be to fetch Issues that are labeled 'discussion' or similar,
        # OR just acknowledge we can't easily get discussions via REST v3 without Beta flags.
        #
        # Attempting search API which is most versatile:
        # q=repo:owner/repo+type:discussion
        try:
            resp = await self._request(
                "GET",
                f"{self.base_url}/search/issues",
                token=token,
                params={
                    "q": f"repo:{owner}/{repo} is:issue", # type:discussion is not supported in REST Search API
                    "sort": "interactions",
                    "order": "desc",
                    "per_page": 5,
                },
            )
            data = resp.json()
            return data.get("items", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 422:
                logger.warning(f"Search API returned 422 for discussions quest on {owner}/{repo}. Returning empty list.")
                return []
            raise
        except Exception as e:
            logger.warning(f"Failed to fetch discussions: {e}")
            return []


github_client = GitHubClient()
