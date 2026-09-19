#!/usr/bin/env bash
# Create or update the mapofnod CloudFormation stack from aws/mapofnod.yaml.
# Run via `just infra`, which sets AWS_PROFILE to an admin-level profile.
set -euo pipefail
cd "$(dirname "$0")/.."

aws cloudformation deploy \
    --template-file aws/mapofnod.yaml \
    --stack-name mapofnod \
    --region us-east-1 \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset
