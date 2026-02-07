# FirstPR

Gemini 3 powered repository analysis and onboarding assistant.

## Features

- **Repository Analysis**: AI-powered analysis of GitHub repositories with detailed insights
- **Two-Step LLM Pipeline**: Advanced comprehensive explanation system using meta-prompt generation
- **Contributor Onboarding**: Structured guides for new open-source contributors
- **Interactive Chat**: Ask questions about repositories and get instant answers
- **File-Level Explanations**: AI-generated explanations for any file in a repository
- **Activity Analysis**: Track repository activity, health, and contributor patterns
- **Issue & PR Intelligence**: Smart recommendations for first-time contributors

## Documentation

- **[CONTRIBUTOR_ONBOARDING_GUIDE.md](./CONTRIBUTOR_ONBOARDING_GUIDE.md)**: Comprehensive guide explaining the two-step LLM pipeline for repository explanation, including:
  - Data collection & preparation strategies
  - Chunking rules and token budgeting
  - Meta-prompt generation techniques
  - Detailed sections for project understanding
  - Actionable starter tasks for new contributors

## Quick Start

### Backend
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Setup environment (if not done):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt # or manually install dependencies
   cp .env.example .env # edit .env with your keys
   ```
3. Run the server:
   ```bash
   .venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000
   ```

### Frontend
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

### CLI Tool
Use the CLI to test analysis directly:
```bash
.\backend\.venv\Scripts\python.exe backend/firstpr-cli.py analyze octocat/Hello-World
```

## Testing
To run backend tests:
```bash
# Run all tests
cd backend
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_chunking.py -v

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=term-missing
```

On Windows:
```bash
$env:GOOGLE_API_KEY="test"; .\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_github_client.py
```

## API Endpoints

### Standard Analysis
- `POST /api/analyze` - Start repository analysis (async)
- `GET /api/analyze/{job_id}/status` - Check analysis status
- `GET /api/analyze/{job_id}/result` - Get analysis results

### Comprehensive Explanation (Two-Step Pipeline)
- `POST /api/repos/{owner}/{repo}/explain-comprehensive` - Generate comprehensive onboarding guide using advanced two-step LLM pipeline

### Repository Information
- `GET /api/repos/{owner}/{repo}/readme` - Fetch README
- `GET /api/repos/{owner}/{repo}/tree` - Get file tree
- `GET /api/repos/{owner}/{repo}/contents/{path}` - Get file content
- `GET /api/repos/{owner}/{repo}/activity-status` - Get activity metrics
- `GET /api/repos/{owner}/{repo}/issues` - Get issues with rankings
- `GET /api/repos/{owner}/{repo}/pull-requests` - Get PRs with analysis

### AI Services
- `POST /api/chat` - Chat about repositories
- `POST /api/explain-file` - Get AI explanation of a specific file

## Docker Quick Start (Recommended)
The easiest way to run the application is with Docker Compose.

1. Ensure [Docker](https://www.docker.com/products/docker-desktop) is installed.
2. Create a `.env` file in the root directory and set your `GOOGLE_API_KEY` and `GITHUB_TOKEN`.
3. Run:
   ```bash
   docker-compose up --build
   ```
4. Open [http://localhost:3000](http://localhost:3000) for the app.
   The backend API will be available at [http://localhost:8000/api](http://localhost:8000/api).

## Deployment
See [DEPLOY.md](DEPLOY.md) for Google Cloud Run deployment instructions.
