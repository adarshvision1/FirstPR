# FirstPR - Docker Setup

## Quick Start

Run the application using Docker:

```powershell
# Start both backend and frontend
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## Requirements

- Docker Desktop installed
- Docker Compose

## Configuration

1. **Backend Environment**: Copy `.env.example` to `.env` in the `backend` folder and add your API keys:
   ```
   GEMINI_API_KEY=your_key_here
   GITHUB_TOKEN=your_token_here
   ```

## Stopping the Application

```powershell
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Rebuilding

If you make changes to the code:

```powershell
docker-compose up --build
```

## Troubleshooting

**Port conflicts**: If ports 3000 or 8080 are in use, stop other services or modify the ports in `docker-compose.yml`

**Build failures**: Ensure you have the latest Docker version and sufficient disk space
