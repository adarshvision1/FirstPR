# FirstPR

AI-powered repository analysis and onboarding assistant.

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
