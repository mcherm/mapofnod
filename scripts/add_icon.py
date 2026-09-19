#!/usr/bin/env python3
"""Download icons from game-icons.net and convert them to black-on-white.

Usage: scripts/add_icon.py AUTHOR/NAME [AUTHOR/NAME ...]
  e.g. scripts/add_icon.py delapouite/lighthouse lorc/cauldron

Browse icons at https://game-icons.net; AUTHOR/NAME is the tail of the icon's
URL. Each icon is saved as web/icons/NAME.svg and credited in
web/icons/CREDITS.md (the icons are CC BY 3.0, so attribution is required).
"""
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "web" / "icons"
CREDITS = ICONS_DIR / "CREDITS.md"
SOURCE_URL = "https://raw.githubusercontent.com/game-icons/icons/master/{}.svg"
CREDITS_HEADER = """# Icon credits

Icons from [game-icons.net](https://game-icons.net), licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Colours inverted
to black-on-white.

"""

# game-icons SVGs are a black background square followed by a white glyph.
BACKGROUND = '<path d="M0 0h512v512H0z"/>'
WHITE = 'fill="#fff"'


def invert(svg: str, icon: str) -> str:
    if BACKGROUND not in svg or WHITE not in svg:
        sys.exit(f"{icon}: unexpected SVG format, not converted")
    svg = svg.replace(WHITE, 'fill="#000"')
    return svg.replace(BACKGROUND, '<path fill="#fff" d="M0 0h512v512H0z"/>')


def add_icon(icon: str) -> None:
    author, name = icon.split("/")
    with urllib.request.urlopen(SOURCE_URL.format(icon)) as response:
        svg = response.read().decode("utf-8")
    (ICONS_DIR / f"{name}.svg").write_text(invert(svg, icon))

    credit = f"- `{name}.svg`: {name} by {author}, https://game-icons.net/1x1/{author}/{name}.html\n"
    credits = CREDITS.read_text() if CREDITS.exists() else CREDITS_HEADER
    if credit not in credits:
        CREDITS.write_text(credits + credit)
    print(f"Added web/icons/{name}.svg")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for icon in sys.argv[1:]:
        add_icon(icon)


if __name__ == "__main__":
    main()
