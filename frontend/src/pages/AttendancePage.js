import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AttendancePage() {
  const { token, user } = useAuth();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    date: "",
    check_in: "09:00:00",
    check_out: "",
    status: "present",
  });

  const loadData = useCallback(async () => {
    try {
      const [attendanceResponse, employeeResponse] = await Promise.all([
        apiRequest("/attendances", {}, token),
        apiRequest("/employees", {}, token),
      ]);
      setItems(attendanceResponse.data || []);
      setEmployees(employeeResponse.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await apiRequest("/attendances", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ employee_id: "", date: "", check_in: "09:00:00", check_out: "", status: "present" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="stack">
      <h2>Attendance</h2>
      {error ? <p className="error">{error}</p> : null}
      {canManage ? (
        <form className="card inline-form" onSubmit={handleSubmit}>
          <select
            value={form.employee_id}
            onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
            required
          >
            <option value="">Employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.user?.name} ({employee.employee_code})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            required
          />
          <input
            value={form.check_in}
            onChange={(e) => setForm((prev) => ({ ...prev, check_in: e.target.value }))}
            placeholder="HH:MM:SS"
          />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="remote">Remote</option>
            <option value="half_day">Half Day</option>
          </select>
          <button className="btn" type="submit">
            Mark Attendance
          </button>
        </form>
      ) : null}
      <article className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.employee?.name}</td>
                <td>{item.date}</td>
                <td>{item.check_in || "-"}</td>
                <td>{item.check_out || "-"}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
