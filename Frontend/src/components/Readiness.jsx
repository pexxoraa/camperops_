import { useCallback, useEffect, useMemo, useState } from "react";
import ActionFormModal from "./ActionFormModal";
import Alert from "./Alert";
import DataTable from "./DataTable";
import Loading from "./Loading";
import { useExpedition } from "../context/ExpeditionContext";
import { useRealtime } from "../context/RealtimeContext";
import api from "../utils/services/api";

const CHECKLIST_FIELDS = [
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
  { name: "owner", label: "Owner (team or teammate)" },
  { name: "due_at", label: "Due", type: "datetime-local" },
  { name: "notes", label: "Notes", type: "textarea", wide: true },
];

const PERSON_STATUSES = [
  "Safe",
  "Moving",
  "Deployed",
  "Check-in due",
  "Overdue",
];

const PERSONNEL_ROLES = [
  "Expedition Lead",
  "Communications",
  "Medical Officer",
  "Scientist",
  "Field Engineer",
  "Geologist",
  "Glaciologist",
  "Logistics Technician",
];

const emptyChecklist = {
  category: "",
  label: "",
  status: "Pending",
  owner: "",
  due_at: "",
  notes: "",
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase();

export default function Readiness() {
  const { selectedId } = useExpedition();
  const { revision } = useRealtime();
  const [personnel, setPersonnel] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingForTeam, setCreatingForTeam] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState(emptyChecklist);
  const [editingPerson, setEditingPerson] = useState(null);
  const [personForm, setPersonForm] = useState({});
  const [personBusy, setPersonBusy] = useState(false);
  const [personError, setPersonError] = useState("");

  const refresh = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const [readinessData, personnelData] = await Promise.all([
        api.get("/api/ops/readiness?expedition_id=" + selectedId),
        api.get("/api/personnel?expedition_id=" + selectedId),
      ]);
      setItems(readinessData.items || []);
      setPersonnel(personnelData || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  const teams = useMemo(() => {
    const groups = new Map();

    const getGroup = (name) => {
      const label = String(name || "").trim() || "Unassigned";
      const key = normalize(label) || "unassigned";
      if (!groups.has(key)) {
        groups.set(key, { key, name: label, members: [], items: [] });
      }
      return groups.get(key);
    };

    personnel.forEach((member) => {
      getGroup(member.team).members.push(member);
    });

    items.forEach((item) => {
      const owner = normalize(item.owner);
      const teamMatch = owner ? groups.get(owner) : null;
      const namedPerson = owner
        ? personnel.find((member) => normalize(member.name) === owner)
        : null;
      const roleMatches = owner
        ? personnel.filter((member) => normalize(member.role) === owner)
        : [];
      const prefixMatches =
        owner && roleMatches.length === 0
          ? personnel.filter((member) => normalize(member.role).includes(owner))
          : [];
      const matchingRoles = roleMatches.length ? roleMatches : prefixMatches;
      const roleTeams = new Set(
        matchingRoles.map((member) => normalize(member.team)),
      );
      const assignedPerson =
        namedPerson || (matchingRoles.length === 1 ? matchingRoles[0] : null);
      const matchingTeam =
        teamMatch ||
        (roleTeams.size === 1 && matchingRoles.length
          ? getGroup(matchingRoles[0].team)
          : null);
      const group =
        matchingTeam ||
        (namedPerson ? getGroup(namedPerson.team) : null) ||
        getGroup("Unassigned");

      group.items.push({
        ...item,
        assigned_personnel_id: assignedPerson?.id || null,
      });
    });

    return [...groups.values()].sort((left, right) => {
      if (left.key === "unassigned") return 1;
      if (right.key === "unassigned") return -1;
      return left.name.localeCompare(right.name);
    });
  }, [items, personnel]);

  const teamNames = useMemo(
    () =>
      teams
        .filter((team) => team.key !== "unassigned")
        .map((team) => team.name),
    [teams],
  );

  async function createChecklistItem(event) {
    event.preventDefault();
    setCreateBusy(true);
    setError("");
    try {
      await api.post("/api/ops/readiness", {
        expedition_id: selectedId,
        ...createForm,
      });
      setCreating(false);
      setCreatingForTeam("");
      setCreateForm(emptyChecklist);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function toggleChecklistItem(item) {
    setError("");
    try {
      await api.patch("/api/ops/readiness/" + item.id, {
        status: item.status === "Complete" ? "Pending" : "Complete",
      });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startPersonUpdate(member) {
    setEditingPerson(member);
    setPersonForm({
      name: member.name || "",
      role: member.role || "",
      team: member.team || "",
      status: member.status || "Safe",
    });
    setPersonError("");
  }

  async function updatePerson(event) {
    event.preventDefault();
    if (!editingPerson) return;

    setPersonBusy(true);
    setPersonError("");
    try {
      await api.patch("/api/personnel/" + editingPerson.id, personForm);
      setEditingPerson(null);
      await refresh();
    } catch (requestError) {
      setPersonError(requestError.message);
    } finally {
      setPersonBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXPEDITION MODULE</span>
          <h1>Expedition Readiness</h1>
          <p>
            Team members and their assigned personnel, medical, communications,
            vehicle, fuel, food, emergency, permit, weather and route readiness.
          </p>
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {teams.length ? (
        teams.map((team) => (
          <section className="panel readiness-team" key={team.key}>
            <div className="panel-title">
              <div>
                <h2>
                  {team.name}
                  {team.key === "unassigned" ? "" : " Team"}
                </h2>
                <span>
                  {team.members.length} teammates · {team.items.length}{" "}
                  readiness items
                </span>
              </div>
              <button
                className="button small primary"
                onClick={() => {
                  const owner = team.key === "unassigned" ? "" : team.name;
                  setCreatingForTeam(owner);
                  setCreateForm({ ...emptyChecklist, owner });
                  setCreating(true);
                }}
              >
                + Add Checklist Item
              </button>
            </div>

            {team.members.length ? (
              <>
                <h3>Teammates</h3>
                <DataTable
                  rows={team.members}
                  columns={[
                    { key: "name", label: "Name" },
                    { key: "role", label: "Role" },
                    { key: "status", label: "Personnel status", badge: true },
                    {
                      key: "readiness_work",
                      label: "Readiness work",
                      render: (member) => {
                        const assigned = team.items.filter(
                          (item) => item.assigned_personnel_id === member.id,
                        );
                        return assigned.length
                          ? assigned.map((item) => item.label).join(" · ")
                          : "No individually assigned items";
                      },
                    },
                  ]}
                  actions={(member) => (
                    <button
                      className="button small"
                      onClick={() => startPersonUpdate(member)}
                    >
                      Update
                    </button>
                  )}
                />
              </>
            ) : null}

            <h3>Team readiness work</h3>
            <DataTable
              rows={team.items}
              empty="No readiness work assigned here."
              columns={[
                { key: "category", label: "Category" },
                { key: "label", label: "Checklist item" },
                { key: "status", label: "Status", badge: true },
                { key: "owner", label: "Owner" },
                { key: "due_at", label: "Due" },
                { key: "notes", label: "Notes" },
              ]}
              actions={(item) => (
                <button
                  className="button small"
                  onClick={() => toggleChecklistItem(item)}
                >
                  {item.status === "Complete" ? "Reopen" : "Complete"}
                </button>
              )}
            />
          </section>
        ))
      ) : (
        <div className="panel">
          <DataTable
            rows={[]}
            columns={[]}
            empty="No readiness records found."
          />
        </div>
      )}

      <ActionFormModal
        open={creating}
        title={
          creatingForTeam
            ? "Add checklist item to " + creatingForTeam
            : "Add checklist item"
        }
        fields={CHECKLIST_FIELDS}
        form={createForm}
        setForm={setCreateForm}
        onClose={() => {
          setCreating(false);
          setCreatingForTeam("");
        }}
        onSubmit={createChecklistItem}
        submitLabel="Add item"
        busy={createBusy}
        error={error}
      />

      <ActionFormModal
        open={Boolean(editingPerson)}
        title="Update teammate"
        subtitle={editingPerson?.name || ""}
        fields={[
          { name: "name", label: "Name", required: true },
          {
            name: "role",
            label: "Role",
            type: "select",
            options: [
              ...new Set([...PERSONNEL_ROLES, personForm.role].filter(Boolean)),
            ],
            placeholder: false,
            required: true,
          },
          {
            name: "team",
            label: "Team",
            type: "select",
            options: [
              ...new Set([...teamNames, personForm.team].filter(Boolean)),
            ],
            placeholder: false,
            required: true,
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              ...new Set(
                [...PERSON_STATUSES, personForm.status].filter(Boolean),
              ),
            ],
            placeholder: false,
          },
        ]}
        form={personForm}
        setForm={setPersonForm}
        onClose={() => setEditingPerson(null)}
        onSubmit={updatePerson}
        submitLabel="Save changes"
        busy={personBusy}
        error={personError}
      />
    </section>
  );
}
