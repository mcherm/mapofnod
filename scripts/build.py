#!/usr/bin/env python3
"""Build the player and GM sites into build/.

The player view is the site root (build/index.html); the GM view lives at
build/gm/.

Each view gets identical copies of web/ and the data files. The only
difference is the data-view attribute on index.html's <html> element, which
tells the page which view to display. The data files are validated first.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
DATA_DIR = ROOT / "data"
BUILD_DIR = ROOT / "build"
ICONS_DIR = WEB_DIR / "icons"
# Output folder for each view, relative to BUILD_DIR. The player view must come
# first, since it is the site root and the GM view is nested inside it.
VIEWS = {"player": ".", "gm": "gm"}

REQUIRED_FIELDS = ["id", "name", "icon", "true_location", "gm_description", "state"]
STATES = ["gm-only", "rumored", "known"]


def validate_pois() -> None:
    """Read and validate data/points_of_interest.json."""
    pois = json.loads((DATA_DIR / "points_of_interest.json").read_text())["pois"]
    errors = []
    ids = set()
    for i, poi in enumerate(pois):
        label = poi.get("id", f"entry {i}")
        errors += [f"{label}: missing '{field}'" for field in REQUIRED_FIELDS if field not in poi]
        if poi.get("state") not in STATES:
            errors.append(f"{label}: state must be one of {STATES}")
        if "icon" in poi and not (ICONS_DIR / poi["icon"]).exists():
            errors.append(f"{label}: no icon file web/icons/{poi['icon']}")
        if label in ids:
            errors.append(f"{label}: duplicate id")
        ids.add(label)
    if errors:
        sys.exit("Errors in data/points_of_interest.json:\n  " + "\n  ".join(errors))


def main() -> None:
    validate_pois()
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    for view, subdir in VIEWS.items():
        out = BUILD_DIR / subdir
        shutil.copytree(WEB_DIR, out, dirs_exist_ok=True)
        shutil.copy2(DATA_DIR / "map_config.json", out / "map_config.json")
        shutil.copytree(DATA_DIR / "images", out / "images", dirs_exist_ok=True)
        shutil.copy2(DATA_DIR / "points_of_interest.json", out / "points_of_interest.json")
        index = out / "index.html"
        index.write_text(index.read_text().replace('data-view="player"', f'data-view="{view}"'))
        print(f"Built {view} view -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
