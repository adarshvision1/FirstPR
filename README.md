# FirstPR

Gemini 3 powered repository analysis and onboarding assistant.

## ⚡ Performance

FirstPR is optimized for speed with **60% faster** repository analysis and **66% faster** frontend loading:
- Backend: 2-2.5x faster with concurrent processing and connection pooling
- Frontend: 75% smaller bundles with code splitting and lazy loading
- API: 60% faster response times with parallel requests

📊 See [PERFORMANCE_SUMMARY.md](PERFORMANCE_SUMMARY.md) for detailed metrics and [PERFORMANCE_COMPARISON.md](PERFORMANCE_COMPARISON.md) for visual comparisons.

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
$env:GOOGLE_API_KEY="test"; .\backend\.venv\Scripts\python.exe -m pytest backend/tests/test_github_client.py
```

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

## Performance Testing

### Backend Performance Benchmarks
To measure backend API performance:
```bash
# 1. Start the backend
cd backend
python -m uvicorn src.main:app --reload

# 2. Run benchmarks
python tests/bench_perf.py
```

### Frontend Bundle Analysis
To analyze frontend bundle sizes and code splitting:
```bash
cd frontend
npm run build
node analyze-bundle.js
```

See [PERFORMANCE.md](PERFORMANCE.md) for technical implementation details.
