FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PDM
RUN pip install pdm

# Copy dependency files
COPY pyproject.toml pdm.lock* ./

# Install dependencies
RUN pdm install --prod --no-lock --no-editable

# Copy application code
COPY src ./src

# Expose port
EXPOSE 8000

# Run the application
CMD ["pdm", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
