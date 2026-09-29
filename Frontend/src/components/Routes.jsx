import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/services/api";
import { useExpedition } from "../context/ExpeditionContext";
import { useRealtime } from "../context/RealtimeContext";
import Alert from "./Alert";
import DataTable from "./DataTable";
import PolarMap from "./PolarMap";
import { getPolarRegion } from "../utils/polarRegion";

const routeDefaults = {
  name: "",
  start_lat: "",
  start_lon: "",
  end_lat: "",
  end_lon: "",
  vehicle_id: "",
  personnel_id: "",
  risk_summary: "",
};
const zoneDefaults = {
  name: "",
  kind: "Safe zone",
  center_lat: "",
  center_lon: "",
  radius_m: "1000",
  severity: "Warning",
};

export default function Routes() {
  const { selectedId, selectedExpedition } = useExpedition();
  const { revision } = useRealtime();
  const [data, setData] = useState({ items: [], geofences: [] });
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [referenceStations, setReferenceStations] = useState([]);
  const [route, setRoute] = useState(routeDefaults);
  const [zone, setZone] = useState(zoneDefaults);
  const [error, setError] = useState("");
  const polarRegion = getPolarRegion(selectedExpedition?.region);

  const refresh = useCallback(async () => {
    if (!selectedId) return;
    try {
      const [
        routeData,
        locationData,
        vehicleData,
        personnelData,
        telemetryData,
      ] = await Promise.all([
        api.get("/api/ops/routes?expedition_id=" + selectedId),
        api.get("/api/locations?expedition_id=" + selectedId),
        api.get("/api/vehicles?expedition_id=" + selectedId),
        api.get("/api/personnel?expedition_id=" + selectedId),
        api.get("/api/telemetry/latest?expedition_id=" + selectedId),
      ]);
      setData(routeData);
      setLocations(locationData);
      setVehicles(vehicleData);
      setPersonnel(personnelData);
      setTelemetry(telemetryData);
    } catch (err) {
      setError(err.message);
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  useEffect(() => {
    let cancelled = false;
    const path =
      polarRegion === "north"
        ? "/api/public/arctic-research-stations"
        : "/api/public/facilities";

    api
      .get(path)
      .then((response) => {
        if (cancelled) return;
        const items =
          polarRegion === "north" ? response.items || [] : response || [];
        setReferenceStations(items);
      })
      .catch(() => {
        if (!cancelled) setReferenceStations([]);
      });

    return () => {
      cancelled = true;
    };
  }, [polarRegion]);

  const markers = useMemo(
    () => [
      ...locations.map((item) => {
        const type = String(item.type || "").toLowerCase();
        const category =
          type.includes("station") || type.includes("base")
            ? "base"
            : type.includes("camp")
              ? "camp"
              : type.includes("transport") || type.includes("air")
                ? "support"
                : "mission";

        return {
          ...item,
          kind: item.type || "Mission location",
          markerCategory: category,
          markerDetail: "Selected expedition",
        };
      }),
      ...telemetry.map((item) => ({
        ...item,
        name: item.entity_type + " #" + item.entity_id,
        kind: "Authorized GPS",
        markerCategory: "gps",
        markerDetail: "Latest expedition telemetry",
      })),
      ...referenceStations
        .filter(
          (item) =>
            Number.isFinite(Number(item.latitude)) &&
            Number.isFinite(Number(item.longitude)),
        )
        .map((item) => ({
          ...item,
          kind:
            polarRegion === "north"
              ? "Reference research station"
              : item.facility_type || "Reference facility",
          markerCategory: "research",
          markerDetail:
            polarRegion === "north"
              ? item.operating_country || item.location || "Arctic reference"
              : [item.country, item.seasonality].filter(Boolean).join(" · "),
        })),
    ],
    [locations, telemetry, referenceStations, polarRegion],
  );

  const submitRoute = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/ops/routes", {
        expedition_id: selectedId,
        name: route.name,
        start_lat: Number(route.start_lat),
        start_lon: Number(route.start_lon),
        end_lat: Number(route.end_lat),
        end_lon: Number(route.end_lon),
        vehicle_id: route.vehicle_id ? Number(route.vehicle_id) : null,
        personnel_id: route.personnel_id ? Number(route.personnel_id) : null,
        risk_summary: route.risk_summary,
      });
      setRoute(routeDefaults);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitZone = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/ops/geofences", {
        expedition_id: selectedId,
        name: zone.name,
        kind: zone.kind,
        center_lat: Number(zone.center_lat),
        center_lon: Number(zone.center_lon),
        radius_m: Number(zone.radius_m),
        severity: zone.severity,
      });
      setZone(zoneDefaults);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ROUTE CONTROL</span>
          <h1>Routes & Zones</h1>
          <p>
            Interactive polar routing, fuel/ETA estimation and operational
            geofences.
          </p>
        </div>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="routes-workspace">
        <div className="panel routes-map-panel">
          <div className="panel-title routes-map-heading">
            <div>
              <h2>Operational map</h2>
              <span>
                {markers.length} mapped points · {data.items.length} routes ·{" "}
                {data.geofences.length} zones
              </span>
            </div>
          </div>
          <PolarMap
            region={polarRegion}
            markers={markers}
            routes={data.items}
            geofences={data.geofences}
            viewKey={selectedId}
            square
            legendPlacement="footer"
          />
        </div>
        <div className="routes-control-stack">
          <form className="panel route-form" onSubmit={submitRoute}>
            <div className="panel-title">
              <h2>Plan route</h2>
              <span>Distance, ETA and fuel calculated by backend</span>
            </div>
            <div className="form-grid">
              <label className="wide">
                <span>Route name</span>
                <input
                  required
                  value={route.name}
                  onChange={(e) => setRoute({ ...route, name: e.target.value })}
                />
              </label>
              <label>
                <span>Start latitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={route.start_lat}
                  onChange={(e) =>
                    setRoute({ ...route, start_lat: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Start longitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={route.start_lon}
                  onChange={(e) =>
                    setRoute({ ...route, start_lon: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Destination latitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={route.end_lat}
                  onChange={(e) =>
                    setRoute({ ...route, end_lat: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Destination longitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={route.end_lon}
                  onChange={(e) =>
                    setRoute({ ...route, end_lon: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Vehicle</span>
                <select
                  value={route.vehicle_id}
                  onChange={(e) =>
                    setRoute({ ...route, vehicle_id: e.target.value })
                  }
                >
                  <option value="">No vehicle assigned</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.code} · {vehicle.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Team leader</span>
                <select
                  value={route.personnel_id}
                  onChange={(e) =>
                    setRoute({ ...route, personnel_id: e.target.value })
                  }
                >
                  <option value="">No team leader assigned</option>
                  {personnel.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} · {person.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Risk summary</span>
                <textarea
                  value={route.risk_summary}
                  onChange={(e) =>
                    setRoute({ ...route, risk_summary: e.target.value })
                  }
                />
              </label>
              <button className="button primary wide">Save route</button>
            </div>
          </form>
          <form className="panel route-form" onSubmit={submitZone}>
            <div className="panel-title">
              <h2>Create geofence</h2>
              <span>Safe, restricted, hazard, landing or science zone</span>
            </div>
            <div className="form-grid">
              <label className="wide">
                <span>Zone name</span>
                <input
                  required
                  value={zone.name}
                  onChange={(e) => setZone({ ...zone, name: e.target.value })}
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  value={zone.kind}
                  onChange={(e) => setZone({ ...zone, kind: e.target.value })}
                >
                  <option>Safe zone</option>
                  <option>Restricted zone</option>
                  <option>Hazard zone</option>
                  <option>Landing zone</option>
                  <option>Science zone</option>
                </select>
              </label>
              <label>
                <span>Severity</span>
                <select
                  value={zone.severity}
                  onChange={(e) =>
                    setZone({ ...zone, severity: e.target.value })
                  }
                >
                  <option>Advisory</option>
                  <option>Warning</option>
                  <option>Critical</option>
                </select>
              </label>
              <label>
                <span>Latitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={zone.center_lat}
                  onChange={(e) =>
                    setZone({ ...zone, center_lat: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Longitude</span>
                <input
                  required
                  type="number"
                  step="any"
                  value={zone.center_lon}
                  onChange={(e) =>
                    setZone({ ...zone, center_lon: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                <span>Radius (m)</span>
                <input
                  type="number"
                  value={zone.radius_m}
                  onChange={(e) =>
                    setZone({ ...zone, radius_m: e.target.value })
                  }
                />
              </label>
              <button className="button primary wide">Create zone</button>
            </div>
          </form>
        </div>
      </div>
      <div className="routes-results-grid">
        <div className="panel routes-data-panel">
          <div className="panel-title">
            <h2>Saved routes</h2>
            <span>{data.items.length} total</span>
          </div>
          <DataTable
            rows={data.items}
            columns={[
              { key: "name", label: "Route" },
              { key: "distance_km", label: "Distance km" },
              { key: "eta_minutes", label: "ETA min" },
              { key: "fuel_liters", label: "Fuel L" },
              { key: "vehicle_code", label: "Vehicle" },
              { key: "personnel_name", label: "Team leader" },
              { key: "status", label: "Status", badge: true },
            ]}
          />
        </div>
        <div className="panel routes-data-panel">
          <div className="panel-title">
            <h2>Geofences</h2>
            <span>{data.geofences.length} total</span>
          </div>
          <DataTable
            rows={data.geofences}
            columns={[
              { key: "name", label: "Zone" },
              { key: "kind", label: "Type" },
              { key: "severity", label: "Severity", badge: true },
              { key: "radius_m", label: "Radius m" },
              { key: "active", label: "Active" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
