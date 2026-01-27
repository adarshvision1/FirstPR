#!/bin/sh
# Startup script for Railway deployment
# Use PORT environment variable if set, otherwise default to 8080
PORT=${PORT:-8080}
exec uvicorn src.main:app --host 0.0.0.0 --port $PORT
