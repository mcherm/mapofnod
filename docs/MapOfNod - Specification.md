# Campaign Exploration Map — Specification

2026-09-19 · @mcherm

## Project Name
Use "mapofnod" (as a lowercase slug; appears in git, project name, etc), or "MapOfNod" (for a camelcase version) or "Map of Nod" for display.

## Purpose

A shared visual artifact for a Shadowdark-based campaign: a region map the players can pull up on their phones, both between sessions and glanced at during play.

It exists to do two things:

1. **Establish shared geography.** Everyone should hold the same picture of where things are relative to each other.
2. **Record progress.** Show what has been explored and what remains, so the map reads as an accumulating record of the campaign.

Play does not happen *on* the map. Encounters, dungeon interiors and tactical scenes stay on paper at the table. This is a reference and a record, not a play surface.

The table is all in person and the players bring no electronics beyond phones, so the map is consumed on small screens and never projected or shared to a large display.

## Scope and non-goals

The goal is the simplest tool that meets the basic need. Anything below can be added later; none of it is in v1.

**Out of scope:**

- **Nested maps.** No zooming from the region map into dungeon interiors, the wizard's tower or the mines. Location interiors stay on paper, handed over as printed pages.
- **Fog of war.** The background art is fully visible from the start. Nothing about the terrain is hidden.
- **Table-time editing.** All updates happen between sessions.
- **A drag-and-drop editor.** Data is edited as a file in the repo.
- **Per-player visibility.** All players see the same view.
- **Travel routes, distances, party marker, encounter tables, weather, time.**

The paper side of the campaign is unaffected by this tool and continues as planned: printed location maps in a binder, index cards for rumors, physical props for discovery moments.

## Architecture

A static site. No server, no database, no runtime. (At least for now -- that could change in the future.)

**Stack:** Leaflet for the map surface, plain HTML/CSS/JS, S3 for storage, CloudFront in front of it. Cost scales to approximately zero with no users, with no cold starts and no runtime to maintain.

**Source of truth:** a single config file in the GitHub repo, edited directly and committed. Git gives campaign version history for free.

**Build:** a script validates the config files and emits two sets of output, a player build and a GM build. Both receive the same, unedited config files; they differ only in which view the page is told to display. The front end reads the fields that apply to its view. Deploy is a build plus `s3 sync` and a CloudFront invalidation.

**Hosting:** served at https://mapofnod.com. The AWS resources are one CloudFormation stack (`aws/mapofnod.yaml`): a private S3 bucket readable only by CloudFront through Origin Access Control, an ACM certificate, Route 53 alias records, and a CloudFront Function that serves `index.html` for directory URLs such as `/gm/` and redirects `www.mapofnod.com` to the apex. Deploys run as a dedicated IAM user that may only upload to the bucket and invalidate the distribution. The GM page carries a `noindex` tag.

**Data loading:** the front end fetches its data over HTTP as JSON rather than importing it at build time. This keeps the door open: swapping to a Lambda endpoint later changes the fetch URL and nothing else.

**Adjustable views:** simple changes to the display (like toggling the hex overlay on and off or switching to the player view when logged in as the gm) will be performed with controls on the page.

**Access control:** two URLs. The player build at a public URL; the GM build at a separate unlisted URL. No login in v1. Anyone with the GM link sees everything, which is an accepted risk for a home game. GM data is not hidden from players either: the player site serves the same config files, so a player who opens the raw JSON can read GM-only points of interest and GM descriptions. This is also an accepted risk; the player view simply doesn't display them.

## Base map and hex layer

### Base map

A single hand-drawn background image, served as one file and placed with Leaflet's `ImageOverlay` under `CRS.Simple`, so map coordinates are pixel coordinates on the image rather than geographic ones. Free zoom and pan. No tiling: a single large image loads acceptably on a phone.

### Hex geometry

Flat-top hexes. Roughly 40 × 30 for the first map, though the dimensions are expected to change and should be config-driven rather than hardcoded.

Hex size and orientation need not be fixed before the background art is drawn. Features straddling hex boundaries are explicitly acceptable and not a concern.

### Coordinates

Simple rectangular x/y, with alternate columns displayed offset by half a cell. This is the offset scheme conventionally called odd-q or even-q for flat-top hexes; **pick one convention and record it here**, since the two shift opposite columns and mixing them produces off-by-one errors in hand-entered data.

**Chosen convention: odd-q.** Odd-numbered columns are shifted half a hex downward. So the neighbours of `0,0` (an even column) are `0,-1`, `1,-1`, `1,0`, `0,1`, `-1,0` and `-1,-1`; the neighbours of `1,0` (an odd column) are `1,-1`, `2,0`, `2,1`, `1,1`, `0,1` and `0,0`.

Stored as strings like `"14,9"`. Axial or cube coordinates are unnecessary because no distance or neighbour math is being done.

### Rendering and visited state

The hex layer is a toggleable overlay, drawn as SVG polygons. Two states only: visited and unvisited, distinguished by a slight fill difference: unvisited hexes get a faint dark shading, visited hexes are left clear. The visited hexes are recorded in `visited_hexes.txt` (see Config file), updated after each session.

Leaflet vector `weight` is specified in screen pixels, so hex outlines stay a constant thickness at every zoom level by default.

The hex layer and the points of interest are fully independent. They are simply overlaid; neither references the other.

## Points of interest

A point of interest renders as an icon at a location, with a short name as a label and a description shown on demand.

### Fields

| Field                 | Required | Notes                                                        |
|-----------------------|----------|--------------------------------------------------------------|
| `id`                  | yes      | Stable key                                                   |
| `name`                | yes      | Short label shown on the map. Same in all states             |
| `icon`                | yes      | Filename of an SVG in the icon directory                     |
| `true_location`       | yes      | Actual position                                              |
| `rumored_location`    | no       | Where the players think it is. Defaults to `true_location`   |
| `gm_description`      | yes      | Longer text giving the full truth                            |
| `player_description`  | no       | Longer text which defaults to `gm_description` if absent     |
| `rumored_description` | no       | Longer text which detaults to `player_description` if absent |
| `state`               | yes      | `gm-only`, `rumored` or `known`                              |

Any other field is a build error. This guards against a misspelled optional field silently falling back to `gm_description` and showing GM text to players.

### States

- **`gm-only`** — absent from the player view entirely.
- **`rumored`** — appears in the player view at `rumored_location`, showing `rumored_description`.
- **`known`** — appears in the player view at `true_location`, showing `player_description`.

The GM view always shows every point of interest at its true location with the GM description, plus an indication of its current state. Icons and labels are drawn by state exactly as in the player view, so `rumored` points look dimmer there too, and `gm-only` points are tinted light blue.

### Cascade

The optional fields default upward toward `gm_description` and `true_location`. `gm_description` is the only mandatory description; the more specific variants exist so a distinction can be drawn when one is wanted, not because one is required.

The cascade runs toward disclosure, so an omitted `player_description` means the GM text is what the players read. This is intentional and the GM is expected to write the GM description with that in mind.

## Views

Two builds from one source, at two URLs.

### Player view

Public URL. Shows the background, the toggleable hex overlay with visited shading, and points of interest in `rumored` or `known` state at their player-facing locations and descriptions.

Must work well on a phone. For some players, this may be the only device they use. Others might use a tablet or laptop browser.

The player build serves the same `points_of_interest.json` as the GM build. The player view's JavaScript skips `gm-only` points of interest and applies the cascade to choose each remaining point's location and description. GM data is present in the JSON but never displayed (see Access control).

Display of POIs: the icon is centered at the location (`rumored_location` or `true_location`), the name floats nearby. Points in the `rumored` state are drawn slightly differently from `known` ones: the icon's white field and the name label's background darken to a light grey, so players can tell hearsay from what they have seen. The user can interact to display the longer description. (How that interaction works may vary based on things like touch vs mouse.)

### GM view

Separate unlisted URL. Shows everything at true locations with GM descriptions, plus each point of interest's current state.

Two GM-only affordances:

- **Coordinate display.** A mode that labels each hex with its x/y coordinates, so the visited list can be updated by visual inspection.
- **Click to copy.** Clicking a hex copies its coordinate string to the clipboard; clicking the map copies the pixel position. This removes most of the friction of having no drag editor, and eliminates the transcription errors that come from reading a label and retyping it.

## Config file

A small number of files in the repo, hand-edited. One contains layout data; one has data on which hexes have been visited; one has information about the points of interest. The layout and points of interest are JSON; the visited hexes are a text file drawn as a picture of the grid.

### map_config.json
```json
{
  "map": {
    "image": "region.jpg",
    "width": 4000,
    "height": 3000,
    "origin": [2000, 1500]
  },
  "hexes": {
    "size": 64,
    "origin": [-1920, -1441.07],
    "cols": 40,
    "rows": 26
  }
}
```

### visited_hexes.txt
One line per row of hexes and one character per column, so it must have `hexes.rows` lines of `hexes.cols` characters. `V` marks a visited hex and `.` an unvisited one. The first character of the first line is hex `0,0`. The build rejects a file of the wrong size or with other characters. Because odd columns are shifted down on the map, a diagonal path looks slightly different in the file than on the map.

```text
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
.................V......................
................V.......................
................V.......................
.............VVV........................
.............V..........................
............VVV..VV.....................
...........VVVVVVVV.....................
............VVVVVV......................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
```

### points_of_interest.json
```json
{
  "pois": [
    {
      "id": "vaskal-tower",
      "name": "Vaskal's Observatory",
      "icon": "tower.svg",
      "true_location": [1820, 940],
      "rumored_location": [1650, 1010],
      "gm_description": "A slender stone tower on the ridge. Vaskal is not dead. The upper floor is sealed by a fixed object spell.",
      "player_description": "A slender stone tower on the ridge, its upper windows shuttered.",
      "rumored_description": "Charcoal burners speak of a burnt tower somewhere east of the ford.",
      "state": "rumored"
    },
    {
      "id": "deepcut-mines",
      "name": "Deepcut Mines",
      "icon": "mine.svg",
      "true_location": [2440, 1780],
      "gm_description": "And abandoned diamond mine.",
      "state": "known"
    }
  ]
}
```

Notes on the example:

- Deepcut Mines omits the optional fields, so its player description falls back to the GM text and its location is the true one.
- Vaskal's Observatory has all three descriptions distinct and a deliberately wrong rumored location, roughly 170 pixels west of the truth.
- `hexes.origin` is the location (in map coordinates, like any other location) of the centre of hex `0,0`, which is how the grid is registered against the art. `hexes.size` is the distance in image pixels from a hex's centre to any corner, which is also its side length; a flat-top hex is `2 × size` wide and `√3 × size` tall, and columns are `1.5 × size` apart. `cols` and `rows` give the grid's extent, with hexes numbered from `0,0`. The example values fit a 40 × 26 grid inside the 4000 × 3000 image, with the centre of hex `20,13` at location `[0,0]`.
- Locations are pixel coordinates on the background image, not hex coordinates, measured from `map.origin` (a pixel position on the image) with y increasing downward, so they may be negative. Points of interest and hexes stay independent.

## Icons

Sourced from [game-icons.net](https://game-icons.net), which carries several thousand SVGs under CC BY and is built for exactly this genre: towers, ruins, caves, camps, shrines, bridges, standing stones.

The default styling there is white-on-black; inverting to black-on-white is a fill and background swap in the SVG, or a CSS filter applied at render time. Deciding which approach to take is a small open item.

**Workflow:** pre-process the SVG files into an icon directory in the repo, reference them by filename in the config. Adding a new icon means adding a file. No sprite sheet, no build step, no pipeline.

Attribution for CC BY should appear somewhere in the pop-up "about" text.

## Extension points

None of this is v1 work. It is recorded so the v1 design does not foreclose it.

**Table-time state changes.** The one operation that might turn out to matter mid-session is flipping a point of interest to visible. The git-backed build already supports it, clumsily: change one field, push, CI redeploys in under a minute. If that proves too slow, a cheap middle step short of a database is to serve the state list as a separate small JSON file that a single Lambda can overwrite, with an endpoint taking a point-of-interest id and a new state. That buys table-time flips without building an editor or moving content into DynamoDB.

**Browser-based GM editor.** Drag-to-place and click-to-paint hexes, backed by DynamoDB and Lambda. The infrastructure is a day or two; the editor itself is several days. This is the main reason to move off static, and worth doing only if editing a file in the repo turns out to be the thing that kills the habit.

**Authentication.** A login for the GM view instead of an unlisted URL.

**Richer visited state.** More than two states per hex: passed through, explored, cleared.

The design decision that keeps all of these cheap is fetching data over HTTP as JSON rather than importing it at build time. Moving to a backend changes a URL.

## Tooling

* Version control will be jujutsu. Claude will not make commits, only the human user will do that, after reviewing code.
* just will be used for all major operations on the system. "just build" to build the HTML files, and "just deploy" to push to AWS and clear CloudFront caches.
