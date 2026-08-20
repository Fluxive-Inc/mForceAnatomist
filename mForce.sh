#!/bin/bash
# Local wrapper for mForceOS1 CICD deployment
PROJECT_NAME=$(basename "$(pwd)")
echo "Routing deployment through CICD pipeline for $PROJECT_NAME..."
# Assuming _scripts is available in the ecosystem root
../../fluxive-machineforce/mForceOS1/_scripts/cicd-deploy.sh "$PROJECT_NAME"
