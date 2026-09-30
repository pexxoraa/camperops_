import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/services/api";
import { useExpedition } from "../context/ExpeditionContext";
import { useRealtime } from "../context/RealtimeContext";
import { buildPolarMarkers } from "../utils/mapMarkers";
import { getPolarRegion } from "../utils/polarRegion";
import DataTable from "./DataTable";
import Loading from "./Loading";
import Modal from "./Modal";
import PolarMap from "./PolarMap";
import StatusBadge from "./StatusBadge";

const Metric = ({ label, value, detail }) => (
  <div className="metric-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
);

function getDeviceCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = window.setTimeout(() => resolve(null), 1200);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.clearTimeout(timer);
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 1200 },
    );
  });
}

export default function Dashboard() {
  const { selectedId, selectedExpedition } = useExpedition();
  const { revision, showEmergency } = useRealtime();
  const [data, setData] = useState(null);
  const [sitrep, setSitrep] = useState(null);
  const [locations, setLocations] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [routes, setRoutes] = useState({ items: [], geofences: [] });
  const [referenceStations, setReferenceStations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [operationAlerts, setOperationAlerts] = useState([]);
  const [selectedOperationAlertId, setSelectedOperationAlertId] = useState("");
  const [vehicleAlerts, setVehicleAlerts] = useState([]);
  const [vehicleAlertsOpen, setVehicleAlertsOpen] = useState(false);
  const [vehicleAlertsLoading, setVehicleAlertsLoading] = useState(false);
  const [vehicleAlertsError, setVehicleAlertsError] = useState("");
  const [incidentDetail, setIncidentDetail] = useState(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentError, setIncidentError] = useState("");
  const [operationAlertDetail, setOperationAlertDetail] = useState(null);
  const [operationAlertOpen, setOperationAlertOpen] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [sosError, setSosError] = useState("");

  const polarRegion = getPolarRegion(selectedExpedition?.region);

  useEffect(() => {
    if (!selectedId) return undefined;

    let cancelled = false;

    Promise.all([
      api.get("/api/dashboard?expedition_id=" + selectedId),
      api.get("/api/ops/sitrep?expedition_id=" + selectedId),
    ])
      .then(([dashboard, report]) => {
        if (cancelled) return;
        setData(dashboard);
        setSitrep(report);
      })
      .catch(() => {});

    Promise.allSettled([
      api.get("/api/locations?expedition_id=" + selectedId),
      api.get("/api/telemetry/latest?expedition_id=" + selectedId),
      api.get("/api/ops/routes?expedition_id=" + selectedId),
    ]).then(([locationResult, telemetryResult, routeResult]) => {
      if (cancelled) return;

      setLocations(
        locationResult.status === "fulfilled" ? locationResult.value : [],
      );
      setTelemetry(
        telemetryResult.status === "fulfilled" ? telemetryResult.value : [],
      );
      setRoutes(
        routeResult.status === "fulfilled"
          ? routeResult.value
          : { items: [], geofences: [] },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId, revision]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;

    Promise.all([
      api.get("/api/vehicles?expedition_id=" + selectedId),
      api.get("/api/incidents?expedition_id=" + selectedId),
      api.get("/api/ops/alerts?expedition_id=" + selectedId),
    ])
      .then(([vehicleItems, incidentItems, alertData]) => {
        if (cancelled) return;
        const manualAlerts = (alertData.items || []).filter(
          (alert) => alert.source === "Manual" && !alert.entity_type,
        );
        setVehicles(vehicleItems);
        setIncidents(incidentItems);
        setOperationAlerts(manualAlerts);
        setSelectedVehicleId((current) =>
          vehicleItems.some((vehicle) => String(vehicle.id) === current)
            ? current
            : String(vehicleItems[0]?.id || ""),
        );
        setSelectedIncidentId((current) =>
          incidentItems.some((incident) => String(incident.id) === current)
            ? current
            : String(incidentItems[0]?.id || ""),
        );
        setSelectedOperationAlertId((current) =>
          manualAlerts.some((alert) => String(alert.id) === current)
            ? current
            : String(manualAlerts[0]?.id || ""),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setVehicles([]);
        setIncidents([]);
        setOperationAlerts([]);
        setSelectedVehicleId("");
        setSelectedIncidentId("");
        setSelectedOperationAlertId("");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, revision]);

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
        setReferenceStations(
          polarRegion === "north" ? response.items || [] : response || [],
        );
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

  async function showVehicleAlerts() {
    if (!selectedVehicleId) return;
    setVehicleAlertsOpen(true);
    setVehicleAlertsLoading(true);
    setVehicleAlertsError("");
    try {
      const response = await api.get(
        "/api/vehicles/" + selectedVehicleId + "/alerts",
      );
      setVehicleAlerts(response.items || []);
    } catch (requestError) {
      setVehicleAlertsError(requestError.message);
      setVehicleAlerts([]);
    } finally {
      setVehicleAlertsLoading(false);
    }
  }

  async function showIncident() {
    if (!selectedIncidentId) return;
    setIncidentOpen(true);
    setIncidentLoading(true);
    setIncidentError("");
    setIncidentDetail(null);
    try {
      setIncidentDetail(await api.get("/api/incidents/" + selectedIncidentId));
    } catch (requestError) {
      setIncidentError(requestError.message);
    } finally {
      setIncidentLoading(false);
    }
  }

  function showOperationAlert() {
    const alert = operationAlerts.find(
      (item) => String(item.id) === selectedOperationAlertId,
    );
    if (!alert) return;
    setOperationAlertDetail(alert);
    setOperationAlertOpen(true);
  }

  async function activateSOS() {
    if (!selectedId || sosSending) return;
    setSosSending(true);
    setSosError("");
    try {
      const coordinates = await getDeviceCoordinates();
      const result = await api.post(
        "/api/incidents/sos",
        { expedition_id: selectedId, ...(coordinates || {}) },
        { queue: false },
      );
      const event = result.emergency_event;
      if (event) {
        showEmergency({
          ...event.data,
          event_id: event.event_id,
          expedition_id: event.expedition_id,
          occurred_at: event.occurred_at,
        });
      }
    } catch (requestError) {
      setSosError(
        requestError.message || "Unable to send the emergency alert.",
      );
    } finally {
      setSosSending(false);
    }
  }

  if (!data) return <Loading />;

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMAND OVERVIEW</span>
          <h1>{selectedExpedition?.name || "Dashboard"}</h1>
          <p>
            Personnel, logistics, fuel, incidents, readiness and operational
            risk in one view.
          </p>
        </div>
        <div className="dashboard-heading-actions">
          <StatusBadge value={selectedExpedition?.status} />
          <button
            className="dashboard-sos-button"
            type="button"
            onClick={activateSOS}
            disabled={!selectedId || sosSending}
            aria-label="Send an emergency SOS"
            aria-busy={sosSending}
          >
            SOS
            <span>{sosSending ? "SENDING ALERT…" : "REPORT EMERGENCY"}</span>
          </button>
        </div>
      </div>
      {sosError ? (
        <p className="emergency-send-error" role="alert">
          {sosError}
        </p>
      ) : null}

      <div className="metric-grid">
        <Metric
          label="Personnel"
          value={data.personnel.total}
          detail={
            data.personnel.safe +
            " safe · " +
            data.personnel.attention +
            " attention"
          }
        />
        <Metric
          label="Cargo"
          value={data.cargo.total}
          detail={data.cargo.in_transit + " in transit"}
        />
        <Metric
          label="Inventory warnings"
          value={data.inventory_warnings}
          detail="Below minimum safety level"
        />
        <Metric
          label="Vehicles"
          value={data.vehicles.operational + "/" + data.vehicles.total}
          detail={data.vehicles.average_fuel + "% average fuel"}
        />
        <Metric
          label="Active incidents"
          value={data.active_incidents}
          detail="Open operational incidents"
        />
        <Metric
          label="Readiness"
          value={
            (sitrep?.readiness?.complete || 0) +
            "/" +
            (sitrep?.readiness?.total || 0)
          }
          detail="Checklist complete"
        />
      </div>

      <div className="panel dashboard-alerts-panel">
        <div className="panel-title">
          <div>
            <span className="dashboard-section-kicker">QUICK INSPECTION</span>
            <h2>Alerts & incidents</h2>
          </div>
          <span>
            {vehicles.length} vehicles · {incidents.length} incidents ·{" "}
            {operationAlerts.length} manual alerts
          </span>
        </div>
        <div className="dashboard-alert-controls">
          <div className="dashboard-alert-control">
            <label htmlFor="dashboard-vehicle-select">
              <span>Vehicle</span>
              <select
                id="dashboard-vehicle-select"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.code} · {vehicle.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={!selectedVehicleId}
              onClick={showVehicleAlerts}
            >
              Vehicle alerts
            </button>
          </div>

          <div className="dashboard-alert-control">
            <label htmlFor="dashboard-incident-select">
              <span>Incident</span>
              <select
                id="dashboard-incident-select"
                value={selectedIncidentId}
                onChange={(event) => setSelectedIncidentId(event.target.value)}
              >
                <option value="">Select an incident</option>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.code} · {incident.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={!selectedIncidentId}
              onClick={showIncident}
            >
              Incident details
            </button>
          </div>

          <div className="dashboard-alert-control">
            <label htmlFor="dashboard-operations-alert-select">
              <span>Manual alert</span>
              <select
                id="dashboard-operations-alert-select"
                value={selectedOperationAlertId}
                onChange={(event) =>
                  setSelectedOperationAlertId(event.target.value)
                }
              >
                <option value="">Select an alert</option>
                {operationAlerts.map((alert) => (
                  <option key={alert.id} value={alert.id}>
                    {alert.title} · {alert.status}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={!selectedOperationAlertId}
              onClick={showOperationAlert}
            >
              Alert details
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-command-grid">
        <div className="panel dashboard-map-panel">
          <div className="panel-title dashboard-map-title">
            <div>
              <span className="dashboard-section-kicker">LIVE OPERATIONS</span>
              <h2>Expedition map</h2>
              <span>
                {markers.length} mapped points · {routes.items?.length || 0}{" "}
                routes · {routes.geofences?.length || 0} zones
              </span>
            </div>
            <Link className="button small dashboard-route-link" to="/routes">
              Open route control
            </Link>
          </div>
          <PolarMap
            region={polarRegion}
            markers={markers}
            routes={routes.items || []}
            geofences={routes.geofences || []}
            viewKey={"dashboard-" + selectedId}
            square
            legendPlacement="footer"
          />
        </div>

        <div className="dashboard-command-side">
          <div className="panel dashboard-risk-panel">
            <div className="panel-title">
              <div>
                <span className="dashboard-section-kicker">ATTENTION</span>
                <h2>Operational risks</h2>
              </div>
              <span>{data.operational_risks.length} active</span>
            </div>
            <DataTable
              rows={data.operational_risks}
              columns={[
                { key: "severity", label: "Severity", badge: true },
                { key: "title", label: "Alert" },
                { key: "source", label: "Source" },
                { key: "status", label: "Status", badge: true },
              ]}
            />
          </div>

          <div className="panel dashboard-sitrep-panel">
            <div className="panel-title">
              <div>
                <span className="dashboard-section-kicker">
                  SITUATION REPORT
                </span>
                <h2>Commander SITREP</h2>
              </div>
              <span>
                {sitrep?.generated_at
                  ? new Date(sitrep.generated_at).toLocaleString()
                  : ""}
              </span>
            </div>
            <div className="sitrep-grid">
              <div>
                <strong>{sitrep?.personnel?.deployed || 0}</strong>
                <span>Deployed</span>
              </div>
              <div>
                <strong>{sitrep?.personnel?.overdue || 0}</strong>
                <span>Overdue</span>
              </div>
              <div>
                <strong>{sitrep?.cargo_in_transit || 0}</strong>
                <span>Cargo moving</span>
              </div>
              <div>
                <strong>{sitrep?.active_incidents || 0}</strong>
                <span>Incidents</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>Recent activity</h2>
        </div>
        <DataTable
          rows={data.recent_activity}
          columns={[
            { key: "created_at", label: "Time" },
            { key: "category", label: "Category" },
            { key: "message", label: "Activity" },
            { key: "user_name", label: "User" },
          ]}
        />
      </div>
      <Modal
        open={vehicleAlertsOpen}
        title="Vehicle alerts"
        subtitle={
          vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId)
            ?.code || ""
        }
        onClose={() => setVehicleAlertsOpen(false)}
        wide
      >
        {vehicleAlertsError ? (
          <div className="alert-box danger">{vehicleAlertsError}</div>
        ) : null}
        {vehicleAlertsLoading ? (
          <Loading label="Loading vehicle alert history…" />
        ) : (
          <DataTable
            rows={vehicleAlerts}
            empty="No alerts have been reported for this vehicle."
            columns={[
              { key: "title", label: "Situation" },
              { key: "detail", label: "Cause or details" },
              { key: "severity", label: "Severity", badge: true },
              { key: "status", label: "Status", badge: true },
              { key: "created_at", label: "Reported" },
            ]}
          />
        )}
      </Modal>

      <Modal
        open={incidentOpen}
        title="Incident details"
        subtitle={
          incidentDetail?.code ||
          incidents.find(
            (incident) => String(incident.id) === selectedIncidentId,
          )?.code ||
          ""
        }
        onClose={() => setIncidentOpen(false)}
        wide
      >
        {incidentError ? (
          <div className="alert-box danger">{incidentError}</div>
        ) : null}
        {incidentLoading ? (
          <Loading label="Loading incident details…" />
        ) : incidentDetail ? (
          <>
            <dl className="record-details">
              {[
                ["Title", incidentDetail.title],
                ["Type", incidentDetail.type],
                ["Severity", incidentDetail.severity],
                ["Status", incidentDetail.status],
                ["Location", incidentDetail.location_name],
                ["Description", incidentDetail.description],
                ["Affected people", incidentDetail.affected_count],
                ["Reported", incidentDetail.created_at],
              ]
                .filter(
                  ([, value]) =>
                    value !== null && value !== undefined && value !== "",
                )
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
            </dl>
            <div className="panel-title">
              <h2>Incident timeline</h2>
            </div>
            <DataTable
              rows={incidentDetail.events || []}
              empty="No timeline updates recorded."
              columns={[
                { key: "created_at", label: "Time" },
                { key: "event_type", label: "Event" },
                { key: "note", label: "Details" },
                { key: "user_name", label: "Recorded by" },
              ]}
            />
          </>
        ) : null}
      </Modal>

      <Modal
        open={operationAlertOpen}
        title="Operations alert"
        subtitle={operationAlertDetail?.title || ""}
        onClose={() => setOperationAlertOpen(false)}
      >
        {operationAlertDetail ? (
          <dl className="record-details">
            {[
              ["Title", operationAlertDetail.title],
              ["Severity", operationAlertDetail.severity],
              ["Status", operationAlertDetail.status],
              ["Details", operationAlertDetail.detail],
              ["Assigned to", operationAlertDetail.assigned_to],
              ["Created", operationAlertDetail.created_at],
            ]
              .filter(
                ([, value]) =>
                  value !== null && value !== undefined && value !== "",
              )
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
        ) : null}
      </Modal>
    </section>
  );
}
