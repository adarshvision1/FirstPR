import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from brotli_asgi import BrotliMiddleware

from .api.routes import router
from .core.concurrency import ConcurrencyManager
from .core.config import settings
from .core.network import HTTPClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting FirstPR API...")
    HTTPClient.init()
    ConcurrencyManager.init()
    yield
    # Shutdown
    logger.info("Shutting down FirstPR API...")
    await HTTPClient.close()
    ConcurrencyManager.shutdown()


app = FastAPI(
    title="FirstPR API",
    description="Backend for FirstPR - Open Source Contributor Onboarding",
    version="1.0.0",
    lifespan=lifespan,
)

# Compression middleware (Brotli with gzip fallback)
app.add_middleware(BrotliMiddleware, minimum_size=500, gzip_fallback=True)

# Parse CORS origins from settings
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
logger.info(f"CORS enabled for origins: {cors_origins}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to FirstPR API"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "firstpr-backend"}
