import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/employees", label: "Employees" },
  { to: "/departments", label: "Departments" },
  { to: "/attendance", label: "Attendance" },
  { to: "/leaves", label: "Leaves" },
  { to: "/payroll", label: "Payroll" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          HRMS Pro
        </Link>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="muted">Signed in as</p>
            <h3>
              {user?.name} ({user?.role})
            </h3>
          </div>
          <button type="button" className="btn btn-outline" onClick={logout}>
            Logout
          </button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
