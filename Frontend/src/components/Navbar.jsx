import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useExpedition } from "../context/ExpeditionContext";
import { useRealtime } from "../context/RealtimeContext";
import api from "../utils/services/api";
import { getPolarRegionLabel } from "../utils/polarRegion";

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { expeditions, selectedId, selectedExpedition, selectExpedition } =
    useExpedition();
  const { connected } = useRealtime();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!selectedId || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const data = await api.get(
          "/api/ops/search?expedition_id=" +
            selectedId +
            "&q=" +
            encodeURIComponent(query.trim()),
        );
        setResults(data.items || []);
      } catch {
        setResults([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, selectedId]);

  const pole = getPolarRegionLabel(selectedExpedition?.region);

  return (
    <header className="navbar">
      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Open navigation"
        onClick={onMenuToggle}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className="expedition-picker">
        <label htmlFor="expedition-select">Expedition</label>
        <select
          id="expedition-select"
          value={selectedId || ""}
          onChange={(e) => selectExpedition(e.target.value)}
        >
          {expeditions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="region-pill">{pole}</span>
      </div>

      <div className="global-search">
        <label className="sr-only" htmlFor="global-search-input">
          Search PolarOps
        </label>
        <input
          id="global-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search personnel, cargo, incidents…"
          autoComplete="off"
        />
        {results.length ? (
          <div className="search-results" role="list">
            {results.slice(0, 8).map((item, index) => (
              <div key={item.kind + "-" + (item.id ?? index)} role="listitem">
                <strong>{item.title}</strong>
                <span>
                  {item.kind} · {item.detail || ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="user-tools">
        <span className={connected ? "live-dot connected" : "live-dot"}>
          {connected ? "LIVE" : navigator.onLine ? "HTTP" : "OFFLINE"}
        </span>
        <div className="user-copy">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
        <button className="button ghost signout-button" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
