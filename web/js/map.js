// Displays the background map and points of interest with Leaflet.
//
// Map coordinates are image pixels measured from map.origin (a pixel position
// on the image), with x increasing rightward and y increasing downward. Leaflet's
// CRS.Simple has y increasing upward, so a map coordinate [x, y] becomes the
// LatLng [-y, x].
(function () {
  "use strict";

  const MAX_ZOOM = 2; // 4x native image resolution
  const ICON_SIZE = 32; // screen pixels, at every zoom level

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

  function addPois(map, pois) {
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
      L.marker(toLatLng(resolved.location), { icon, alt: poi.name })
        .bindTooltip(poi.name, {
          permanent: true,
          direction: "bottom",
          offset: [0, 2],
          className: "poi-label",
        })
        .addTo(map);
    }
  }

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      return response.json();
    });
  }

  Promise.all([fetchJson("map_config.json"), fetchJson("points_of_interest.json")])
    .then(([config, poiData]) => {
      const map = buildMap(config);
      addPois(map, poiData.pois);
    })
    .catch((err) => showError(`Could not load the map: ${err.message}`));
})();
