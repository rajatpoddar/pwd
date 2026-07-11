FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create data directory (persisted via volume)
RUN mkdir -p /app/data

# Non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 7730

CMD ["gunicorn", "--bind", "0.0.0.0:7730", "--workers", "2", "--timeout", "60", "app:app"]
