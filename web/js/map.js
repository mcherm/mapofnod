// Displays the background map with Leaflet.
//
// Map coordinates are image pixels measured from map.origin (a pixel position
// on the image), with x increasing rightward and y increasing downward. Leaflet's
// CRS.Simple has y increasing upward, so a map coordinate [x, y] becomes the
// LatLng [-y, x].
(function () {
  "use strict";

  const MAX_ZOOM = 2; // 4x native image resolution

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

  fetch("map_config.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(buildMap)
    .catch((err) => showError(`Could not load the map: ${err.message}`));
})();
