import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError("");
        const data = await apiRequest("/dashboard", {}, token);
        setDashboard(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadDashboard();
  }, [token]);

  const stats = dashboard?.stats || {};
  const cards = [
    ["Departments", stats.departments],
    ["Employees", stats.employees],
    ["Pending Leaves", stats.pending_leaves],
    ["Today Attendance", stats.today_attendance],
    ["Monthly Payroll Total", stats.monthly_payroll_total],
  ];

  return (
    <section className="stack">
      <h2>Dashboard</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid stats-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="card">
            <p className="muted">{label}</p>
            <h3>{value ?? 0}</h3>
          </article>
        ))}
      </div>
      <article className="card">
        <h3>Recent Leave Requests</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.recent_leaves || []).map((leave) => (
              <tr key={leave.id}>
                <td>{leave.employee_name}</td>
                <td>{leave.type}</td>
                <td>{leave.start_date}</td>
                <td>{leave.end_date}</td>
                <td>{leave.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
