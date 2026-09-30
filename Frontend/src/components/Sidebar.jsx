import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const items = [
  ["Dashboard", "/dashboard"],
  ["Personnel", "/personnel"],
  ["Cargo", "/cargo"],
  ["Inventory", "/inventory"],
  ["Assets", "/assets"],
  ["Vehicles", "/vehicles"],
  ["Routes & Zones", "/routes"],
  ["Incidents", "/incidents"],
  ["Operations", "/operations"],
  ["Science", "/science"],
  ["Communications", "/communications"],
  ["Readiness", "/readiness"],
  ["Environment", "/environment"],
  ["Polar Network", "/network"],
  ["Activity", "/activity"],
  ["Settings", "/settings"],
];

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={"sidebar" + (open ? " mobile-open" : "")}
      aria-label="Primary navigation"
    >
      <div className="sidebar-mobile-head">
        <span>Navigation</span>
        <button
          type="button"
          className="sidebar-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <Link
        className="brand platform-brand"
        to="/dashboard"
        aria-label="Go to dashboard"
        onClick={onClose}
      >
        <span className="platform-logo-plate">
          <img
            className="platform-logo-mark"
            src="/camperops-favicon.png"
            alt=""
            aria-hidden="true"
          />
          <strong className="platform-logo-word">CamperOps</strong>
        </span>
        <small>EXPEDITION COMMAND</small>
      </Link>

      <nav>
        {items.map(([label, path]) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>


      <div className="sidebar-mobile-account">
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
        <button
          type="button"
          className="button ghost"
          onClick={() => {
            onClose?.();
            logout();
          }}
        >
          Sign out
        </button>
      </div>

      <div className="sidebar-foot">
        <NavLink
        to="/about-us"
        onClick={onClose}
        className={({ isActive }) =>
          isActive
            ? "nav-link sidebar-about-link active"
            : "nav-link sidebar-about-link"
        }
      >
        About Us
        </NavLink>
      </div>
    </aside>
  );
}
