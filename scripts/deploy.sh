#!/bin/bash

# Trade Copier Deployment Script
set -e

echo "🚀 Starting Trade Copier Deployment..."

# Configuration
ENVIRONMENT=${1:-development}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
VERSION=${VERSION:-$(date +%Y%m%d-%H%M%S)}

echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"

# Build and tag images
echo "📦 Building Docker images..."

# Build main web application
docker build -t trade-copier-web:$VERSION .
docker tag trade-copier-web:$VERSION $DOCKER_REGISTRY/trade-copier-web:$VERSION
docker tag trade-copier-web:$VERSION $DOCKER_REGISTRY/trade-copier-web:latest

# Build MT4 EA container
docker build -t trade-copier-mt4:$VERSION ./docker/mt4-ea
docker tag trade-copier-mt4:$VERSION $DOCKER_REGISTRY/trade-copier-mt4:$VERSION
docker tag trade-copier-mt4:$VERSION $DOCKER_REGISTRY/trade-copier-mt4:latest

# Build WebSocket server
docker build -f Dockerfile.websocket -t trade-copier-websocket:$VERSION .
docker tag trade-copier-websocket:$VERSION $DOCKER_REGISTRY/trade-copier-websocket:$VERSION
docker tag trade-copier-websocket:$VERSION $DOCKER_REGISTRY/trade-copier-websocket:latest

# Build VPS manager
docker build -f Dockerfile.vps-manager -t trade-copier-vps-manager:$VERSION .
docker tag trade-copier-vps-manager:$VERSION $DOCKER_REGISTRY/trade-copier-vps-manager:$VERSION
docker tag trade-copier-vps-manager:$VERSION $DOCKER_REGISTRY/trade-copier-vps-manager:latest

echo "✅ Images built successfully"

# Push to registry if not development
if [ "$ENVIRONMENT" != "development" ]; then
    echo "📤 Pushing images to registry..."
    
    docker push $DOCKER_REGISTRY/trade-copier-web:$VERSION
    docker push $DOCKER_REGISTRY/trade-copier-web:latest
    
    docker push $DOCKER_REGISTRY/trade-copier-mt4:$VERSION
    docker push $DOCKER_REGISTRY/trade-copier-mt4:latest
    
    docker push $DOCKER_REGISTRY/trade-copier-websocket:$VERSION
    docker push $DOCKER_REGISTRY/trade-copier-websocket:latest
    
    docker push $DOCKER_REGISTRY/trade-copier-vps-manager:$VERSION
    docker push $DOCKER_REGISTRY/trade-copier-vps-manager:latest
    
    echo "✅ Images pushed to registry"
fi

# Deploy based on environment
case $ENVIRONMENT in
    "development")
        echo "🔧 Deploying to development environment..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
        ;;
    "staging")
        echo "🎭 Deploying to staging environment..."
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
        ;;
    "production")
        echo "🏭 Deploying to production environment..."
        
        # Update Kubernetes manifests
        sed -i "s|IMAGE_VERSION|$VERSION|g" k8s/*.yaml
        
        # Apply Kubernetes manifests
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secret.yaml
        kubectl apply -f k8s/web-deployment.yaml
        kubectl apply -f k8s/websocket-deployment.yaml
        kubectl apply -f k8s/vps-manager-deployment.yaml
        kubectl apply -f k8s/services.yaml
        kubectl apply -f k8s/ingress.yaml
        
        # Wait for rollout
        kubectl rollout status deployment/trade-copier-web -n trade-copier
        kubectl rollout status deployment/trade-copier-websocket -n trade-copier
        kubectl rollout status deployment/trade-copier-vps-manager -n trade-copier
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "✅ Deployment completed successfully!"

# Health checks
echo "🏥 Running health checks..."

# Wait for services to be ready
sleep 30

# Check web application
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Web application is healthy"
else
    echo "❌ Web application health check failed"
fi

# Check WebSocket server
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ WebSocket server is healthy"
else
    echo "❌ WebSocket server health check failed"
fi

echo "🎉 Deployment process completed!"

# Display useful information
echo ""
echo "📋 Deployment Summary:"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Web App: http://localhost:3000"
echo "WebSocket: ws://localhost:3001"
echo "Monitoring: http://localhost:3002 (Grafana)"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
    echo "🔍 Development commands:"
    echo "View logs: docker-compose logs -f"
    echo "Scale MT4 containers: docker-compose up -d --scale mt4-template=3"
    echo "Stop all: docker-compose down"
    echo ""
fi

echo "📚 Documentation: https://docs.tradecopy.system"
echo "🐛 Support: https://support.tradecopy.system"

