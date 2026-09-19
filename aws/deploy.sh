#!/usr/bin/env bash
# Upload build/ to the site bucket, then invalidate the CloudFront cache.
# Run via `just deploy`, which builds first and sets AWS_PROFILE to the
# mapofnod deployer.
set -euo pipefail
cd "$(dirname "$0")/.."

stack_output() {
    aws cloudformation describe-stacks --stack-name mapofnod --region us-east-1 \
        --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

bucket=$(stack_output BucketName)
distribution=$(stack_output DistributionId)

# no-cache: browsers may keep files but must revalidate (a cheap 304), so
# players see updates as soon as a deploy finishes.
aws s3 sync build/ "s3://$bucket" --delete --cache-control no-cache

aws cloudfront create-invalidation --distribution-id "$distribution" --paths "/*" \
    --query "Invalidation.[Id,Status]" --output text
