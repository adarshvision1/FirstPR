import pytest
from src.services.github import GitHubClient, RateLimitExceeded
from src.core.config import settings
import httpx
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def client():
    return GitHubClient()

@pytest.fixture
def mock_httpx_client(mocker):
    mock = AsyncMock(spec=httpx.AsyncClient)
    # Mock context manager
    mock.__aenter__.return_value = mock
    mock.__aexit__.return_value = None
    
    mocker.patch("httpx.AsyncClient", return_value=mock)
    return mock

@pytest.mark.asyncio
async def test_get_headers_with_system_token(mocker):
    mocker.patch.object(settings, "GITHUB_TOKEN", "system_token")
    client = GitHubClient()
    headers = client._get_headers()
    assert headers["Authorization"] == "Bearer system_token"

@pytest.mark.asyncio
async def test_get_headers_with_user_token():
    client = GitHubClient()
    headers = client._get_headers(token="user_token")
    assert headers["Authorization"] == "Bearer user_token"

@pytest.mark.asyncio
async def test_get_headers_priority(mocker):
    mocker.patch.object(settings, "GITHUB_TOKEN", "system_token")
    client = GitHubClient()
    headers = client._get_headers(token="user_token")
    assert headers["Authorization"] == "Bearer user_token"

@pytest.mark.asyncio
async def test_rate_limit_exceeded(mock_httpx_client):
    # Setup response
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 403
    mock_response.headers = {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1234567890"
    }
    mock_httpx_client.request.return_value = mock_response

    client = GitHubClient()
    
    with pytest.raises(RateLimitExceeded):
        await client._request("GET", "http://test.com")
