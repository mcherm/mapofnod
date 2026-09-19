#!/usr/bin/env python3
"""Download icons from game-icons.net and convert them to black-on-white.

Usage: scripts/add_icon.py AUTHOR/NAME [AUTHOR/NAME ...]
  e.g. scripts/add_icon.py delapouite/lighthouse lorc/cauldron

Browse icons at https://game-icons.net; AUTHOR/NAME is the tail of the icon's
URL. Each icon is saved as web/icons/NAME.svg and credited in
web/icons/ICON_CREDITS.html, a page linked from the site's About panel (the
icons are CC BY 3.0, so attribution is required).
If NAME.svg is already taken by another author's icon, the new one is saved
as NAME-AUTHOR.svg instead. Icons that can't be converted are skipped and
reported at the end.
"""
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "web" / "icons"
CREDITS = ICONS_DIR / "ICON_CREDITS.html"
SOURCE_URL = "https://raw.githubusercontent.com/game-icons/icons/master/{}.svg"
# The credits page, used when it doesn't exist yet. Credit lines are added
# just before </ul>, so the page must contain exactly one list.
CREDITS_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Map of Nod: Icon Credits</title>
  <style>
    body { max-width: 40rem; margin: 0 auto; padding: 1rem; color: #222;
           font: 15px/1.5 Georgia, "Times New Roman", serif; }
    ul { padding: 0; list-style: none; }
    li { display: flex; align-items: center; gap: 0.5rem; margin: 0.2rem 0; }
    img { width: 24px; height: 24px; border: 1px solid #333; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Icon Credits</h1>
  <p>
    The point-of-interest icons are from <a href="https://game-icons.net">game-icons.net</a>, used under
    <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>, with colors inverted to black-on-white.
    Each icon is listed with its author and a link to the original.
  </p>
  <ul>
  </ul>
</body>
</html>
"""

# game-icons SVGs are a black background square followed by a white glyph.
BACKGROUND = '<path d="M0 0h512v512H0z"/>'
WHITE = 'fill="#fff"'


class ConversionError(Exception):
    pass


def invert(svg: str) -> str:
    if BACKGROUND not in svg or WHITE not in svg:
        raise ConversionError("unexpected SVG format")
    svg = svg.replace(WHITE, 'fill="#000"')
    return svg.replace(BACKGROUND, '<path fill="#fff" d="M0 0h512v512H0z"/>')


def credit_line(filename: str, author: str, name: str) -> str:
    url = f"https://game-icons.net/1x1/{author}/{name}.html"
    return f'    <li><img src="{filename}" alt=""> <a href="{url}">{name}</a> by {author} ({filename})</li>\n'


def icon_filename(author: str, name: str, credits: str) -> str:
    """NAME.svg, unless another author's icon already has that filename."""
    filename = f"{name}.svg"
    taken = f'<img src="{filename}"' in credits and credit_line(filename, author, name) not in credits
    return f"{name}-{author}.svg" if taken else filename


def add_icon(icon: str) -> None:
    author, name = icon.split("/")
    with urllib.request.urlopen(SOURCE_URL.format(icon)) as response:
        svg = invert(response.read().decode("utf-8"))
    credits = CREDITS.read_text() if CREDITS.exists() else CREDITS_TEMPLATE
    filename = icon_filename(author, name, credits)
    (ICONS_DIR / filename).write_text(svg)
    credit = credit_line(filename, author, name)
    if credit not in credits:
        CREDITS.write_text(credits.replace("  </ul>", credit + "  </ul>"))
    print(f"Added web/icons/{filename}")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    for icon in sys.argv[1:]:
        try:
            add_icon(icon)
        except (ConversionError, OSError) as e:
            failed.append(f"{icon}: {e}")
    if failed:
        sys.exit("Skipped:\n  " + "\n  ".join(failed))


if __name__ == "__main__":
    main()
