// Displays the background map, hex grid and points of interest with Leaflet.
//
// Map coordinates are image pixels measured from map.origin (a pixel position
// on the image), with x increasing rightward and y increasing downward. Leaflet's
// CRS.Simple has y increasing upward, so a map coordinate [x, y] becomes the
// LatLng [-y, x].
(function () {
  "use strict";

  const MAX_ZOOM = 2; // 4x native image resolution
  const ICON_SIZE = 32; // screen pixels, at every zoom level
  const UNVISITED_SHADING = 0.15; // fill opacity of unvisited hexes

  function toLatLng([x, y]) {
    return L.latLng(-y, x);
  }

  function showError(message) {
    const el = document.getElementById("map");
    el.innerHTML = "";
    const p = document.createElement("p");
    p.className = "load-error";
    p.textContent = message;
    el.appendChild(p);
  }

  function buildMap(config) {
    const { image, width, height, origin: [ox, oy] } = config.map;
    // Image corners in map coordinates.
    const bounds = L.latLngBounds(toLatLng([-ox, -oy]), toLatLng([width - ox, height - oy]));

    const map = L.map("map", {
      crs: L.CRS.Simple,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    });
    L.imageOverlay("images/" + image, bounds).addTo(map);
    map.setMaxZoom(MAX_ZOOM);
    // Don't allow zooming out past the whole image; recompute when the window
    // changes size (such as rotating a phone). getBoundsZoom() clamps its result
    // to the current minZoom, which defaults to 0 (native image size) when there
    // are no tile layers, so lift that limit before asking.
    const updateMinZoom = () => {
      map.options.minZoom = -Infinity;
      map.setMinZoom(map.getBoundsZoom(bounds));
    };
    updateMinZoom();
    map.fitBounds(bounds);
    map.on("resize", updateMinZoom);
    return map;
  }

  // Map coordinate of the centre of hex [col, row]. Hexes are flat-top, and
  // odd-numbered columns are shifted half a hex downward ("odd-q").
  function hexCenter(hexes, [col, row]) {
    const [ox, oy] = hexes.origin;
    const height = Math.sqrt(3) * hexes.size;
    return [ox + 1.5 * hexes.size * col, oy + height * (row + 0.5 * (col & 1))];
  }

  function hexCorners(hexes, hex) {
    const [cx, cy] = hexCenter(hexes, hex);
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      corners.push([cx + hexes.size * Math.cos(angle), cy + hexes.size * Math.sin(angle)]);
    }
    return corners;
  }

  // Parses visited_hexes.txt: one line per row, one character per column,
  // "V" for visited. Returns a Set of "col,row" strings.
  function parseVisited(text) {
    const visited = new Set();
    text.split(/\r?\n/).forEach((line, row) => {
      [...line].forEach((char, col) => {
        if (char === "V") {
          visited.add(`${col},${row}`);
        }
      });
    });
    return visited;
  }

  // Builds the hex grid as SVG polygons, with unvisited hexes lightly shaded.
  // Not interactive, so clicks pass through to the map. Returns the layer
  // without adding it: the grid starts hidden, and the hex toggle shows it.
  function hexGrid(hexes, visited) {
    const grid = L.layerGroup();
    for (let col = 0; col < hexes.cols; col++) {
      for (let row = 0; row < hexes.rows; row++) {
        L.polygon(hexCorners(hexes, [col, row]).map(toLatLng), {
          color: "#3b2f25",
          opacity: 0.35,
          weight: 1, // screen pixels, at every zoom level
          fill: !visited.has(`${col},${row}`),
          fillColor: "#3b2f25",
          fillOpacity: UNVISITED_SHADING,
          interactive: false,
        }).addTo(grid);
      }
    }
    return grid;
  }

  // A map control with a single button, styled like Leaflet's own controls.
  // Options: position, className, title (tooltip), label (for screen
  // readers), svg (the button's image) and onClick(button).
  const ButtonControl = L.Control.extend({
    onAdd() {
      const { className, title, label, svg, onClick } = this.options;
      const bar = L.DomUtil.create("div", "leaflet-bar");
      const button = L.DomUtil.create("a", className, bar);
      button.href = "#";
      button.role = "button";
      button.title = title;
      button.setAttribute("aria-label", label);
      button.innerHTML = svg;
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(button, "click", (e) => {
        L.DomEvent.preventDefault(e);
        onClick(button);
      });
      return bar;
    },
  });

  // A hexagon button, below Leaflet's zoom buttons, that shows and hides the
  // hex grid.
  function addHexToggle(map, grid) {
    const update = (button) => {
      const shown = map.hasLayer(grid);
      button.classList.toggle("off", !shown);
      button.setAttribute("aria-pressed", String(shown));
    };
    const control = new ButtonControl({
      position: "topleft",
      className: "hex-toggle",
      title: "Show or hide the hex grid",
      label: "Hex grid",
      svg:
        '<svg viewBox="0 0 20 20" aria-hidden="true">' +
        '<polygon points="1,10 5.5,2.2 14.5,2.2 19,10 14.5,17.8 5.5,17.8" /></svg>',
      onClick(button) {
        if (map.hasLayer(grid)) {
          map.removeLayer(grid);
        } else {
          map.addLayer(grid);
        }
        update(button);
      },
    }).addTo(map);
    update(control.getContainer().firstChild);
  }

  // A menu button, at the lower left, that opens the About panel (the
  // <dialog id="about"> in index.html). Clicking outside the panel closes it.
  function addAboutMenu(map) {
    const dialog = document.getElementById("about");
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close(); // the click was on the backdrop, not the content
      }
    });
    new ButtonControl({
      position: "bottomleft",
      className: "menu-button",
      title: "About Map of Nod",
      label: "About",
      svg:
        '<svg viewBox="0 0 20 20" aria-hidden="true">' +
        '<path d="M3 5h14M3 10h14M3 15h14" /></svg>',
      onClick: () => dialog.showModal(),
    }).addTo(map);
  }

  // Which view to display, "player" or "gm". Set by the build.
  const VIEW = document.documentElement.dataset.view;

  // Resolves the location/description cascade for this view. Returns null if
  // the POI isn't shown in this view.
  function resolvePoi(poi) {
    if (VIEW === "gm") {
      return { location: poi.true_location, description: poi.gm_description };
    }
    const playerDescription = poi.player_description ?? poi.gm_description;
    switch (poi.state) {
      case "known":
        return { location: poi.true_location, description: playerDescription };
      case "rumored":
        return {
          location: poi.rumored_location ?? poi.true_location,
          description: poi.rumored_description ?? playerDescription,
        };
      default:
        return null;
    }
  }

  // A single description box, shared by all POIs. It opens beside the clicked
  // icon, on whichever side faces the centre of the screen, and closes when
  // the map is clicked. Clicks inside the box don't reach the map.
  function descriptionBox(map) {
    const box = L.tooltip({
      direction: "auto",
      offset: [ICON_SIZE / 2 + 12, 0], // leaves room for the pointer arrow
      interactive: true,
      className: "poi-description",
    });
    let openId = null;
    map.on("click", () => {
      map.closeTooltip(box);
      openId = null;
    });

    // Opens the box for a POI, or closes it if already open for that POI.
    return function toggle(id, latLng, text) {
      if (openId === id) {
        map.closeTooltip(box);
        openId = null;
        return;
      }
      const content = document.createElement("div");
      content.textContent = text;
      box.setContent(content);
      map.openTooltip(box, latLng);
      // As Leaflet does for popups; otherwise the map sees the click and closes it.
      L.DomEvent.disableClickPropagation(box.getElement());
      openId = id;
    };
  }

  function addPois(map, pois) {
    const toggleDescription = descriptionBox(map);
    for (const poi of pois) {
      const resolved = resolvePoi(poi);
      if (resolved === null) {
        continue;
      }
      const icon = L.icon({
        iconUrl: "icons/" + poi.icon,
        iconSize: [ICON_SIZE, ICON_SIZE],
        iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
        tooltipAnchor: [0, ICON_SIZE / 2], // bottom edge of the icon
        className: "poi-icon",
      });
      const latLng = toLatLng(resolved.location);
      L.marker(latLng, { icon, alt: poi.name })
        .on("click", () => toggleDescription(poi.id, latLng, resolved.description))
        .bindTooltip(poi.name, {
          permanent: true,
          direction: "bottom",
          offset: [0, 2],
          className: "poi-label",
        })
        .addTo(map);
    }
  }

  function fetchFile(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      return response;
    });
  }

  Promise.all([
    fetchFile("map_config.json").then((r) => r.json()),
    fetchFile("points_of_interest.json").then((r) => r.json()),
    fetchFile("visited_hexes.txt").then((r) => r.text()),
  ])
    .then(([config, poiData, visitedText]) => {
      const map = buildMap(config);
      const grid = hexGrid(config.hexes, parseVisited(visitedText));
      addHexToggle(map, grid);
      addAboutMenu(map);
      addPois(map, poiData.pois);
    })
    .catch((err) => showError(`Could not load the map: ${err.message}`));
})();
