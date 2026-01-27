# Root Dockerfile for Railway deployment
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
# Disable pip hash checking explicitly
ENV PIP_NO_REQUIRE_HASHES=1
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Copy startup script
COPY backend/start.sh .
RUN chmod +x start.sh

# Expose port
EXPOSE 8080

# Run the application using startup script
CMD ["./start.sh"]
