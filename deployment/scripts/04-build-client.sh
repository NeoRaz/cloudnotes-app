#!/bin/bash
set -e

ENVIRONMENT=${1:-local}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLIENT_DIR="$PROJECT_ROOT/client"
ENV_FILE="$PROJECT_ROOT/deployment/envs/${ENVIRONMENT}.env"
OVERLAY_PATH="$PROJECT_ROOT/k8s/overlays/${ENVIRONMENT}/second-step"

echo "🚀 Starting second step of CloudNotes deployment ($ENVIRONMENT)..."

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file not found: $ENV_FILE"
  exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a


if [ "$ENVIRONMENT" == "local" ]; then
  echo "🐳 Setting Docker to Minikube daemon..."
  eval $(minikube docker-env)

  # Generate a unique image tag
  IMAGE_TAG="local-$(date +%s)"
  echo "🏷️ Using image tag: $IMAGE_TAG"

  echo "📦 Building local client Docker image: cloudnotes-client:$IMAGE_TAG"
  docker build \
    -t cloudnotes-client:$IMAGE_TAG \
    --build-arg REACT_APP_ENV="$REACT_APP_NODE_ENV" \
    --build-arg REACT_APP_API_BASE_URL="$REACT_APP_API_BASE_URL" \
    --build-arg REACT_APP_CLIENT_ID="$REACT_APP_CLIENT_ID" \
    --build-arg REACT_APP_CLIENT_SECRET="$REACT_APP_CLIENT_SECRET" \
    --build-arg REACT_APP_SECRET_KEY="$REACT_APP_SECRET_KEY" \
    --build-arg REACT_APP_ENABLE_AI="$REACT_APP_ENABLE_AI" \
    "$CLIENT_DIR"

  echo "🧩 Patching Kustomize overlay (second-step) with new client image..."
  (cd "$OVERLAY_PATH" && kustomize edit set image cloudnotes-client=cloudnotes-client:$IMAGE_TAG)

else

  # Generate a unique image tag
  IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null)
  if [ -z "$IMAGE_TAG" ]; then
    echo "❌ Could not get git hash. Make sure this is a git repository."
    exit 1
  fi
  echo "🏷️ Using image tag: $IMAGE_TAG"

  echo "📦 Building client Docker image for production: cloudnotes-client:$IMAGE_TAG"
  docker build \
    -t cloudnotes-client:$IMAGE_TAG \
    --build-arg REACT_APP_ENV="$REACT_APP_NODE_ENV" \
    --build-arg REACT_APP_API_BASE_URL="$REACT_APP_API_BASE_URL" \
    --build-arg REACT_APP_CLIENT_ID="$REACT_APP_CLIENT_ID" \
    --build-arg REACT_APP_CLIENT_SECRET="$REACT_APP_CLIENT_SECRET" \
    --build-arg REACT_APP_SECRET_KEY="$REACT_APP_SECRET_KEY" \
    --build-arg REACT_APP_ENABLE_AI="$REACT_APP_ENABLE_AI" \
    "$CLIENT_DIR"

  echo "🔐 Creating or updating Docker registry secret in Kubernetes..."
  kubectl -n "$NAMESPACE" delete secret regcred --ignore-not-found
  kubectl -n "$NAMESPACE" create secret docker-registry regcred \
    --docker-username="$DOCKER_USERNAME" \
    --docker-password="$DOCKER_PASSWORD" \
    --docker-email="$DOCKER_EMAIL"

  echo "📤 Tagging and pushing client image to Docker Hub..."
  docker tag cloudnotes-client:$IMAGE_TAG "$DOCKER_USERNAME/cloudnotes-client:$IMAGE_TAG"
  docker tag cloudnotes-client:$IMAGE_TAG "$DOCKER_USERNAME/cloudnotes-client:latest"
  docker push "$DOCKER_USERNAME/cloudnotes-client:$IMAGE_TAG"
  docker push "$DOCKER_USERNAME/cloudnotes-client:latest"

  echo "🧩 Patching Kustomize overlay (second-step) with new client image..."
  (cd "$OVERLAY_PATH" && \
    kustomize edit set image cloudnotes-client="$DOCKER_USERNAME/cloudnotes-client:$IMAGE_TAG")
fi

echo "✅ Client image build and patch complete."