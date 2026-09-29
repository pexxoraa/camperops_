import ResourcePage from "./ResourcePage";
import api from "../utils/services/api";

export default function Readiness() {
  return (
    <ResourcePage
      title="Expedition Readiness"
      description="Personnel, medical, communications, vehicles, fuel, food, emergency equipment, permits, weather and route readiness."
      endpoint="/api/ops/readiness"
      columns={[
        { key: "category", label: "Category" },
        { key: "label", label: "Checklist item" },
        { key: "status", label: "Status", badge: true },
        { key: "owner", label: "Owner" },
        { key: "due_at", label: "Due" },
        { key: "notes", label: "Notes" },
      ]}
      createFields={[
        {
          name: "category",
          label: "Category",
          type: "select",
          required: true,
          options: [
            "Personnel",
            "Medical",
            "Communications",
            "Vehicles",
            "Fuel",
            "Food",
            "Emergency",
            "Permits",
            "Weather",
            "Route",
          ],
        },
        { name: "label", label: "Checklist item", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Pending", "In Progress", "Complete", "Blocked"],
        },
        { name: "owner", label: "Owner" },
        { name: "due_at", label: "Due", type: "datetime-local" },
        { name: "notes", label: "Notes", type: "textarea", wide: true },
      ]}
      actions={(row, refresh) => (
        <button
          className="button small"
          onClick={async () => {
            const status = row.status === "Complete" ? "Pending" : "Complete";
            await api.patch("/api/ops/readiness/" + row.id, { status });
            refresh();
          }}
        >
          {row.status === "Complete" ? "Reopen" : "Complete"}
        </button>
      )}
    />
  );
}
