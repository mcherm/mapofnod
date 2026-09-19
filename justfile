# AWS CLI profiles: an admin profile for changing the stack, and the narrowly
# scoped deployer for uploading the site. See aws/README.md.
infra_profile := "power-user"
deploy_profile := "mapofnod-deploy"

# List available recipes
default:
    @just --list

# Build the player and GM sites into build/
build:
    python3 scripts/build.py

# Remove build output
clean:
    rm -rf build

# Serve the built sites locally at http://localhost:8000/ (player) and /gm/
serve: build
    python3 -m http.server 8000 --directory build

# Build, upload to S3, then invalidate CloudFront
deploy: build
    AWS_PROFILE={{deploy_profile}} aws/deploy.sh

# Create or update the AWS resources from aws/mapofnod.yaml
infra:
    AWS_PROFILE={{infra_profile}} aws/update_stack.sh
