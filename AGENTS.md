# AGENTS.md

Map of Nod ("mapofnod") is a static, phone-friendly region map for a Shadowdark campaign. It's
built with Leaflet and plain HTML/CSS/JS, and deployed to S3 behind CloudFront. The full design is in
`docs/MapOfNod - Specification.md`. Read it before making non-trivial changes.

## Layout

- `web/`: front-end source (HTML, CSS, JS, icons). Leaflet 1.9.4 is vendored in `web/vendor/leaflet-1.9.4/`.
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

## Hex coordinates

Flat-top hexes, offset scheme **odd-q**: odd-numbered columns are shifted half a hex downward. Coordinates are
`"x,y"` strings (column, row). For example, the neighbours of `0,0` are `0,-1`, `1,-1`, `1,0`, `0,1`, `-1,0`
and `-1,-1`.

## Rules

- **Don't commit.** Version control is jujutsu (colocated with git). The human reviews and commits all changes.
- **Keep GM data out of the player build.** The player build must never contain `gm-only` points of interest
  or any `gm_description` text.
- **Load data at runtime.** The front end fetches its data as JSON over HTTP rather than importing it at
  build time.
- **Keep it simple.** No frameworks, bundlers or package managers unless we agree on them first.
