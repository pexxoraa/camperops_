import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setNavigationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("mobile-navigation-open");

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("mobile-navigation-open");
    };
  }, [navigationOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      {navigationOpen ? (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
        />
      ) : null}
      <div className="app-main">
        <Navbar onMenuToggle={() => setNavigationOpen((value) => !value)} />
        <main id="main-content" className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
