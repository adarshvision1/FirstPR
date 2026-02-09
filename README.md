# FirstPR

Gemini 3 powered repository analysis and onboarding assistant.

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

## Project Story
See [DEVPOST.md](DEVPOST.md) for the full project story — inspiration, architecture, challenges, and what we learned.

## Deployment
See [DEPLOY.md](DEPLOY.md) for Google Cloud Run deployment instructions.
