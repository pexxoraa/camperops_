import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MARKER_META = {
  base: { label: "Expedition base / station", short: "B" },
  camp: { label: "Field camp", short: "C" },
  support: { label: "Support / transport", short: "S" },
  gps: { label: "Authorized GPS", short: "G" },
  research: { label: "Reference research station", short: "R" },
  mission: { label: "Other mission point", short: "M" },
};

function markerIcon(category = "mission") {
  const safeCategory = MARKER_META[category] ? category : "mission";
  const meta = MARKER_META[safeCategory];

  return L.divIcon({
    className: "polar-marker-shell",
    html: `<span class="polar-marker polar-marker--${safeCategory}">${meta.short}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function MapViewSync({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
    map.invalidateSize();
  }, [map, center, zoom]);

  return null;
}

export default function PolarMap({
  region = "south",
  markers = [],
  routes = [],
  geofences = [],
  height = 430,
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const validMarkers = useMemo(
    () =>
      markers.filter(
        (item) =>
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude)),
      ),
    [markers],
  );

  const center = useMemo(() => {
    const firstMission =
      validMarkers.find((item) => item.markerCategory !== "research") ||
      validMarkers[0];

    if (firstMission) {
      return [Number(firstMission.latitude), Number(firstMission.longitude)];
    }

    return region === "north" ? [72, 0] : [-75, 0];
  }, [validMarkers, region]);

  const legendCategories = useMemo(
    () =>
      [
        ...new Set(
          validMarkers.map((item) => item.markerCategory || "mission"),
        ),
      ].filter((category) => MARKER_META[category]),
    [validMarkers],
  );

  return (
    <div className="polar-map-block">
      <div
        className={fullscreen ? "polar-map fullscreen" : "polar-map"}
        style={{ height: fullscreen ? undefined : height }}
      >
        <button
          className="map-fullscreen-button"
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
        {legendCategories.length ? (
          <div className="polar-map-legend" aria-label="Map marker legend">
            {legendCategories.map((category) => (
              <span key={category}>
                <i
                  className={"polar-legend-dot polar-legend-dot--" + category}
                />
                {MARKER_META[category].label}
              </span>
            ))}
          </div>
        ) : null}
        <MapContainer
          center={center}
          zoom={3}
          scrollWheelZoom
          attributionControl={false}
          className="leaflet-host"
        >
          <MapViewSync center={center} zoom={3} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {validMarkers.map((item, index) => {
            const category = item.markerCategory || "mission";

            return (
              <Marker
                key={
                  category +
                  "-" +
                  (item.source_key ||
                    item.id ||
                    item.code ||
                    item.name ||
                    index)
                }
                position={[Number(item.latitude), Number(item.longitude)]}
                icon={markerIcon(category)}
                title={item.name || item.title || item.code || "Location"}
              >
                <Popup>
                  <strong>
                    {item.name || item.title || item.code || "Location"}
                  </strong>
                  <br />
                  {item.kind || item.type || item.status || ""}
                  {item.markerDetail ? (
                    <>
                      <br />
                      <small>{item.markerDetail}</small>
                    </>
                  ) : null}
                </Popup>
              </Marker>
            );
          })}
          {routes.map((route, index) => (
            <Polyline
              key={route.id ?? index}
              positions={[
                [Number(route.start_lat), Number(route.start_lon)],
                [Number(route.end_lat), Number(route.end_lon)],
              ]}
            />
          ))}
          {geofences.map((zone, index) => (
            <Circle
              key={zone.id ?? index}
              center={[Number(zone.center_lat), Number(zone.center_lon)]}
              radius={Number(zone.radius_m || 1000)}
            >
              <Popup>
                <strong>{zone.name}</strong>
                <br />
                {zone.kind || zone.zone_type}
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>
      {!fullscreen ? (
        <div className="polar-map-source">
          Map data © OpenStreetMap contributors
        </div>
      ) : null}
    </div>
  );
}
