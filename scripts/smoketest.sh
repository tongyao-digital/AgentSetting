#!/bin/bash

# Smoke test script for CI/CD pipeline
# Usage: ./scripts/smoketest.sh <environment>

set -e

ENVIRONMENT=${1:-stage}
BASE_URL=""

case $ENVIRONMENT in
  stage)
    BASE_URL="https://test.happy-forest.example.com"
    ;;
  prod)
    BASE_URL="https://prod.happy-forest.example.com"
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 <stage|prod>"
    exit 1
    ;;
esac

echo "Running smoke tests for $ENVIRONMENT environment..."

# Health check
echo "Checking health endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ Health check failed with status $HTTP_STATUS"
  exit 1
fi
echo "✅ Health check passed"

# API endpoints check
echo "Checking API endpoints..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/ability-management/categories")
if [ "$API_STATUS" -ne 200 ]; then
  echo "❌ API check failed with status $API_STATUS"
  exit 1
fi
echo "✅ API check passed"

# Check specific endpoints
ENDPOINTS=(
  "/api/v1/ability-management/categories"
  "/api/v1/ability-management/capabilities"
  "/api/v1/ability-management/sync-jobs"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Checking $endpoint..."
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
  if [ "$STATUS" -ne 200 ]; then
    echo "❌ $endpoint failed with status $STATUS"
    exit 1
  fi
  echo "✅ $endpoint passed"
done

echo "🎉 All smoke tests passed for $ENVIRONMENT environment!"