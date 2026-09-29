import { useState } from "react";
import api from "../utils/services/api";
import { useExpedition } from "../context/ExpeditionContext";
import Alert from "./Alert";
import CargoQrScanner from "./CargoQrScanner";
import DataTable from "./DataTable";
import Modal from "./Modal";
import ResourcePage from "./ResourcePage";

export default function Cargo() {
  const { selectedId } = useExpedition();
  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState("");
  const [historyCargo, setHistoryCargo] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [custody, setCustody] = useState(null);
  const [custodyForm, setCustodyForm] = useState({});
  const [custodyLocations, setCustodyLocations] = useState([]);
  const [custodyError, setCustodyError] = useState("");
  const [busy, setBusy] = useState(false);

  async function openHistory(row) {
    setHistoryCargo(row);
    setHistoryLoading(true);
    setHistory([]);
    try {
      setHistory(await api.get("/api/cargo/" + row.id + "/events"));
    } finally {
      setHistoryLoading(false);
    }
  }
  async function lookupCargo(value) {
    if (!value?.trim() || !selectedId) return;
    setScanError("");
    try {
      const item = await api.get(
        "/api/cargo/lookup?expedition_id=" +
          selectedId +
          "&value=" +
          encodeURIComponent(value.trim()),
      );
      setScanOpen(false);
      setScanValue("");
      await openHistory(item);
    } catch (error) {
      setScanError(error.message);
    }
  }

  async function openCustody(row, refresh) {
    setCustody({ row, refresh });
    setCustodyError("");
    setCustodyLocations([]);
    setCustodyForm({
      to_custodian: "",
      location_id: row.current_location_id
        ? String(row.current_location_id)
        : "",
      status: row.status || "Registered",
      note: "",
    });

    try {
      const locations = await api.get(
        "/api/locations?expedition_id=" + row.expedition_id,
      );
      setCustodyLocations(locations);
      const currentLocationIsValid = locations.some(
        (item) => Number(item.id) === Number(row.current_location_id),
      );
      if (!currentLocationIsValid) {
        setCustodyForm((current) => ({ ...current, location_id: "" }));
      }
    } catch (error) {
      setCustodyError(error.message);
    }
  }

  async function submitCustody(event) {
    event.preventDefault();
    if (!custody?.row) return;
    setCustodyError("");
    setBusy(true);
    try {
      await api.post("/api/cargo/" + custody.row.id + "/custody", {
        to_custodian: custodyForm.to_custodian,
        location_id: custodyForm.location_id
          ? Number(custodyForm.location_id)
          : undefined,
        status: custodyForm.status || custody.row.status,
        note: custodyForm.note || "",
      });
      const refresh = custody.refresh;
      setCustody(null);
      setCustodyForm({});
      setCustodyLocations([]);
      await refresh?.();
    } catch (error) {
      setCustodyError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function moveCargo(row, refresh) {
    const location = window.prompt("Destination location ID");
    if (!location) return;
    const status =
      window.prompt("New status", row.status || "In Transit") || row.status;
    await api.post("/api/cargo/" + row.id + "/move", {
      location_id: Number(location),
      status,
      note: "Moved from React console",
    });
    refresh();
  }

  async function copyQrValue(row) {
    const value =
      row.qr_value || "POLAROPS:CARGO:" + row.expedition_id + ":" + row.code;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt("Copy this QR value", value);
    }
  }

  const historyColumns = [
    { key: "created_at", label: "Time" },
    { key: "event_type", label: "Event" },
    { key: "from_custodian", label: "From" },
    { key: "to_custodian", label: "To" },
    { key: "location_name", label: "Location" },
    { key: "user_name", label: "Recorded by" },
    { key: "note", label: "Note" },
  ];
  return (
    <>
      <ResourcePage
        title="Cargo"
        description="Track Cargo IDs, QR lookup, custody handoffs, movement state and chain-of-custody history."
        endpoint="/api/cargo"
        headerActions={
          <button className="button" onClick={() => setScanOpen(true)}>
            Scan QR
          </button>
        }
        columns={[
          { key: "code", label: "Cargo ID" },
          { key: "name", label: "Cargo" },
          { key: "priority", label: "Priority", badge: true },
          { key: "status", label: "Status", badge: true },
          { key: "assigned_to", label: "Custodian" },
          { key: "location_name", label: "Location" },
          { key: "quantity", label: "Qty" },
        ]}
        createFields={[
          { name: "code", label: "Cargo ID", required: true },
          { name: "name", label: "Name", required: true },
          { name: "assigned_to", label: "Initial custodian" },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: ["Critical", "High", "Medium", "Low"],
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["Registered", "In Transit", "Delivered", "Held"],
          },
          { name: "quantity", label: "Quantity", type: "number" },
          { name: "unit", label: "Unit" },
        ]}
        actions={(row, refresh) => (
          <div className="inline-actions">
            <button
              className="button small"
              onClick={() => moveCargo(row, refresh)}
            >
              Move
            </button>
            <button
              className="button small"
              onClick={() => openCustody(row, refresh)}
            >
              Custody
            </button>
            <button className="button small" onClick={() => openHistory(row)}>
              History
            </button>
            <button
              className="button small ghost"
              onClick={() => copyQrValue(row)}
            >
              QR value
            </button>
          </div>
        )}
      />

      <Modal
        open={scanOpen}
        title="Scan cargo QR"
        subtitle="Scan a PolarOps cargo QR or enter the Cargo ID manually."
        onClose={() => {
          setScanOpen(false);
          setScanError("");
        }}
      >
        {scanError ? <Alert tone="danger">{scanError}</Alert> : null}
        <CargoQrScanner onValue={lookupCargo} />
        <form
          className="cargo-scan-manual"
          onSubmit={(event) => {
            event.preventDefault();
            lookupCargo(scanValue);
          }}
        >
          <div className="field">
            <label htmlFor="cargo-scan-id">Cargo ID or QR value</label>
            <input
              id="cargo-scan-id"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Example: CG-001"
              autoComplete="off"
            />
          </div>
          <button className="button primary">Find cargo</button>
        </form>
      </Modal>

      <Modal
        open={Boolean(custody)}
        title="Transfer cargo custody"
        subtitle={custody?.row ? "Cargo ID " + custody.row.code : ""}
        onClose={() => {
          setCustody(null);
          setCustodyError("");
          setCustodyLocations([]);
        }}
      >
        {custodyError ? <Alert tone="danger">{custodyError}</Alert> : null}
        <form className="form-grid" onSubmit={submitCustody}>
          <label className="wide">
            <span>New custodian</span>
            <input
              required
              value={custodyForm.to_custodian || ""}
              onChange={(event) =>
                setCustodyForm({
                  ...custodyForm,
                  to_custodian: event.target.value,
                })
              }
            />
          </label>
          <label>
            <span>Location</span>
            <select
              value={custodyForm.location_id || ""}
              onChange={(event) =>
                setCustodyForm({
                  ...custodyForm,
                  location_id: event.target.value,
                })
              }
            >
              <option value="">Keep current location</option>
              {custodyLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={custodyForm.status || "Registered"}
              onChange={(event) =>
                setCustodyForm({ ...custodyForm, status: event.target.value })
              }
            >
              {["Registered", "In Transit", "Delivered", "Held"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label className="wide">
            <span>Handoff note</span>
            <textarea
              value={custodyForm.note || ""}
              onChange={(event) =>
                setCustodyForm({ ...custodyForm, note: event.target.value })
              }
            />
          </label>
          <div className="form-actions wide">
            <button
              type="button"
              className="button ghost"
              onClick={() => setCustody(null)}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Recording…" : "Record handoff"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(historyCargo)}
        wide
        title="Cargo custody history"
        subtitle={
          historyCargo ? historyCargo.code + " · " + historyCargo.name : ""
        }
        onClose={() => setHistoryCargo(null)}
      >
        <div className="cargo-history-summary">
          <div>
            <span>Current custodian</span>
            <strong>{historyCargo?.assigned_to || "Unassigned"}</strong>
          </div>
          <div>
            <span>Current location</span>
            <strong>{historyCargo?.location_name || "Unknown"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{historyCargo?.status || "—"}</strong>
          </div>
        </div>
        {historyLoading ? (
          <div className="loading">Loading custody history…</div>
        ) : (
          <DataTable
            rows={history}
            columns={historyColumns}
            empty="No custody events recorded."
          />
        )}
      </Modal>
    </>
  );
}
