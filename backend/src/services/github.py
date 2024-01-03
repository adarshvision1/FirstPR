import httpx
from typing import Dict, Any, List, Optional, Union
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log
import logging
from ..core.config import settings

logger = logging.getLogger(__name__)

class RateLimitExceeded(Exception):
    def __init__(self, message, reset_time=None):
        super().__init__(message)
        self.reset_time = reset_time

class ContentTooLarge(Exception):
    pass

class GitHubClient: # Renamed from GitHubService to match user request spec
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.default_headers = {
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "FirstPR-Analyzer/1.0"
        }

    def _get_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = self.default_headers.copy()
        # User token takes precedence, then system token
        effective_token = token or settings.GITHUB_TOKEN
        if effective_token:
            headers["Authorization"] = f"Bearer {effective_token}"
        return headers

    def _check_rate_limit(self, response: httpx.Response):
        self.last_rate_limit_remaining = int(response.headers.get("X-RateLimit-Remaining", -1))
        self.last_rate_limit_reset = response.headers.get("X-RateLimit-Reset")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout)),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    async def _request(self, method: str, url: str, token: Optional[str] = None, params: Dict = None) -> httpx.Response:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = self._get_headers(token)
            response = await client.request(method, url, headers=headers, params=params)
            
            # Handle Rate Limiting (403 or 429) explicitly if needed, 
            # or let HTTPStatusError be raised and caught/retried if we want
            if response.status_code in [403, 429]:
                # Check for rate limit headers
                remaining = response.headers.get("X-RateLimit-Remaining")
                if remaining == "0":
                    reset_time = response.headers.get("X-RateLimit-Reset")
                    raise RateLimitExceeded(f"GitHub Rate Limit Exceeded. Resets at {reset_time}")
            
            response.raise_for_status()
            
            # Extract and log rate limits for observability
            self._check_rate_limit(response)
            
            return response
            
    async def wait_for_rate_limit(self):
        """Helper to pause if close to limit - simplistic implementation"""
        if getattr(self, 'last_rate_limit_remaining', 100) < 5:
            reset_time = getattr(self, 'last_rate_limit_reset', 0)
            import time
            wait_time = float(reset_time) - time.time() + 1
            if wait_time > 0 and wait_time < 60: # Only wait if reasonable
                logger.warning(f"Rate limit low. Waiting {wait_time}s...")
                import asyncio
                await asyncio.sleep(wait_time)

    async def get_repo_metadata(self, owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
        resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}", token=token)
        return resp.json()

    async def get_file_tree(self, owner: str, repo: str, ref: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
        # Using recursive=1. Warning: large repos can fail here. 
        # Future improvement: Handle truncation (response['truncated'])
        resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}/git/trees/{ref}", token=token, params={"recursive": "1"})
        data = resp.json()
        if data.get("truncated"):
            logger.warning(f"Tree for {owner}/{repo} is truncated.")
        return data.get("tree", [])

    async def get_file_content(self, owner: str, repo: str, path: str, token: Optional[str] = None) -> str:
        # 1MB limit for analysis to prevent memory issues
        MAX_SIZE = 1_000_000 
        
        try:
            resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}/contents/{path}", token=token)
            data = resp.json()
            
            if isinstance(data, list):
                # It's a directory, not a file
                return ""
                
            if data.get("size", 0) > MAX_SIZE:
                logger.warning(f"File {path} too large: {data['size']} bytes")
                return "" # or raise ContentTooLarge
                
            if "content" in data:
                import base64
                return base64.b64decode(data["content"]).decode('utf-8', errors='ignore')
            return ""
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return "" 
            raise

    async def get_repo_languages(self, owner: str, repo: str, token: Optional[str] = None) -> Dict[str, int]:
        resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}/languages", token=token)
        return resp.json()

    async def get_issues(self, owner: str, repo: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
        resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}/issues", token=token, params={"state": "open", "per_page": 20, "sort": "updated"})
        return resp.json()

    async def get_pull_requests(self, owner: str, repo: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
        # Fetch top 10 most recent PRs (open or closed)
        params = {"state": "all", "sort": "created", "direction": "desc", "per_page": 10}
        resp = await self._request("GET", f"{self.base_url}/repos/{owner}/{repo}/pulls", token=token, params=params)
        return resp.json()

    async def get_rate_limit_status(self, token: Optional[str] = None) -> Dict[str, Any]:
        resp = await self._request("GET", f"{self.base_url}/rate_limit", token=token)
        return resp.json()

github_client = GitHubClient()
