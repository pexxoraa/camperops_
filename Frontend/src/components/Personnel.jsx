import { useState } from "react";
import api from "../utils/services/api";
import ActionFormModal from "./ActionFormModal";
import ResourcePage from "./ResourcePage";

const CHECKIN_STATUSES = [
  "Safe",
  "Moving",
  "Deployed",
  "Check-in due",
  "Overdue",
];

export default function Personnel() {
  const [checkin, setCheckin] = useState(null);
  const [form, setForm] = useState({ status: "Safe" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitCheckin(event) {
    event.preventDefault();
    if (!checkin) return;

    setBusy(true);
    setError("");
    try {
      await api.post("/api/personnel/" + checkin.row.id + "/checkin", {
        status: form.status,
      });
      await checkin.refresh();
      setCheckin(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ResourcePage
        title="Personnel"
        description="Roster, team roles, status, check-ins and last known operational position."
        endpoint="/api/personnel"
        columns={[
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
          { key: "team", label: "Team" },
          { key: "status", label: "Status", badge: true },
          { key: "location_name", label: "Location" },
          { key: "last_checkin", label: "Last check-in" },
        ]}
        createFields={[
          { name: "name", label: "Name", required: true },
          {
            name: "role",
            label: "Role",
            type: "select",
            required: true,
            options: [
              "Expedition Lead",
              "Communications",
              "Medical Officer",
              "Scientist",
              "Field Engineer",
              "Geologist",
              "Glaciologist",
              "Logistics Technician",
            ],
          },
          { name: "team", label: "Team" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: CHECKIN_STATUSES,
          },
        ]}
        actions={(row, refresh) => (
          <button
            className="button small"
            onClick={() => {
              setCheckin({ row, refresh });
              setForm({ status: row.status || "Safe" });
              setError("");
            }}
          >
            Check in
          </button>
        )}
      />
      <ActionFormModal
        open={Boolean(checkin)}
        title="Personnel check-in"
        subtitle={checkin?.row?.name || ""}
        fields={[
          {
            name: "status",
            label: "Check-in status",
            type: "select",
            options: CHECKIN_STATUSES,
            placeholder: false,
            required: true,
          },
        ]}
        form={form}
        setForm={setForm}
        onClose={() => setCheckin(null)}
        onSubmit={submitCheckin}
        submitLabel="Record check-in"
        busy={busy}
        error={error}
      />
    </>
  );
}
