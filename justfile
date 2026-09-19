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

# Build and push to S3, then invalidate CloudFront (not yet configured)
deploy: build
    @echo "deploy is not yet configured" && exit 1
