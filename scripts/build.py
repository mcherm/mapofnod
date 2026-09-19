#!/usr/bin/env python3
"""Build the player and GM sites into build/.

The player view is the site root (build/index.html); the GM view lives at
build/gm/.

Each view gets a copy of web/, the map config and the map images. Later the
build will also filter the points of interest separately for each view.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
DATA_DIR = ROOT / "data"
BUILD_DIR = ROOT / "build"
# Output folder for each view, relative to BUILD_DIR. The player view must come
# first, since it is the site root and the GM view is nested inside it.
VIEWS = {"player": ".", "gm": "gm"}


def main() -> None:
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    for view, subdir in VIEWS.items():
        out = BUILD_DIR / subdir
        shutil.copytree(WEB_DIR, out, dirs_exist_ok=True)
        shutil.copy2(DATA_DIR / "map_config.json", out / "map_config.json")
        shutil.copytree(DATA_DIR / "images", out / "images", dirs_exist_ok=True)
        print(f"Built {view} view -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
