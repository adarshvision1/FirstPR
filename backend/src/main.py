from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.concurrency import ConcurrencyManager
from .core.config import settings
from .core.network import HTTPClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    HTTPClient.init()
    ConcurrencyManager.init()
    yield
    # Shutdown
    await HTTPClient.close()
    ConcurrencyManager.shutdown()


app = FastAPI(
    title="FirstPR API",
    description="Backend for FirstPR - Open Source Contributor Onboarding",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development simplicity
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
