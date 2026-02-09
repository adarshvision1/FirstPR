# Deployment Guide for FirstPR

## Quick Deploy to Railway

### Prerequisites
- GitHub repository with your code
- Railway account (free tier available)

### Steps

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `FirstPR` repository
   - Railway will auto-detect the Dockerfile

3. **Configure Environment Variables**
   In Railway dashboard, add these variables:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `GITHUB_TOKEN` - Your GitHub personal access token (optional, for higher rate limits)
   - `FRONTEND_URL` - Will be provided by Railway after deployment

4. **Deploy Frontend (Optional)**
   For the frontend, you can:
   - Deploy to Vercel/Netlify (recommended for static sites)
   - Or create a second Railway service for the frontend

### Alternative: Render.com

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect Docker
5. Set environment variables (same as above)
6. Click "Create Web Service"

### Alternative: Fly.io

1. Install Fly CLI: `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`
2. Run: `fly launch` (in project directory)
3. Follow the prompts
4. Set secrets: `fly secrets set GEMINI_API_KEY=your_key`
5. Deploy: `fly deploy`

## Environment Variables Required

- `GEMINI_API_KEY` - **Required** - Your Google Gemini API key
- `GITHUB_TOKEN` - Optional - GitHub token for API rate limits
- `DATABASE_URL` - Optional - PostgreSQL connection string (Railway provides this automatically)
- `REDIS_URL` - Optional - Redis connection string (for caching)

## Health Check

After deployment, verify the service is running:
```
https://your-app.railway.app/health
```

Should return: `{"status": "healthy"}`
