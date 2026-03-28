import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LeavesPage() {
  const { token, user } = useAuth();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
    type: "casual",
    reason: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [leaveResponse, employeeResponse] = await Promise.all([
        apiRequest("/leave-requests", {}, token),
        apiRequest("/employees", {}, token),
      ]);
      setItems(leaveResponse.data || []);
      setEmployees(employeeResponse.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function submitLeave(event) {
    event.preventDefault();
    try {
      await apiRequest("/leave-requests", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ employee_id: "", start_date: "", end_date: "", type: "casual", reason: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiRequest(
        `/leave-requests/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token
      );
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h2>Leave Requests</h2>
      {error ? <p className="error">{error}</p> : null}
      <form className="card inline-form" onSubmit={submitLeave}>
        {canManage ? (
          <select
            value={form.employee_id}
            onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
          >
            <option value="">Employee (optional)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.user?.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="date"
          value={form.start_date}
          onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
          required
        />
        <input
          type="date"
          value={form.end_date}
          onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
          required
        />
        <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="earned">Earned</option>
          <option value="unpaid">Unpaid</option>
          <option value="maternity">Maternity</option>
          <option value="paternity">Paternity</option>
        </select>
        <input
          placeholder="Reason"
          value={form.reason}
          onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
        />
        <button className="btn" type="submit">
          Submit Leave
        </button>
      </form>
      <article className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              {canManage ? <th>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.employee?.name || "-"}</td>
                <td>{item.type}</td>
                <td>{item.start_date}</td>
                <td>{item.end_date}</td>
                <td>{item.status}</td>
                {canManage ? (
                  <td className="row-actions">
                    <button
                      className="btn btn-small"
                      type="button"
                      onClick={() => updateStatus(item.id, "approved")}
                      disabled={item.status !== "pending"}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      type="button"
                      onClick={() => updateStatus(item.id, "rejected")}
                      disabled={item.status !== "pending"}
                    >
                      Reject
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
