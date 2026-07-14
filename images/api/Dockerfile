# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

#Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

#Copy dependency file first (layer caching)
COPY images/api/pyproject.toml .

#Install dependencies
RUN uv pip install --system --no-cache .

#Stage 2: Runtime / Build the application
FROM python:3.11-slim as runtime

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copy application code
COPY src/api/ .

# Expose port
EXPOSE 8000

# Start the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
