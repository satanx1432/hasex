#!/bin/bash

# Production RAG System - Quick Start Script

echo "=================================="
echo "Production RAG System - Quick Start"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo "  Please edit .env to configure your settings"
else
    echo "✓ .env file already exists"
fi

# Build and start services
echo ""
echo "Building Docker images and starting services..."
docker-compose up -d --build

echo ""
echo "=================================="
echo "Services Started"
echo "=================================="
echo "Qdrant: http://localhost:6333"
echo "API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Health check
echo ""
echo "Checking service health..."
HEALTH_CHECK=$(curl -s http://localhost:8000/health)
if [ $? -eq 0 ]; then
    echo "✓ API is healthy"
    echo "$HEALTH_CHECK"
else
    echo "⚠ API health check failed, but services are starting..."
    echo "  Check logs with: docker-compose logs -f"
fi

echo ""
echo "=================================="
echo "Quick Start Commands"
echo "=================================="
echo "View logs: docker-compose logs -f"
echo "Stop services: docker-compose down"
echo "Restart services: docker-compose restart"
echo ""
echo "Test the API:"
echo "  curl http://localhost:8000/health"
echo "  curl http://localhost:8000/stats"
echo ""
echo "=================================="
echo "System Ready!"
echo "=================================="
