import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../utils/services/api";
import { useExpedition } from "../context/ExpeditionContext";
import { useRealtime } from "../context/RealtimeContext";
import Alert from "./Alert";
import ActionFormModal from "./ActionFormModal";
import DataTable from "./DataTable";
import Modal from "./Modal";
import PolarMap from "./PolarMap";
import { getPolarRegion } from "../utils/polarRegion";
import { buildPolarMarkers } from "../utils/mapMarkers";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedId, selectedExpedition } = useExpedition();
  const { revision } = useRealtime();
  const [data, setData] = useState({ items: [], geofences: [] });
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [referenceStations, setReferenceStations] = useState([]);
  const [route, setRoute] = useState(routeDefaults);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editRouteForm, setEditRouteForm] = useState({});
  const [editRouteError, setEditRouteError] = useState("");
  const [editRouteBusy, setEditRouteBusy] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [focusedRoute, setFocusedRoute] = useState(null);
  const [zone, setZone] = useState(zoneDefaults);
  const [error, setError] = useState("");
  const polarRegion = getPolarRegion(selectedExpedition?.region);
  const focusId =
    searchParams.get("kind") === "route" ? searchParams.get("focus") : null;

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
    () =>
      buildPolarMarkers({
        locations,
        telemetry,
        referenceStations,
        polarRegion,
      }),
    [locations, telemetry, referenceStations, polarRegion],
  );

  useEffect(() => {
    if (!focusId || !data.items.length) return;
    const match = data.items.find((item) => String(item.id) === focusId);
    if (match) setFocusedRoute(match);
  }, [focusId, data.items]);

  function closeFocusedRoute() {
    setFocusedRoute(null);
    setSearchParams(
      (current) => {
        current.delete("focus");
        current.delete("kind");
        return current;
      },
      { replace: true },
    );
  }

  function beginRouteUpdate(item) {
    setEditingRoute(item);
    setEditRouteForm({
      name: item.name || "",
      start_lat: String(item.start_lat ?? ""),
      start_lon: String(item.start_lon ?? ""),
      end_lat: String(item.end_lat ?? ""),
      end_lon: String(item.end_lon ?? ""),
      vehicle_id: item.vehicle_id ? String(item.vehicle_id) : "",
      personnel_id: item.personnel_id ? String(item.personnel_id) : "",
      status: item.status || "Planned",
      risk_summary: item.risk_summary || "",
    });
    setEditRouteError("");
  }

  async function submitRouteUpdate(event) {
    event.preventDefault();
    if (!editingRoute) return;

    setEditRouteBusy(true);
    setEditRouteError("");
    try {
      await api.patch("/api/ops/routes/" + editingRoute.id, {
        name: editRouteForm.name,
        start_lat: Number(editRouteForm.start_lat),
        start_lon: Number(editRouteForm.start_lon),
        end_lat: Number(editRouteForm.end_lat),
        end_lon: Number(editRouteForm.end_lon),
        vehicle_id: editRouteForm.vehicle_id
          ? Number(editRouteForm.vehicle_id)
          : null,
        personnel_id: editRouteForm.personnel_id
          ? Number(editRouteForm.personnel_id)
          : null,
        status: editRouteForm.status,
        risk_summary: editRouteForm.risk_summary,
      });
      setEditingRoute(null);
      await refresh();
    } catch (requestError) {
      setEditRouteError(requestError.message);
    } finally {
      setEditRouteBusy(false);
    }
  }

  async function confirmRouteDelete() {
    if (!routeToDelete) return;
    setDeleteBusy(true);
    setError("");
    try {
      await api.delete("/api/ops/routes/" + routeToDelete.id);
      setRouteToDelete(null);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleteBusy(false);
    }
  }

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
            actions={(item) => (
              <div className="inline-actions">
                <button
                  className="button small"
                  onClick={() => beginRouteUpdate(item)}
                >
                  Update
                </button>
                <button
                  className="button small danger"
                  onClick={() => setRouteToDelete(item)}
                >
                  Delete
                </button>
              </div>
            )}
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
      <ActionFormModal
        open={Boolean(editingRoute)}
        title="Update route"
        subtitle={editingRoute?.name || ""}
        fields={[
          { name: "name", label: "Route name", required: true },
          {
            name: "start_lat",
            label: "Start latitude",
            type: "number",
            step: "any",
            required: true,
          },
          {
            name: "start_lon",
            label: "Start longitude",
            type: "number",
            step: "any",
            required: true,
          },
          {
            name: "end_lat",
            label: "Destination latitude",
            type: "number",
            step: "any",
            required: true,
          },
          {
            name: "end_lon",
            label: "Destination longitude",
            type: "number",
            step: "any",
            required: true,
          },
          {
            name: "vehicle_id",
            label: "Vehicle",
            type: "select",
            options: vehicles.map((vehicle) => ({
              value: String(vehicle.id),
              label: vehicle.code + " · " + vehicle.name,
            })),
          },
          {
            name: "personnel_id",
            label: "Team leader",
            type: "select",
            options: personnel.map((person) => ({
              value: String(person.id),
              label: person.name + " · " + person.role,
            })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["Planned", "Active", "Complete", "Cancelled"],
            placeholder: false,
          },
          {
            name: "risk_summary",
            label: "Risk summary",
            type: "textarea",
            wide: true,
          },
        ]}
        form={editRouteForm}
        setForm={setEditRouteForm}
        onClose={() => setEditingRoute(null)}
        onSubmit={submitRouteUpdate}
        submitLabel="Save route"
        busy={editRouteBusy}
        error={editRouteError}
      />

      <Modal
        open={Boolean(routeToDelete)}
        title="Delete route"
        subtitle={routeToDelete?.name || ""}
        onClose={() => {
          if (!deleteBusy) setRouteToDelete(null);
        }}
      >
        <p>
          Delete this saved route? This removes the route record from the
          selected expedition.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="button ghost"
            onClick={() => setRouteToDelete(null)}
            disabled={deleteBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button danger"
            onClick={confirmRouteDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? "Deleting…" : "Delete route"}
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(focusedRoute)}
        title="Route details"
        subtitle={focusedRoute?.name || ""}
        onClose={closeFocusedRoute}
        wide
      >
        <dl className="record-details">
          {Object.entries(focusedRoute || {})
            .filter(
              ([, value]) =>
                value !== null && value !== undefined && value !== "",
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
        </dl>
      </Modal>
    </section>
  );
}
