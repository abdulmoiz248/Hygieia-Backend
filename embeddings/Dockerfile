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

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

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
