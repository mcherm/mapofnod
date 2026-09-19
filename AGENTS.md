# AGENTS.md

Map of Nod ("mapofnod") is a static, phone-friendly region map for a Shadowdark campaign. It's
built with Leaflet and plain HTML/CSS/JS, and deployed to S3 behind CloudFront. The full design is in
`docs/MapOfNod - Specification.md`. Read it before making non-trivial changes.

## Layout

- `web/`: front-end source (HTML, CSS, JS, icons). Leaflet 1.9.4 is vendored in `web/vendor/leaflet-1.9.4/`.
- `web/icons/`: point-of-interest icons from game-icons.net, converted to black-on-white. Add them with
  `scripts/add_icon.py AUTHOR/NAME`, which also records the CC BY credit in `web/icons/CREDITS.md`.
- `data/`: hand-edited config files (map layout, visited hexes, points of interest) and `data/images/` (the
  background map). The build copies these into each view.
- `scripts/`: build and deploy scripts (Python 3, standard library only)
- `docs/`: documentation, including the specification
- `build/`: generated output (git-ignored). The player view is the site root (`build/index.html`) and the GM
  view is under `build/gm/`

## Commands

Run everything through `just`:

- `just build`: build both views into `build/`
- `just serve`: build, then serve locally at http://localhost:8000/ (player) and http://localhost:8000/gm/ (GM)
- `just clean`: delete `build/`
- `just deploy`: push to S3 and invalidate CloudFront (not yet configured)

## Map coordinates

Locations are pixel offsets on the background image, measured from `map.origin` in `data/map_config.json`, with
y increasing downward. So they can be negative. Leaflet uses `CRS.Simple`, and `web/js/map.js` converts a map
coordinate `[x, y]` to the LatLng `[-y, x]`.

## Points of interest

The source is `data/points_of_interest.json` (fields described in the spec). The build validates it and copies it
unchanged into both views. The page learns its view from the `data-view` attribute on `<html>`: `web/index.html`
says `player`, and the build changes it to `gm` in the GM copy. `web/js/map.js` then applies the cascade for that
view. GM data is visible in the player site's JSON; that's an accepted risk, but the player view must never
display it.

## Hex coordinates

Flat-top hexes, offset scheme **odd-q**: odd-numbered columns are shifted half a hex downward. Coordinates are
`"x,y"` strings (column, row). For example, the neighbours of `0,0` are `0,-1`, `1,-1`, `1,0`, `0,1`, `-1,0`
and `-1,-1`. The grid is set by `hexes` in `data/map_config.json`: `origin` is the map coordinate of the centre of
hex `0,0`, and `size` is the centre-to-corner distance in image pixels.

## Rules

- **Don't commit.** Version control is jujutsu (colocated with git). The human reviews and commits all changes.
- **Never display GM data in the player view.** It's in the JSON, but the player page must not show `gm-only`
  points of interest, `gm_description` text, or true locations of rumored points.
- **Load data at runtime.** The front end fetches its data as JSON over HTTP rather than importing it at
  build time.
- **Keep it simple.** No frameworks, bundlers or package managers unless we agree on them first.
