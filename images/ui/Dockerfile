# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency file first
COPY images/ui/pyproject.toml .

# Install dependencies
RUN uv pip install --system --no-cache .

# Stage 2: Runtime / Build the application
FROM python:3.11-slim as runtime

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/streamlit /usr/local/bin/streamlit

COPY src/ui/ .

EXPOSE 8501

# Start the app
CMD ["streamlit", "run", "main.py", "--server.address", "0.0.0.0", "--server.port", "8501"]
