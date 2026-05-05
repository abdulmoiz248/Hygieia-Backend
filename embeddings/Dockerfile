FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies (upgrade pip and retry to avoid transient network timeouts)
RUN python -m pip install --upgrade pip setuptools wheel && \
    /bin/sh -c 'for i in 1 2 3 4 5; do pip install --no-cache-dir -r requirements.txt && break || { echo "pip install failed, retrying ($i)..."; sleep 5; }; done'

# Copy application code
COPY . .

# Create directory for FAISS data
RUN mkdir -p /app/cvs

# Expose port
ARG PORT=4008
ENV PORT=${PORT}
EXPOSE ${PORT}

# Run the application
CMD ["python", "main.py"]
